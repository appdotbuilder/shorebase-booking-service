
import { db } from '../db';
import { bookingsTable, usersTable, servicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function getWhatsAppBookingLink(bookingId: number): Promise<{ whatsappUrl: string }> {
  try {
    // Fetch booking with user and service details
    const result = await db.select()
      .from(bookingsTable)
      .innerJoin(usersTable, eq(bookingsTable.user_id, usersTable.id))
      .innerJoin(servicesTable, eq(bookingsTable.service_id, servicesTable.id))
      .where(eq(bookingsTable.id, bookingId))
      .execute();

    if (result.length === 0) {
      throw new Error('Booking not found');
    }

    const bookingData = result[0];
    const booking = bookingData.bookings;
    const user = bookingData.users;
    const service = bookingData.services;

    // Format dates for display
    const startTime = new Date(booking.start_time).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const endTime = new Date(booking.end_time).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format total amount
    const totalAmount = parseFloat(booking.total_amount);

    // Create message with booking details
    const message = `Booking Details:
📋 Booking ID: ${booking.id}
👤 Customer: ${user.username} (${user.email})
🏢 Service: ${service.name} (${service.subtype})
📅 Start Time: ${startTime}
📅 End Time: ${endTime}
💰 Total Amount: $${totalAmount.toFixed(2)}
📊 Status: ${booking.status.toUpperCase()}${booking.notes ? `\n📝 Notes: ${booking.notes}` : ''}`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    return {
      whatsappUrl: `https://wa.me/?text=${encodedMessage}`
    };
  } catch (error) {
    console.error('Failed to generate WhatsApp booking link:', error);
    throw error;
  }
}
