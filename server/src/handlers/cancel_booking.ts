
import { db } from '../db';
import { bookingsTable } from '../db/schema';
import { type Booking } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function cancelBooking(bookingId: number, userId: number): Promise<Booking> {
  try {
    // First, check if booking exists and belongs to the user
    const existingBooking = await db.select()
      .from(bookingsTable)
      .where(and(
        eq(bookingsTable.id, bookingId),
        eq(bookingsTable.user_id, userId)
      ))
      .execute();

    if (existingBooking.length === 0) {
      throw new Error('Booking not found or does not belong to user');
    }

    const booking = existingBooking[0];

    // Check if booking can be cancelled (only pending or confirmed)
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new Error(`Cannot cancel booking with status: ${booking.status}`);
    }

    // Update booking status to cancelled
    const result = await db.update(bookingsTable)
      .set({
        status: 'cancelled',
        updated_at: new Date()
      })
      .where(eq(bookingsTable.id, bookingId))
      .returning()
      .execute();

    const updatedBooking = result[0];
    
    // Convert numeric fields back to numbers
    return {
      ...updatedBooking,
      total_amount: parseFloat(updatedBooking.total_amount)
    };
  } catch (error) {
    console.error('Booking cancellation failed:', error);
    throw error;
  }
}
