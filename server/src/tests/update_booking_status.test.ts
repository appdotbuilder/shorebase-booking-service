
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable } from '../db/schema';
import { type UpdateBookingStatusInput, type CreateUserInput, type CreateServiceInput, type CreateBookingInput } from '../schema';
import { updateBookingStatus } from '../handlers/update_booking_status';
import { eq } from 'drizzle-orm';

describe('updateBookingStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test user
  const createTestUser = async (): Promise<number> => {
    const testUser: CreateUserInput = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    };

    const result = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        role: testUser.role
      })
      .returning()
      .execute();

    return result[0].id;
  };

  // Helper to create test service
  const createTestService = async (): Promise<number> => {
    const testService: CreateServiceInput = {
      name: 'Test Meeting Room',
      type: 'meeting_room',
      subtype: 'standard_room',
      capacity: 10,
      hourly_rate: 50.00,
      description: 'A test meeting room',
      is_active: true
    };

    const result = await db.insert(servicesTable)
      .values({
        name: testService.name,
        type: testService.type,
        subtype: testService.subtype,
        capacity: testService.capacity,
        hourly_rate: testService.hourly_rate.toString(),
        description: testService.description,
        is_active: testService.is_active
      })
      .returning()
      .execute();

    return result[0].id;
  };

  // Helper to create test booking
  const createTestBooking = async (userId: number, serviceId: number, status: string = 'pending'): Promise<number> => {
    const testBooking: CreateBookingInput = {
      user_id: userId,
      service_id: serviceId,
      start_time: new Date('2024-12-25T10:00:00Z'),
      end_time: new Date('2024-12-25T12:00:00Z'),
      notes: 'Test booking'
    };

    const result = await db.insert(bookingsTable)
      .values({
        user_id: testBooking.user_id,
        service_id: testBooking.service_id,
        start_time: testBooking.start_time,
        end_time: testBooking.end_time,
        status: status as any,
        total_amount: '100.00',
        notes: testBooking.notes
      })
      .returning()
      .execute();

    return result[0].id;
  };

  it('should update booking status from pending to confirmed', async () => {
    const userId = await createTestUser();
    const serviceId = await createTestService();
    const bookingId = await createTestBooking(userId, serviceId, 'pending');

    const input: UpdateBookingStatusInput = {
      id: bookingId,
      status: 'confirmed'
    };

    const result = await updateBookingStatus(input);

    expect(result.id).toEqual(bookingId);
    expect(result.status).toEqual('confirmed');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toEqual('number');
  });

  it('should update booking status from confirmed to ongoing', async () => {
    const userId = await createTestUser();
    const serviceId = await createTestService();
    const bookingId = await createTestBooking(userId, serviceId, 'confirmed');

    const input: UpdateBookingStatusInput = {
      id: bookingId,
      status: 'ongoing'
    };

    const result = await updateBookingStatus(input);

    expect(result.status).toEqual('ongoing');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update booking status from ongoing to completed', async () => {
    const userId = await createTestUser();
    const serviceId = await createTestService();
    const bookingId = await createTestBooking(userId, serviceId, 'ongoing');

    const input: UpdateBookingStatusInput = {
      id: bookingId,
      status: 'completed'
    };

    const result = await updateBookingStatus(input);

    expect(result.status).toEqual('completed');
  });

  it('should allow cancelling from any status except completed/cancelled', async () => {
    const userId = await createTestUser();
    const serviceId = await createTestService();
    
    // Test cancelling from pending
    const pendingBookingId = await createTestBooking(userId, serviceId, 'pending');
    const pendingResult = await updateBookingStatus({
      id: pendingBookingId,
      status: 'cancelled'
    });
    expect(pendingResult.status).toEqual('cancelled');

    // Test cancelling from confirmed
    const confirmedBookingId = await createTestBooking(userId, serviceId, 'confirmed');
    const confirmedResult = await updateBookingStatus({
      id: confirmedBookingId,
      status: 'cancelled'
    });
    expect(confirmedResult.status).toEqual('cancelled');

    // Test cancelling from ongoing
    const ongoingBookingId = await createTestBooking(userId, serviceId, 'ongoing');
    const ongoingResult = await updateBookingStatus({
      id: ongoingBookingId,
      status: 'cancelled'
    });
    expect(ongoingResult.status).toEqual('cancelled');
  });

  it('should save updated status to database', async () => {
    const userId = await createTestUser();
    const serviceId = await createTestService();
    const bookingId = await createTestBooking(userId, serviceId, 'pending');

    await updateBookingStatus({
      id: bookingId,
      status: 'confirmed'
    });

    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .execute();

    expect(bookings).toHaveLength(1);
    expect(bookings[0].status).toEqual('confirmed');
    expect(bookings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent booking', async () => {
    const input: UpdateBookingStatusInput = {
      id: 99999,
      status: 'confirmed'
    };

    expect(updateBookingStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error for invalid status transitions', async () => {
    const userId = await createTestUser();
    const serviceId = await createTestService();
    
    // Test invalid transition from completed
    const completedBookingId = await createTestBooking(userId, serviceId, 'completed');
    expect(updateBookingStatus({
      id: completedBookingId,
      status: 'pending'
    })).rejects.toThrow(/invalid status transition/i);

    // Test invalid transition from cancelled  
    const cancelledBookingId = await createTestBooking(userId, serviceId, 'cancelled');
    expect(updateBookingStatus({
      id: cancelledBookingId,
      status: 'confirmed'
    })).rejects.toThrow(/invalid status transition/i);

    // Test invalid transition from pending to ongoing (should go through confirmed)
    const pendingBookingId = await createTestBooking(userId, serviceId, 'pending');
    expect(updateBookingStatus({
      id: pendingBookingId,
      status: 'ongoing'
    })).rejects.toThrow(/invalid status transition/i);
  });
});
