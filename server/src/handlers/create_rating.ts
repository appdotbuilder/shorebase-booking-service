
import { db } from '../db';
import { ratingsTable, bookingsTable } from '../db/schema';
import { type CreateRatingInput, type Rating } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createRating(input: CreateRatingInput): Promise<Rating> {
  try {
    // Verify booking exists, belongs to user, and is completed
    const booking = await db.select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.id, input.booking_id),
          eq(bookingsTable.user_id, input.user_id),
          eq(bookingsTable.status, 'completed')
        )
      )
      .execute();

    if (booking.length === 0) {
      throw new Error('Booking not found, does not belong to user, or is not completed');
    }

    // Check if rating already exists for this booking
    const existingRating = await db.select()
      .from(ratingsTable)
      .where(eq(ratingsTable.booking_id, input.booking_id))
      .execute();

    if (existingRating.length > 0) {
      throw new Error('Rating already exists for this booking');
    }

    // Create the rating
    const result = await db.insert(ratingsTable)
      .values({
        booking_id: input.booking_id,
        user_id: input.user_id,
        rating: input.rating,
        feedback: input.feedback
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Rating creation failed:', error);
    throw error;
  }
}
