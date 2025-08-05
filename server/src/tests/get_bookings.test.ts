
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable, ratingsTable } from '../db/schema';
import { type GetBookingsQuery } from '../schema';
import { getBookings } from '../handlers/get_bookings';

// Test data
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

const testBooking = {
  user_id: 1,
  service_id: 1,
  start_time: new Date('2024-01-15T10:00:00Z'),
  end_time: new Date('2024-01-15T12:00:00Z'),
  status: 'confirmed' as const,
  total_amount: '100.00',
  notes: 'Important meeting'
};

const testRating = {
  booking_id: 1,
  user_id: 1,
  rating: 5,
  feedback: 'Excellent service'
};

describe('getBookings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get bookings with all related data', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(servicesTable).values(testService).execute();
    await db.insert(bookingsTable).values(testBooking).execute();
    await db.insert(ratingsTable).values(testRating).execute();

    const query: GetBookingsQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(1);
    const booking = result[0];

    // Verify booking fields
    expect(booking.id).toBe(1);
    expect(booking.user_id).toBe(1);
    expect(booking.service_id).toBe(1);
    expect(booking.start_time).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(booking.end_time).toEqual(new Date('2024-01-15T12:00:00Z'));
    expect(booking.status).toBe('confirmed');
    expect(booking.total_amount).toBe(100);
    expect(booking.notes).toBe('Important meeting');
    expect(booking.created_at).toBeInstanceOf(Date);
    expect(booking.updated_at).toBeInstanceOf(Date);

    // Verify user data
    expect(booking.user.id).toBe(1);
    expect(booking.user.username).toBe('testuser');
    expect(booking.user.email).toBe('test@example.com');
    expect(booking.user.role).toBe('user');

    // Verify service data
    expect(booking.service.id).toBe(1);
    expect(booking.service.name).toBe('Conference Room A');
    expect(booking.service.type).toBe('meeting_room');
    expect(booking.service.subtype).toBe('conference_room');
    expect(booking.service.capacity).toBe(10);
    expect(booking.service.hourly_rate).toBe(50);
    expect(booking.service.is_active).toBe(true);

    // Verify rating data
    expect(booking.rating).not.toBeNull();
    expect(booking.rating!.id).toBe(1);
    expect(booking.rating!.rating).toBe(5);
    expect(booking.rating!.feedback).toBe('Excellent service');
  });

  it('should filter bookings by user_id', async () => {
    // Create users and bookings
    await db.insert(usersTable).values([
      testUser,
      { ...testUser, username: 'user2', email: 'user2@example.com' }
    ]).execute();
    await db.insert(servicesTable).values(testService).execute();
    await db.insert(bookingsTable).values([
      testBooking,
      { ...testBooking, user_id: 2 }
    ]).execute();

    const query: GetBookingsQuery = {
      user_id: 1,
      limit: 50,
      offset: 0
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(1);
    expect(result[0].user.username).toBe('testuser');
  });

  it('should filter bookings by status', async () => {
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(servicesTable).values(testService).execute();
    await db.insert(bookingsTable).values([
      testBooking,
      { ...testBooking, status: 'pending' as const }
    ]).execute();

    const query: GetBookingsQuery = {
      status: 'pending',
      limit: 50,
      offset: 0
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('pending');
  });

  it('should filter bookings by service_type', async () => {
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(servicesTable).values([
      testService,
      { ...testService, name: 'Crane Service', type: 'crane_service' as const, subtype: '110_ton_crane' }
    ]).execute();
    await db.insert(bookingsTable).values([
      testBooking,
      { ...testBooking, service_id: 2 }
    ]).execute();

    const query: GetBookingsQuery = {
      service_type: 'crane_service',
      limit: 50,
      offset: 0
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(1);
    expect(result[0].service.type).toBe('crane_service');
  });

  it('should filter bookings by date range', async () => {
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(servicesTable).values(testService).execute();
    await db.insert(bookingsTable).values([
      testBooking,
      { ...testBooking, start_time: new Date('2024-02-15T10:00:00Z') }
    ]).execute();

    const query: GetBookingsQuery = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      limit: 50,
      offset: 0
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(1);
    expect(result[0].start_time.getMonth()).toBe(0); // January
  });

  it('should handle bookings without ratings', async () => {
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(servicesTable).values(testService).execute();
    await db.insert(bookingsTable).values(testBooking).execute();

    const query: GetBookingsQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toBeNull();
  });

  it('should apply pagination correctly', async () => {
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(servicesTable).values(testService).execute();
    await db.insert(bookingsTable).values([
      testBooking,
      { ...testBooking, notes: 'Second booking' },
      { ...testBooking, notes: 'Third booking' }
    ]).execute();

    const query: GetBookingsQuery = {
      limit: 2,
      offset: 1
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(2);
    // Results should be ordered by created_at desc, so we get the 2nd and 3rd most recent
  });

  it('should handle multiple filters combined', async () => {
    await db.insert(usersTable).values([
      testUser,
      { ...testUser, username: 'user2', email: 'user2@example.com' }
    ]).execute();
    await db.insert(servicesTable).values(testService).execute();
    await db.insert(bookingsTable).values([
      testBooking,
      { ...testBooking, user_id: 2, status: 'pending' as const }
    ]).execute();

    const query: GetBookingsQuery = {
      user_id: 1,
      status: 'confirmed',
      service_type: 'meeting_room',
      limit: 50,
      offset: 0
    };

    const result = await getBookings(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(1);
    expect(result[0].status).toBe('confirmed');
    expect(result[0].service.type).toBe('meeting_room');
  });
});
