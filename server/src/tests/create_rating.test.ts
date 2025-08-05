
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable, ratingsTable } from '../db/schema';
import { type CreateRatingInput } from '../schema';
import { createRating } from '../handlers/create_rating';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  role: 'user' as const
};

const testService = {
  name: 'Test Meeting Room',
  type: 'meeting_room' as const,
  subtype: 'standard_room',
  capacity: 10,
  hourly_rate: '25.00',
  description: 'A test meeting room',
  is_active: true
};

const testRatingInput: CreateRatingInput = {
  booking_id: 1,
  user_id: 1,
  rating: 5,
  feedback: 'Excellent service!'
};

describe('createRating', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a rating for completed booking', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const service = await db.insert(servicesTable).values(testService).returning().execute();
    
    const booking = await db.insert(bookingsTable).values({
      user_id: user[0].id,
      service_id: service[0].id,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      status: 'completed',
      total_amount: '50.00',
      notes: 'Test booking'
    }).returning().execute();

    const input: CreateRatingInput = {
      booking_id: booking[0].id,
      user_id: user[0].id,
      rating: 5,
      feedback: 'Excellent service!'
    };

    const result = await createRating(input);

    // Verify rating fields
    expect(result.booking_id).toEqual(booking[0].id);
    expect(result.user_id).toEqual(user[0].id);
    expect(result.rating).toEqual(5);
    expect(result.feedback).toEqual('Excellent service!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save rating to database', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const service = await db.insert(servicesTable).values(testService).returning().execute();
    
    const booking = await db.insert(bookingsTable).values({
      user_id: user[0].id,
      service_id: service[0].id,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      status: 'completed',
      total_amount: '50.00',
      notes: 'Test booking'
    }).returning().execute();

    const input: CreateRatingInput = {
      booking_id: booking[0].id,
      user_id: user[0].id,
      rating: 4,
      feedback: 'Good service'
    };

    const result = await createRating(input);

    // Query database to verify rating was saved
    const ratings = await db.select()
      .from(ratingsTable)
      .where(eq(ratingsTable.id, result.id))
      .execute();

    expect(ratings).toHaveLength(1);
    expect(ratings[0].booking_id).toEqual(booking[0].id);
    expect(ratings[0].user_id).toEqual(user[0].id);
    expect(ratings[0].rating).toEqual(4);
    expect(ratings[0].feedback).toEqual('Good service');
    expect(ratings[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject rating for non-completed booking', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const service = await db.insert(servicesTable).values(testService).returning().execute();
    
    const booking = await db.insert(bookingsTable).values({
      user_id: user[0].id,
      service_id: service[0].id,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      status: 'pending', // Not completed
      total_amount: '50.00',
      notes: 'Test booking'
    }).returning().execute();

    const input: CreateRatingInput = {
      booking_id: booking[0].id,
      user_id: user[0].id,
      rating: 5,
      feedback: 'Excellent service!'
    };

    await expect(createRating(input)).rejects.toThrow(/not completed/i);
  });

  it('should reject rating for non-existent booking', async () => {
    const input: CreateRatingInput = {
      booking_id: 999, // Non-existent booking
      user_id: 1,
      rating: 5,
      feedback: 'Excellent service!'
    };

    await expect(createRating(input)).rejects.toThrow(/not found.*not completed/i);
  });

  it('should reject rating for booking that does not belong to user', async () => {
    // Create prerequisite data
    const user1 = await db.insert(usersTable).values(testUser).returning().execute();
    const user2 = await db.insert(usersTable).values({
      ...testUser,
      username: 'testuser2',
      email: 'test2@example.com'
    }).returning().execute();
    const service = await db.insert(servicesTable).values(testService).returning().execute();
    
    const booking = await db.insert(bookingsTable).values({
      user_id: user1[0].id, // Belongs to user1
      service_id: service[0].id,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      status: 'completed',
      total_amount: '50.00',
      notes: 'Test booking'
    }).returning().execute();

    const input: CreateRatingInput = {
      booking_id: booking[0].id,
      user_id: user2[0].id, // Different user trying to rate
      rating: 5,
      feedback: 'Excellent service!'
    };

    await expect(createRating(input)).rejects.toThrow(/does not belong to user/i);
  });

  it('should reject duplicate rating for same booking', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const service = await db.insert(servicesTable).values(testService).returning().execute();
    
    const booking = await db.insert(bookingsTable).values({
      user_id: user[0].id,
      service_id: service[0].id,
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      status: 'completed',
      total_amount: '50.00',
      notes: 'Test booking'
    }).returning().execute();

    const input: CreateRatingInput = {
      booking_id: booking[0].id,
      user_id: user[0].id,
      rating: 5,
      feedback: 'Excellent service!'
    };

    // Create first rating
    await createRating(input);

    // Try to create second rating for same booking
    await expect(createRating(input)).rejects.toThrow(/already exists/i);
  });
});
