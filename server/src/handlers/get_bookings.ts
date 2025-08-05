
import { db } from '../db';
import { bookingsTable, usersTable, servicesTable, ratingsTable } from '../db/schema';
import { type GetBookingsQuery, type BookingWithDetails } from '../schema';
import { eq, gte, lte, and, desc, type SQL } from 'drizzle-orm';

export async function getBookings(query: GetBookingsQuery): Promise<BookingWithDetails[]> {
  try {
    // Build conditions array first
    const conditions: SQL<unknown>[] = [];

    if (query.user_id !== undefined) {
      conditions.push(eq(bookingsTable.user_id, query.user_id));
    }

    if (query.status !== undefined) {
      conditions.push(eq(bookingsTable.status, query.status));
    }

    if (query.service_type !== undefined) {
      conditions.push(eq(servicesTable.type, query.service_type));
    }

    if (query.start_date !== undefined) {
      conditions.push(gte(bookingsTable.start_time, query.start_date));
    }

    if (query.end_date !== undefined) {
      conditions.push(lte(bookingsTable.start_time, query.end_date));
    }

    // Build the complete query with joins and execute directly
    const baseQuery = db.select()
      .from(bookingsTable)
      .innerJoin(usersTable, eq(bookingsTable.user_id, usersTable.id))
      .innerJoin(servicesTable, eq(bookingsTable.service_id, servicesTable.id))
      .leftJoin(ratingsTable, eq(bookingsTable.id, ratingsTable.booking_id));

    // Apply conditions and execute based on whether we have filters
    let results;
    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      results = await baseQuery
        .where(whereCondition)
        .orderBy(desc(bookingsTable.created_at))
        .limit(query.limit)
        .offset(query.offset)
        .execute();
    } else {
      results = await baseQuery
        .orderBy(desc(bookingsTable.created_at))
        .limit(query.limit)
        .offset(query.offset)
        .execute();
    }

    // Transform joined results to match BookingWithDetails schema
    return results.map(result => ({
      id: result.bookings.id,
      user_id: result.bookings.user_id,
      service_id: result.bookings.service_id,
      start_time: result.bookings.start_time,
      end_time: result.bookings.end_time,
      status: result.bookings.status,
      total_amount: parseFloat(result.bookings.total_amount),
      notes: result.bookings.notes,
      created_at: result.bookings.created_at,
      updated_at: result.bookings.updated_at,
      user: {
        id: result.users.id,
        username: result.users.username,
        email: result.users.email,
        password_hash: result.users.password_hash,
        role: result.users.role,
        created_at: result.users.created_at,
        updated_at: result.users.updated_at
      },
      service: {
        id: result.services.id,
        name: result.services.name,
        type: result.services.type,
        subtype: result.services.subtype,
        capacity: result.services.capacity,
        hourly_rate: parseFloat(result.services.hourly_rate),
        description: result.services.description,
        is_active: result.services.is_active,
        created_at: result.services.created_at
      },
      rating: result.ratings ? {
        id: result.ratings.id,
        booking_id: result.ratings.booking_id,
        user_id: result.ratings.user_id,
        rating: result.ratings.rating,
        feedback: result.ratings.feedback,
        created_at: result.ratings.created_at
      } : null
    }));
  } catch (error) {
    console.error('Get bookings failed:', error);
    throw error;
  }
}
