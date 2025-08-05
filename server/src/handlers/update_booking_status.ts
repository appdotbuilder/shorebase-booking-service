
import { db } from '../db';
import { bookingsTable } from '../db/schema';
import { type UpdateBookingStatusInput, type Booking } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateBookingStatus(input: UpdateBookingStatusInput): Promise<Booking> {
  try {
    // Validate status transitions
    const existingBooking = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, input.id))
      .execute();

    if (existingBooking.length === 0) {
      throw new Error(`Booking with id ${input.id} not found`);
    }

    const currentStatus = existingBooking[0].status;
    
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['ongoing', 'cancelled'],
      'ongoing': ['completed', 'cancelled'],
      'completed': [], // No transitions from completed
      'cancelled': [] // No transitions from cancelled
    };

    if (!validTransitions[currentStatus]?.includes(input.status)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${input.status}`);
    }

    // Update the booking status and updated_at timestamp
    const result = await db.update(bookingsTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(bookingsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const booking = result[0];
    return {
      ...booking,
      total_amount: parseFloat(booking.total_amount)
    };
  } catch (error) {
    console.error('Booking status update failed:', error);
    throw error;
  }
}
