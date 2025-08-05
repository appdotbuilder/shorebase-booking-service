
import { db } from '../db';
import { bookingsTable, usersTable, servicesTable, ratingsTable } from '../db/schema';
import { type BookingWithDetails } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserBookings(userId: number): Promise<BookingWithDetails[]> {
  try {
    const results = await db.select()
      .from(bookingsTable)
      .innerJoin(usersTable, eq(bookingsTable.user_id, usersTable.id))
      .innerJoin(servicesTable, eq(bookingsTable.service_id, servicesTable.id))
      .leftJoin(ratingsTable, eq(bookingsTable.id, ratingsTable.booking_id))
      .where(eq(bookingsTable.user_id, userId))
      .orderBy(desc(bookingsTable.created_at))
      .execute();

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
    console.error('Failed to fetch user bookings:', error);
    throw error;
  }
}
