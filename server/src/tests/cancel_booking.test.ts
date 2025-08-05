
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable } from '../db/schema';
import { cancelBooking } from '../handlers/cancel_booking';
import { eq } from 'drizzle-orm';

describe('cancelBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test setup data
  let testUser: any;
  let testService: any;
  let testBooking: any;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'Conference Room A',
        type: 'meeting_room',
        subtype: 'conference_room',
        capacity: 10,
        hourly_rate: '50.00',
        description: 'Large conference room'
      })
      .returning()
      .execute();
    testService = serviceResult[0];

    // Create test booking in pending status
    const bookingResult = await db.insert(bookingsTable)
      .values({
        user_id: testUser.id,
        service_id: testService.id,
        start_time: new Date('2024-12-20T10:00:00Z'),
        end_time: new Date('2024-12-20T12:00:00Z'),
        status: 'pending',
        total_amount: '100.00',
        notes: 'Test booking'
      })
      .returning()
      .execute();
    testBooking = bookingResult[0];
  });

  it('should cancel a pending booking', async () => {
    const result = await cancelBooking(testBooking.id, testUser.id);

    expect(result.id).toEqual(testBooking.id);
    expect(result.status).toEqual('cancelled');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.service_id).toEqual(testService.id);
    expect(result.total_amount).toEqual(100);
    expect(typeof result.total_amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should cancel a confirmed booking', async () => {
    // Update booking to confirmed status first
    await db.update(bookingsTable)
      .set({ status: 'confirmed' })
      .where(eq(bookingsTable.id, testBooking.id))
      .execute();

    const result = await cancelBooking(testBooking.id, testUser.id);

    expect(result.status).toEqual('cancelled');
    expect(result.id).toEqual(testBooking.id);
  });

  it('should update booking in database', async () => {
    await cancelBooking(testBooking.id, testUser.id);

    const bookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, testBooking.id))
      .execute();

    expect(bookings).toHaveLength(1);
    expect(bookings[0].status).toEqual('cancelled');
    expect(bookings[0].updated_at).toBeInstanceOf(Date);
    expect(bookings[0].updated_at > testBooking.updated_at).toBe(true);
  });

  it('should throw error for non-existent booking', async () => {
    const nonExistentId = 99999;
    
    await expect(cancelBooking(nonExistentId, testUser.id))
      .rejects.toThrow(/booking not found/i);
  });

  it('should throw error when booking belongs to different user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    const otherUser = otherUserResult[0];

    await expect(cancelBooking(testBooking.id, otherUser.id))
      .rejects.toThrow(/booking not found/i);
  });

  it('should throw error for ongoing booking', async () => {
    // Update booking to ongoing status
    await db.update(bookingsTable)
      .set({ status: 'ongoing' })
      .where(eq(bookingsTable.id, testBooking.id))
      .execute();

    await expect(cancelBooking(testBooking.id, testUser.id))
      .rejects.toThrow(/cannot cancel booking with status: ongoing/i);
  });

  it('should throw error for completed booking', async () => {
    // Update booking to completed status
    await db.update(bookingsTable)
      .set({ status: 'completed' })
      .where(eq(bookingsTable.id, testBooking.id))
      .execute();

    await expect(cancelBooking(testBooking.id, testUser.id))
      .rejects.toThrow(/cannot cancel booking with status: completed/i);
  });

  it('should throw error for already cancelled booking', async () => {
    // First cancellation should succeed
    await cancelBooking(testBooking.id, testUser.id);

    // Second cancellation should fail
    await expect(cancelBooking(testBooking.id, testUser.id))
      .rejects.toThrow(/cannot cancel booking with status: cancelled/i);
  });
});
