
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable, ratingsTable } from '../db/schema';
import { getUserBookings } from '../handlers/get_user_bookings';
import { eq } from 'drizzle-orm';

describe('getUserBookings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all bookings for a user with related data', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test service
    const [service] = await db.insert(servicesTable)
      .values({
        name: 'Conference Room A',
        type: 'meeting_room',
        subtype: 'conference_room',
        capacity: 20,
        hourly_rate: '50.00',
        description: 'Large conference room',
        is_active: true
      })
      .returning()
      .execute();

    // Create test booking
    const startTime = new Date('2024-01-15T10:00:00Z');
    const endTime = new Date('2024-01-15T12:00:00Z');
    
    const [booking] = await db.insert(bookingsTable)
      .values({
        user_id: user.id,
        service_id: service.id,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        total_amount: '100.00',
        notes: 'Important meeting'
      })
      .returning()
      .execute();

    // Create test rating
    await db.insert(ratingsTable)
      .values({
        booking_id: booking.id,
        user_id: user.id,
        rating: 5,
        feedback: 'Excellent service'
      })
      .execute();

    const result = await getUserBookings(user.id);

    expect(result).toHaveLength(1);
    const bookingResult = result[0];

    // Verify booking data
    expect(bookingResult.id).toEqual(booking.id);
    expect(bookingResult.user_id).toEqual(user.id);
    expect(bookingResult.service_id).toEqual(service.id);
    expect(bookingResult.start_time).toEqual(startTime);
    expect(bookingResult.end_time).toEqual(endTime);
    expect(bookingResult.status).toEqual('confirmed');
    expect(bookingResult.total_amount).toEqual(100.00);
    expect(bookingResult.notes).toEqual('Important meeting');

    // Verify user data
    expect(bookingResult.user.id).toEqual(user.id);
    expect(bookingResult.user.username).toEqual('testuser');
    expect(bookingResult.user.email).toEqual('test@example.com');
    expect(bookingResult.user.role).toEqual('user');

    // Verify service data
    expect(bookingResult.service.id).toEqual(service.id);
    expect(bookingResult.service.name).toEqual('Conference Room A');
    expect(bookingResult.service.type).toEqual('meeting_room');
    expect(bookingResult.service.subtype).toEqual('conference_room');
    expect(bookingResult.service.capacity).toEqual(20);
    expect(bookingResult.service.hourly_rate).toEqual(50.00);
    expect(bookingResult.service.description).toEqual('Large conference room');
    expect(bookingResult.service.is_active).toBe(true);

    // Verify rating data
    expect(bookingResult.rating).not.toBeNull();
    expect(bookingResult.rating!.booking_id).toEqual(booking.id);
    expect(bookingResult.rating!.user_id).toEqual(user.id);
    expect(bookingResult.rating!.rating).toEqual(5);
    expect(bookingResult.rating!.feedback).toEqual('Excellent service');
  });

  it('should return bookings without ratings when no rating exists', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashed_password',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test service
    const [service] = await db.insert(servicesTable)
      .values({
        name: '5 Ton Forklift',
        type: 'forklift_service',
        subtype: '5_ton_forklift',
        capacity: 5,
        hourly_rate: '75.00',
        description: 'Heavy duty forklift',
        is_active: true
      })
      .returning()
      .execute();

    // Create booking without rating
    await db.insert(bookingsTable)
      .values({
        user_id: user.id,
        service_id: service.id,
        start_time: new Date('2024-01-16T09:00:00Z'),
        end_time: new Date('2024-01-16T11:00:00Z'),
        status: 'pending',
        total_amount: '150.00',
        notes: null
      })
      .execute();

    const result = await getUserBookings(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toBeNull();
    expect(result[0].service.type).toEqual('forklift_service');
    expect(result[0].status).toEqual('pending');
    expect(result[0].total_amount).toEqual(150.00);
  });

  it('should return multiple bookings ordered by created_at desc', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser3',
        email: 'test3@example.com',
        password_hash: 'hashed_password',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test service
    const [service] = await db.insert(servicesTable)
      .values({
        name: '110 Ton Crane',
        type: 'crane_service',
        subtype: '110_ton_crane',
        capacity: 110,
        hourly_rate: '200.00',
        description: 'Heavy lifting crane',
        is_active: true
      })
      .returning()
      .execute();

    // Create first booking
    const [booking1] = await db.insert(bookingsTable)
      .values({
        user_id: user.id,
        service_id: service.id,
        start_time: new Date('2024-01-10T08:00:00Z'),
        end_time: new Date('2024-01-10T10:00:00Z'),
        status: 'completed',
        total_amount: '400.00',
        notes: 'First booking'
      })
      .returning()
      .execute();

    // Add a small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second booking
    const [booking2] = await db.insert(bookingsTable)
      .values({
        user_id: user.id,
        service_id: service.id,
        start_time: new Date('2024-01-12T14:00:00Z'),
        end_time: new Date('2024-01-12T16:00:00Z'),
        status: 'ongoing',
        total_amount: '400.00',
        notes: 'Second booking'
      })
      .returning()
      .execute();

    const result = await getUserBookings(user.id);

    expect(result).toHaveLength(2);
    
    // Verify ordering by created_at desc (newer first)
    // The second booking should be first in the results
    expect(result[0].id).toEqual(booking2.id);
    expect(result[1].id).toEqual(booking1.id);
    expect(result[0].notes).toEqual('Second booking');
    expect(result[1].notes).toEqual('First booking');
  });

  it('should return empty array for user with no bookings', async () => {
    // Create user but no bookings
    const [user] = await db.insert(usersTable)
      .values({
        username: 'emptyuser',
        email: 'empty@example.com',
        password_hash: 'hashed_password',
        role: 'user'
      })
      .returning()
      .execute();

    const result = await getUserBookings(user.id);

    expect(result).toHaveLength(0);
  });

  it('should only return bookings for the specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        role: 'user'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test service
    const [service] = await db.insert(servicesTable)
      .values({
        name: 'Standard Room',
        type: 'meeting_room',
        subtype: 'standard_room',
        capacity: 10,
        hourly_rate: '30.00',
        description: 'Basic meeting room',
        is_active: true
      })
      .returning()
      .execute();

    // Create bookings for both users
    await db.insert(bookingsTable)
      .values([
        {
          user_id: user1.id,
          service_id: service.id,
          start_time: new Date('2024-01-15T10:00:00Z'),
          end_time: new Date('2024-01-15T11:00:00Z'),
          status: 'confirmed',
          total_amount: '30.00',
          notes: 'User 1 booking'
        },
        {
          user_id: user2.id,
          service_id: service.id,
          start_time: new Date('2024-01-15T12:00:00Z'),
          end_time: new Date('2024-01-15T13:00:00Z'),
          status: 'confirmed',
          total_amount: '30.00',
          notes: 'User 2 booking'
        }
      ])
      .execute();

    const result = await getUserBookings(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].notes).toEqual('User 1 booking');
  });
});
