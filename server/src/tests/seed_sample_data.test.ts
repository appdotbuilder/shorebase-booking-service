
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable, ratingsTable } from '../db/schema';
import { seedSampleData } from '../handlers/seed_sample_data';
import { eq, count } from 'drizzle-orm';

describe('seedSampleData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should seed sample data successfully', async () => {
    const result = await seedSampleData();

    expect(result.message).toEqual('Sample data seeded successfully');
  });

  it('should create sample users', async () => {
    await seedSampleData();

    const users = await db.select().from(usersTable).execute();
    
    expect(users).toHaveLength(4);
    
    // Check for specific users
    const johnDoe = users.find(u => u.username === 'john_doe');
    expect(johnDoe).toBeDefined();
    expect(johnDoe?.email).toEqual('john@example.com');
    expect(johnDoe?.role).toEqual('user');

    const opsManager = users.find(u => u.username === 'operations_manager');
    expect(opsManager).toBeDefined();
    expect(opsManager?.role).toEqual('operations');

    // Verify password hashes are set
    users.forEach(user => {
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash.length).toBeGreaterThan(0);
    });
  });

  it('should create sample services of all types', async () => {
    await seedSampleData();

    const services = await db.select().from(servicesTable).execute();
    
    expect(services).toHaveLength(8);

    // Check meeting rooms
    const meetingRooms = services.filter(s => s.type === 'meeting_room');
    expect(meetingRooms).toHaveLength(3);
    
    const conferenceRoom = meetingRooms.find(s => s.subtype === 'conference_room');
    expect(conferenceRoom?.capacity).toEqual(12);
    expect(parseFloat(conferenceRoom?.hourly_rate || '0')).toEqual(50.00);

    // Check crane services
    const craneServices = services.filter(s => s.type === 'crane_service');
    expect(craneServices).toHaveLength(2);
    
    const heavyCrane = craneServices.find(s => s.subtype === '220_ton_crane');
    expect(heavyCrane?.capacity).toEqual(220);
    expect(parseFloat(heavyCrane?.hourly_rate || '0')).toEqual(500.00);

    // Check forklift services
    const forkliftServices = services.filter(s => s.type === 'forklift_service');
    expect(forkliftServices).toHaveLength(3);
    
    const lightForklift = forkliftServices.find(s => s.subtype === '1_ton_forklift');
    expect(lightForklift?.capacity).toEqual(1);
    expect(parseFloat(lightForklift?.hourly_rate || '0')).toEqual(30.00);

    // Verify all services are active by default
    services.forEach(service => {
      expect(service.is_active).toBe(true);
    });
  });

  it('should create sample bookings with various statuses', async () => {
    await seedSampleData();

    const bookings = await db.select().from(bookingsTable).execute();
    
    expect(bookings).toHaveLength(6);

    // Check different statuses
    const statusCounts = {
      completed: bookings.filter(b => b.status === 'completed').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      ongoing: bookings.filter(b => b.status === 'ongoing').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    expect(statusCounts.completed).toEqual(2);
    expect(statusCounts.confirmed).toEqual(1);
    expect(statusCounts.pending).toEqual(1);
    expect(statusCounts.ongoing).toEqual(1);
    expect(statusCounts.cancelled).toEqual(1);

    // Verify amounts are calculated correctly
    bookings.forEach(booking => {
      expect(typeof parseFloat(booking.total_amount)).toBe('number');
      expect(parseFloat(booking.total_amount)).toBeGreaterThan(0);
    });

    // Check specific booking
    const boardMeeting = bookings.find(b => b.notes?.includes('Board meeting'));
    expect(boardMeeting?.status).toEqual('completed');
    expect(parseFloat(boardMeeting?.total_amount || '0')).toEqual(100.00);
  });

  it('should create sample ratings for completed bookings', async () => {
    await seedSampleData();

    const ratings = await db.select().from(ratingsTable).execute();
    
    expect(ratings).toHaveLength(2);

    // Verify rating values
    ratings.forEach(rating => {
      expect(rating.rating).toBeGreaterThanOrEqual(1);
      expect(rating.rating).toBeLessThanOrEqual(5);
      expect(rating.feedback).toBeDefined();
      expect(rating.feedback?.length).toBeGreaterThan(0);
    });

    // Check specific rating
    const excellentRating = ratings.find(r => r.rating === 5);
    expect(excellentRating).toBeDefined();
    expect(excellentRating?.feedback).toContain('Excellent');
  });

  it('should be idempotent - safe to run multiple times', async () => {
    // First run
    const firstResult = await seedSampleData();
    expect(firstResult.message).toEqual('Sample data seeded successfully');

    // Verify data exists
    const usersAfterFirst = await db.select().from(usersTable).execute();
    expect(usersAfterFirst).toHaveLength(4);

    // Second run should skip seeding
    const secondResult = await seedSampleData();
    expect(secondResult.message).toEqual('Sample data already exists, skipping seed');

    // Verify no duplicate data
    const usersAfterSecond = await db.select().from(usersTable).execute();
    expect(usersAfterSecond).toHaveLength(4);

    const servicesAfterSecond = await db.select().from(servicesTable).execute();
    expect(servicesAfterSecond).toHaveLength(8);
  });

  it('should create valid foreign key relationships', async () => {
    await seedSampleData();

    // Get sample data
    const users = await db.select().from(usersTable).execute();
    const services = await db.select().from(servicesTable).execute();
    const bookings = await db.select().from(bookingsTable).execute();
    const ratings = await db.select().from(ratingsTable).execute();

    // Verify all booking user_ids exist in users table
    const userIds = new Set(users.map(u => u.id));
    bookings.forEach(booking => {
      expect(userIds.has(booking.user_id)).toBe(true);
    });

    // Verify all booking service_ids exist in services table
    const serviceIds = new Set(services.map(s => s.id));
    bookings.forEach(booking => {
      expect(serviceIds.has(booking.service_id)).toBe(true);
    });

    // Verify all rating booking_ids and user_ids exist
    const bookingIds = new Set(bookings.map(b => b.id));
    ratings.forEach(rating => {
      expect(bookingIds.has(rating.booking_id)).toBe(true);
      expect(userIds.has(rating.user_id)).toBe(true);
    });
  });

  it('should handle time-based bookings correctly', async () => {
    await seedSampleData();

    const bookings = await db.select().from(bookingsTable).execute();
    
    // Verify all bookings have valid time ranges
    bookings.forEach(booking => {
      expect(booking.start_time).toBeInstanceOf(Date);
      expect(booking.end_time).toBeInstanceOf(Date);
      expect(booking.end_time > booking.start_time).toBe(true);
    });

    // Check for ongoing booking (should have started in past, ends in future)
    const ongoingBooking = bookings.find(b => b.status === 'ongoing');
    expect(ongoingBooking).toBeDefined();
    
    if (ongoingBooking) {
      const now = new Date();
      expect(ongoingBooking.start_time < now).toBe(true);
      expect(ongoingBooking.end_time > now).toBe(true);
    }
  });
});
