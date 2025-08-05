
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable } from '../db/schema';
import { type CreateBookingInput } from '../schema';
import { createBooking } from '../handlers/create_booking';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  role: 'user' as const
};

const testService = {
  name: 'Conference Room A',
  type: 'meeting_room' as const,
  subtype: 'conference_room',
  capacity: 10,
  hourly_rate: '50.00',
  description: 'Large conference room',
  is_active: true
};

describe('createBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let serviceId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();
    serviceId = serviceResult[0].id;
  });

  it('should create a booking successfully', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(12, 0, 0, 0);

    const input: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: tomorrow,
      end_time: endTime,
      notes: 'Team meeting'
    };

    const result = await createBooking(input);

    expect(result.user_id).toEqual(userId);
    expect(result.service_id).toEqual(serviceId);
    expect(result.start_time).toEqual(tomorrow);
    expect(result.end_time).toEqual(endTime);
    expect(result.status).toEqual('pending');
    expect(result.total_amount).toEqual(100); // 2 hours * $50/hour
    expect(result.notes).toEqual('Team meeting');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save booking to database', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(15, 30, 0, 0);

    const input: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: tomorrow,
      end_time: endTime,
      notes: null
    };

    const result = await createBooking(input);

    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, result.id))
      .execute();

    expect(bookings).toHaveLength(1);
    expect(bookings[0].user_id).toEqual(userId);
    expect(bookings[0].service_id).toEqual(serviceId);
    expect(parseFloat(bookings[0].total_amount)).toEqual(75); // 1.5 hours * $50/hour
    expect(bookings[0].status).toEqual('pending');
  });

  it('should reject booking with start time in the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 1);

    const input: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: yesterday,
      end_time: endTime,
      notes: null
    };

    await expect(createBooking(input)).rejects.toThrow(/start time must be in the future/i);
  });

  it('should reject booking with start time after end time', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startTime = new Date(tomorrow);
    startTime.setHours(15, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(10, 0, 0, 0);

    const input: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: startTime,
      end_time: endTime,
      notes: null
    };

    await expect(createBooking(input)).rejects.toThrow(/start time must be before end time/i);
  });

  it('should reject booking for inactive service', async () => {
    // Create inactive service
    const inactiveService = await db.insert(servicesTable)
      .values({
        ...testService,
        name: 'Inactive Room',
        is_active: false
      })
      .returning()
      .execute();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(12, 0, 0, 0);

    const input: CreateBookingInput = {
      user_id: userId,
      service_id: inactiveService[0].id,
      start_time: tomorrow,
      end_time: endTime,
      notes: null
    };

    await expect(createBooking(input)).rejects.toThrow(/service not found or inactive/i);
  });

  it('should reject booking with time conflict', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(12, 0, 0, 0);

    // Create first booking
    const firstInput: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: tomorrow,
      end_time: endTime,
      notes: null
    };
    await createBooking(firstInput);

    // Try to create overlapping booking
    const overlappingStart = new Date(tomorrow);
    overlappingStart.setHours(11, 0, 0, 0);
    
    const overlappingEnd = new Date(tomorrow);
    overlappingEnd.setHours(13, 0, 0, 0);

    const conflictInput: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: overlappingStart,
      end_time: overlappingEnd,
      notes: null
    };

    await expect(createBooking(conflictInput)).rejects.toThrow(/service is not available/i);
  });

  it('should calculate total amount correctly for partial hours', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(10, 30, 0, 0); // 30 minutes

    const input: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: tomorrow,
      end_time: endTime,
      notes: null
    };

    const result = await createBooking(input);

    expect(result.total_amount).toEqual(25); // 0.5 hours * $50/hour
  });
});
