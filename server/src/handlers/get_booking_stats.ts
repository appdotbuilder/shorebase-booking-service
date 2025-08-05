
import { db } from '../db';
import { bookingsTable } from '../db/schema';
import { type BookingStatsQuery, type BookingStats } from '../schema';
import { gte, lte, and, type SQL } from 'drizzle-orm';

export async function getBookingStats(query: BookingStatsQuery): Promise<BookingStats> {
  try {
    // Build conditions array first
    const conditions: SQL<unknown>[] = [];
    if (query.start_date) {
      conditions.push(gte(bookingsTable.created_at, query.start_date));
    }
    if (query.end_date) {
      conditions.push(lte(bookingsTable.created_at, query.end_date));
    }

    // Build query with or without conditions
    const bookings = conditions.length > 0
      ? await db.select({
          status: bookingsTable.status,
          total_amount: bookingsTable.total_amount,
          created_at: bookingsTable.created_at
        })
        .from(bookingsTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute()
      : await db.select({
          status: bookingsTable.status,
          total_amount: bookingsTable.total_amount,
          created_at: bookingsTable.created_at
        })
        .from(bookingsTable)
        .execute();

    // Initialize counters
    let total_bookings = 0;
    let pending = 0;
    let confirmed = 0;
    let ongoing = 0;
    let completed = 0;
    let cancelled = 0;
    let total_revenue = 0;

    // Aggregate the data
    for (const booking of bookings) {
      total_bookings++;
      
      // Count by status
      switch (booking.status) {
        case 'pending':
          pending++;
          break;
        case 'confirmed':
          confirmed++;
          break;
        case 'ongoing':
          ongoing++;
          break;
        case 'completed':
          completed++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }

      // Add to total revenue (convert numeric string to number)
      total_revenue += parseFloat(booking.total_amount);
    }

    return {
      total_bookings,
      pending,
      confirmed,
      ongoing,
      completed,
      cancelled,
      total_revenue
    };
  } catch (error) {
    console.error('Failed to get booking stats:', error);
    throw error;
  }
}
