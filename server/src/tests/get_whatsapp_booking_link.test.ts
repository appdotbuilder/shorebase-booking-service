
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable } from '../db/schema';
import { getWhatsAppBookingLink } from '../handlers/get_whatsapp_booking_link';

describe('getWhatsAppBookingLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate WhatsApp link with booking details', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'Conference Room A',
        type: 'meeting_room',
        subtype: 'conference_room',
        capacity: 10,
        hourly_rate: '50.00',
        description: 'Large conference room with projector',
        is_active: true
      })
      .returning()
      .execute();

    const serviceId = serviceResult[0].id;

    // Create test booking
    const startTime = new Date('2024-01-15T09:00:00Z');
    const endTime = new Date('2024-01-15T11:00:00Z');

    const bookingResult = await db.insert(bookingsTable)
      .values({
        user_id: userId,
        service_id: serviceId,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        total_amount: '100.00',
        notes: 'Important client meeting'
      })
      .returning()
      .execute();

    const bookingId = bookingResult[0].id;

    // Test the handler
    const result = await getWhatsAppBookingLink(bookingId);

    // Verify WhatsApp URL structure
    expect(result.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\?text=.+$/);

    // Decode the message to verify content
    const urlParams = new URLSearchParams(result.whatsappUrl.split('?')[1]);
    const decodedMessage = decodeURIComponent(urlParams.get('text') || '');

    // Verify booking details in message
    expect(decodedMessage).toContain(`Booking ID: ${bookingId}`);
    expect(decodedMessage).toContain('Customer: testuser (test@example.com)');
    expect(decodedMessage).toContain('Service: Conference Room A (conference_room)');
    expect(decodedMessage).toContain('Total Amount: $100.00');
    expect(decodedMessage).toContain('Status: CONFIRMED');
    expect(decodedMessage).toContain('Notes: Important client meeting');
    expect(decodedMessage).toContain('Start Time:');
    expect(decodedMessage).toContain('End Time:');
  });

  it('should generate WhatsApp link without notes when notes is null', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: '110 Ton Crane',
        type: 'crane_service',
        subtype: '110_ton_crane',
        capacity: 110,
        hourly_rate: '250.00',
        is_active: true
      })
      .returning()
      .execute();

    const serviceId = serviceResult[0].id;

    // Create test booking without notes
    const bookingResult = await db.insert(bookingsTable)
      .values({
        user_id: userId,
        service_id: serviceId,
        start_time: new Date('2024-01-16T08:00:00Z'),
        end_time: new Date('2024-01-16T16:00:00Z'),
        status: 'pending',
        total_amount: '2000.00',
        notes: null
      })
      .returning()
      .execute();

    const bookingId = bookingResult[0].id;

    // Test the handler
    const result = await getWhatsAppBookingLink(bookingId);

    // Decode the message to verify content
    const urlParams = new URLSearchParams(result.whatsappUrl.split('?')[1]);
    const decodedMessage = decodeURIComponent(urlParams.get('text') || '');

    // Verify booking details without notes section
    expect(decodedMessage).toContain(`Booking ID: ${bookingId}`);
    expect(decodedMessage).toContain('Customer: testuser2 (test2@example.com)');
    expect(decodedMessage).toContain('Service: 110 Ton Crane (110_ton_crane)');
    expect(decodedMessage).toContain('Total Amount: $2000.00');
    expect(decodedMessage).toContain('Status: PENDING');
    expect(decodedMessage).not.toContain('Notes:');
  });

  it('should throw error for non-existent booking', async () => {
    const nonExistentBookingId = 99999;

    await expect(getWhatsAppBookingLink(nonExistentBookingId))
      .rejects.toThrow(/booking not found/i);
  });

  it('should handle numeric conversion correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'numerictest',
        email: 'numeric@example.com',
        password_hash: 'hashedpassword',
        role: 'operations'
      })
      .returning()
      .execute();

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: '5 Ton Forklift',
        type: 'forklift_service',
        subtype: '5_ton_forklift',
        capacity: 5,
        hourly_rate: '75.50',
        is_active: true
      })
      .returning()
      .execute();

    // Create test booking with decimal amount
    const bookingResult = await db.insert(bookingsTable)
      .values({
        user_id: userResult[0].id,
        service_id: serviceResult[0].id,
        start_time: new Date('2024-01-17T10:00:00Z'),
        end_time: new Date('2024-01-17T14:00:00Z'),
        status: 'completed',
        total_amount: '302.50',
        notes: null
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getWhatsAppBookingLink(bookingResult[0].id);

    // Decode and verify numeric formatting
    const urlParams = new URLSearchParams(result.whatsappUrl.split('?')[1]);
    const decodedMessage = decodeURIComponent(urlParams.get('text') || '');

    expect(decodedMessage).toContain('Total Amount: $302.50');
  });
});
