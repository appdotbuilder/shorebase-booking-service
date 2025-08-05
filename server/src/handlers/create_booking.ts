
import { db } from '../db';
import { bookingsTable, servicesTable } from '../db/schema';
import { type CreateBookingInput, type Booking } from '../schema';
import { eq, and, or, lt, gt } from 'drizzle-orm';

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  try {
    // Validate time constraints
    if (input.start_time >= input.end_time) {
      throw new Error('Start time must be before end time');
    }

    if (input.start_time <= new Date()) {
      throw new Error('Start time must be in the future');
    }

    // Verify service exists and is active
    const services = await db.select()
      .from(servicesTable)
      .where(and(
        eq(servicesTable.id, input.service_id),
        eq(servicesTable.is_active, true)
      ))
      .execute();

    if (services.length === 0) {
      throw new Error('Service not found or inactive');
    }

    const service = services[0];

    // Check for availability conflicts - overlapping bookings
    const conflictingBookings = await db.select()
      .from(bookingsTable)
      .where(and(
        eq(bookingsTable.service_id, input.service_id),
        or(
          // New booking starts during existing booking
          and(
            lt(bookingsTable.start_time, input.end_time),
            gt(bookingsTable.end_time, input.start_time)
          )
        )
      ))
      .execute();

    if (conflictingBookings.length > 0) {
      throw new Error('Service is not available during the requested time period');
    }

    // Calculate total amount based on hourly rate and duration
    const durationHours = (input.end_time.getTime() - input.start_time.getTime()) / (1000 * 60 * 60);
    const hourlyRate = parseFloat(service.hourly_rate);
    const totalAmount = hourlyRate * durationHours;

    // Create booking
    const result = await db.insert(bookingsTable)
      .values({
        user_id: input.user_id,
        service_id: input.service_id,
        start_time: input.start_time,
        end_time: input.end_time,
        total_amount: totalAmount.toString(),
        notes: input.notes,
        status: 'pending'
      })
      .returning()
      .execute();

    const booking = result[0];
    return {
      ...booking,
      total_amount: parseFloat(booking.total_amount)
    };
  } catch (error) {
    console.error('Booking creation failed:', error);
    throw error;
  }
}
