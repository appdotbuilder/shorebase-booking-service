
import { db } from '../db';
import { usersTable, servicesTable, bookingsTable, ratingsTable } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export async function seedSampleData(): Promise<{ message: string }> {
  try {
    // Check if data already exists to make this idempotent
    const existingUsers = await db.select().from(usersTable).limit(1).execute();
    if (existingUsers.length > 0) {
      return { message: 'Sample data already exists, skipping seed' };
    }

    // Create sample users with simple password hash (for demo purposes)
    const simplePasswordHash = 'hashed_password_123';
    
    const userResults = await db.insert(usersTable)
      .values([
        {
          username: 'john_doe',
          email: 'john@example.com',
          password_hash: simplePasswordHash,
          role: 'user'
        },
        {
          username: 'jane_smith',
          email: 'jane@example.com',
          password_hash: simplePasswordHash,
          role: 'user'
        },
        {
          username: 'operations_manager',
          email: 'ops@example.com',
          password_hash: simplePasswordHash,
          role: 'operations'
        },
        {
          username: 'admin_user',
          email: 'admin@example.com',
          password_hash: simplePasswordHash,
          role: 'operations'
        }
      ])
      .returning()
      .execute();

    // Create sample services
    const serviceResults = await db.insert(servicesTable)
      .values([
        // Meeting rooms
        {
          name: 'Conference Room A',
          type: 'meeting_room',
          subtype: 'conference_room',
          capacity: 12,
          hourly_rate: '50.00',
          description: 'Large conference room with projector and whiteboard'
        },
        {
          name: 'Executive Boardroom',
          type: 'meeting_room',
          subtype: 'executive_room',
          capacity: 8,
          hourly_rate: '100.00',
          description: 'Premium boardroom with video conferencing facilities'
        },
        {
          name: 'Standard Meeting Room B',
          type: 'meeting_room',
          subtype: 'standard_room',
          capacity: 6,
          hourly_rate: '25.00',
          description: 'Basic meeting room for small groups'
        },
        // Crane services
        {
          name: 'Heavy Duty Crane',
          type: 'crane_service',
          subtype: '220_ton_crane',
          capacity: 220,
          hourly_rate: '500.00',
          description: '220-ton capacity crane for heavy lifting operations'
        },
        {
          name: 'Standard Crane',
          type: 'crane_service',
          subtype: '110_ton_crane',
          capacity: 110,
          hourly_rate: '300.00',
          description: '110-ton capacity crane for medium lifting operations'
        },
        // Forklift services
        {
          name: 'Heavy Forklift',
          type: 'forklift_service',
          subtype: '5_ton_forklift',
          capacity: 5,
          hourly_rate: '75.00',
          description: '5-ton capacity forklift for heavy materials'
        },
        {
          name: 'Medium Forklift',
          type: 'forklift_service',
          subtype: '3_ton_forklift',
          capacity: 3,
          hourly_rate: '50.00',
          description: '3-ton capacity forklift for medium materials'
        },
        {
          name: 'Light Forklift',
          type: 'forklift_service',
          subtype: '1_ton_forklift',
          capacity: 1,
          hourly_rate: '30.00',
          description: '1-ton capacity forklift for light materials'
        }
      ])
      .returning()
      .execute();

    // Create sample bookings with various statuses
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const bookingResults = await db.insert(bookingsTable)
      .values([
        // Completed bookings (for ratings)
        {
          user_id: userResults[0].id,
          service_id: serviceResults[0].id, // Conference Room A
          start_time: lastWeek,
          end_time: new Date(lastWeek.getTime() + 2 * 60 * 60 * 1000), // 2 hours
          status: 'completed',
          total_amount: '100.00', // 2 hours * $50/hour
          notes: 'Board meeting completed successfully'
        },
        {
          user_id: userResults[1].id,
          service_id: serviceResults[3].id, // Heavy Duty Crane
          start_time: lastWeek,
          end_time: new Date(lastWeek.getTime() + 4 * 60 * 60 * 1000), // 4 hours
          status: 'completed',
          total_amount: '2000.00', // 4 hours * $500/hour
          notes: 'Equipment installation completed'
        },
        // Confirmed upcoming bookings
        {
          user_id: userResults[0].id,
          service_id: serviceResults[1].id, // Executive Boardroom
          start_time: tomorrow,
          end_time: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000), // 3 hours
          status: 'confirmed',
          total_amount: '300.00', // 3 hours * $100/hour
          notes: 'Client presentation scheduled'
        },
        // Pending bookings
        {
          user_id: userResults[1].id,
          service_id: serviceResults[5].id, // Heavy Forklift
          start_time: nextWeek,
          end_time: new Date(nextWeek.getTime() + 8 * 60 * 60 * 1000), // 8 hours
          status: 'pending',
          total_amount: '600.00', // 8 hours * $75/hour
          notes: 'Warehouse reorganization project'
        },
        // Ongoing booking
        {
          user_id: userResults[0].id,
          service_id: serviceResults[6].id, // Medium Forklift
          start_time: new Date(now.getTime() - 60 * 60 * 1000), // Started 1 hour ago
          end_time: new Date(now.getTime() + 3 * 60 * 60 * 1000), // Ends in 3 hours
          status: 'ongoing',
          total_amount: '200.00', // 4 hours * $50/hour
          notes: 'Loading dock operations in progress'
        },
        // Cancelled booking
        {
          user_id: userResults[1].id,
          service_id: serviceResults[2].id, // Standard Meeting Room B
          start_time: tomorrow,
          end_time: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // 2 hours
          status: 'cancelled',
          total_amount: '50.00', // 2 hours * $25/hour
          notes: 'Meeting cancelled due to schedule conflict'
        }
      ])
      .returning()
      .execute();

    // Create sample ratings for completed bookings
    await db.insert(ratingsTable)
      .values([
        {
          booking_id: bookingResults[0].id,
          user_id: userResults[0].id,
          rating: 5,
          feedback: 'Excellent conference room facilities. Everything worked perfectly.'
        },
        {
          booking_id: bookingResults[1].id,
          user_id: userResults[1].id,
          rating: 4,
          feedback: 'Great crane service, very professional operator. Slightly delayed start but overall satisfied.'
        }
      ])
      .execute();

    return { message: 'Sample data seeded successfully' };
  } catch (error) {
    console.error('Sample data seeding failed:', error);
    throw error;
  }
}
