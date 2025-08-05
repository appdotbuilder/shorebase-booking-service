
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable } from '../db/schema';
import { type BookingStatsQuery } from '../schema';
import { getBookingStats } from '../handlers/get_booking_stats';

describe('getBookingStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats when no bookings exist', async () => {
    const query: BookingStatsQuery = {};
    const result = await getBookingStats(query);

    expect(result.total_bookings).toEqual(0);
    expect(result.pending).toEqual(0);
    expect(result.confirmed).toEqual(0);
    expect(result.ongoing).toEqual(0);
    expect(result.completed).toEqual(0);
    expect(result.cancelled).toEqual(0);
    expect(result.total_revenue).toEqual(0);
  });

  it('should calculate stats correctly with multiple bookings', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    // Create test service
    const [service] = await db.insert(servicesTable)
      .values({
        name: 'Test Meeting Room',
        type: 'meeting_room',
        subtype: 'standard_room',
        capacity: 10,
        hourly_rate: '50.00',
        description: 'Test room',
        is_active: true
      })
      .returning()
      .execute();

    // Create bookings with different statuses
    await db.insert(bookingsTable)
      .values([
        {
          user_id: user.id,
          service_id: service.id,
          start_time: new Date('2023-12-01T10:00:00Z'),
          end_time: new Date('2023-12-01T12:00:00Z'),
          status: 'pending',
          total_amount: '100.00',
          notes: null
        },
        {
          user_id: user.id,
          service_id: service.id,
          start_time: new Date('2023-12-02T10:00:00Z'),
          end_time: new Date('2023-12-02T12:00:00Z'),
          status: 'confirmed',
          total_amount: '150.50',
          notes: null
        },
        {
          user_id: user.id,
          service_id: service.id,
          start_time: new Date('2023-12-03T10:00:00Z'),
          end_time: new Date('2023-12-03T12:00:00Z'),
          status: 'completed',
          total_amount: '200.25',
          notes: null
        },
        {
          user_id: user.id,
          service_id: service.id,
          start_time: new Date('2023-12-04T10:00:00Z'),
          end_time: new Date('2023-12-04T12:00:00Z'),
          status: 'cancelled',
          total_amount: '75.00',
          notes: null
        }
      ])
      .execute();

    const query: BookingStatsQuery = {};
    const result = await getBookingStats(query);

    expect(result.total_bookings).toEqual(4);
    expect(result.pending).toEqual(1);
    expect(result.confirmed).toEqual(1);
    expect(result.ongoing).toEqual(0);
    expect(result.completed).toEqual(1);
    expect(result.cancelled).toEqual(1);
    expect(result.total_revenue).toEqual(525.75); // 100 + 150.50 + 200.25 + 75
  });

  it('should filter bookings by start date', async () => {
    // Create test user and service
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const [service] = await db.insert(servicesTable)
      .values({
        name: 'Test Meeting Room',
        type: 'meeting_room',
        subtype: 'standard_room',
        capacity: 10,
        hourly_rate: '50.00',
        description: 'Test room',
        is_active: true
      })
      .returning()
      .execute();

    // Create bookings with different created_at dates
    const oldDate = new Date('2023-11-01T10:00:00Z');
    const newDate = new Date('2023-12-01T10:00:00Z');
    
    await db.insert(bookingsTable)
      .values([
        {
          user_id: user.id,
          service_id: service.id,
          start_time: oldDate,
          end_time: oldDate,
          status: 'completed',
          total_amount: '100.00',
          notes: null,
          created_at: oldDate
        },
        {
          user_id: user.id,
          service_id: service.id,
          start_time: newDate,
          end_time: newDate,
          status: 'completed',
          total_amount: '200.00',
          notes: null,
          created_at: newDate
        }
      ])
      .execute();

    // Query with start_date filter
    const query: BookingStatsQuery = {
      start_date: new Date('2023-12-01T00:00:00Z')
    };
    const result = await getBookingStats(query);

    expect(result.total_bookings).toEqual(1);
    expect(result.completed).toEqual(1);
    expect(result.total_revenue).toEqual(200);
  });

  it('should filter bookings by date range', async () => {
    // Create test user and service
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const [service] = await db.insert(servicesTable)
      .values({
        name: 'Test Meeting Room',
        type: 'meeting_room',
        subtype: 'standard_room',
        capacity: 10,
        hourly_rate: '50.00',
        description: 'Test room',
        is_active: true
      })
      .returning()
      .execute();

    // Create bookings across different months
    const novemberDate = new Date('2023-11-15T10:00:00Z');
    const decemberDate = new Date('2023-12-15T10:00:00Z');
    const januaryDate = new Date('2024-01-15T10:00:00Z');
    
    await db.insert(bookingsTable)
      .values([
        {
          user_id: user.id,
          service_id: service.id,
          start_time: novemberDate,
          end_time: novemberDate,
          status: 'completed',
          total_amount: '100.00',
          notes: null,
          created_at: novemberDate
        },
        {
          user_id: user.id,
          service_id: service.id,
          start_time: decemberDate,
          end_time: decemberDate,
          status: 'pending',
          total_amount: '200.00',
          notes: null,
          created_at: decemberDate
        },
        {
          user_id: user.id,
          service_id: service.id,
          start_time: januaryDate,
          end_time: januaryDate,
          status: 'confirmed',
          total_amount: '300.00',
          notes: null,
          created_at: januaryDate
        }
      ])
      .execute();

    // Query for December only
    const query: BookingStatsQuery = {
      start_date: new Date('2023-12-01T00:00:00Z'),
      end_date: new Date('2023-12-31T23:59:59Z')
    };
    const result = await getBookingStats(query);

    expect(result.total_bookings).toEqual(1);
    expect(result.pending).toEqual(1);
    expect(result.confirmed).toEqual(0);
    expect(result.completed).toEqual(0);
    expect(result.total_revenue).toEqual(200);
  });
});
