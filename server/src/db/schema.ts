
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'operations']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled']);
export const serviceTypeEnum = pgEnum('service_type', ['meeting_room', 'crane_service', 'forklift_service']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Services table
export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: serviceTypeEnum('type').notNull(),
  subtype: text('subtype').notNull(), // specific room/crane/forklift type
  capacity: integer('capacity'), // people capacity for rooms, tonnage for equipment
  hourly_rate: numeric('hourly_rate', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Bookings table
export const bookingsTable = pgTable('bookings', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  service_id: integer('service_id').notNull().references(() => servicesTable.id),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  status: bookingStatusEnum('status').notNull().default('pending'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Ratings table
export const ratingsTable = pgTable('ratings', {
  id: serial('id').primaryKey(),
  booking_id: integer('booking_id').notNull().references(() => bookingsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  rating: integer('rating').notNull(), // 1-5 stars
  feedback: text('feedback'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  bookings: many(bookingsTable),
  ratings: many(ratingsTable),
}));

export const servicesRelations = relations(servicesTable, ({ many }) => ({
  bookings: many(bookingsTable),
}));

export const bookingsRelations = relations(bookingsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [bookingsTable.user_id],
    references: [usersTable.id],
  }),
  service: one(servicesTable, {
    fields: [bookingsTable.service_id],
    references: [servicesTable.id],
  }),
  rating: one(ratingsTable, {
    fields: [bookingsTable.id],
    references: [ratingsTable.booking_id],
  }),
}));

export const ratingsRelations = relations(ratingsTable, ({ one }) => ({
  booking: one(bookingsTable, {
    fields: [ratingsTable.booking_id],
    references: [bookingsTable.id],
  }),
  user: one(usersTable, {
    fields: [ratingsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Service = typeof servicesTable.$inferSelect;
export type NewService = typeof servicesTable.$inferInsert;
export type Booking = typeof bookingsTable.$inferSelect;
export type NewBooking = typeof bookingsTable.$inferInsert;
export type Rating = typeof ratingsTable.$inferSelect;
export type NewRating = typeof ratingsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  services: servicesTable,
  bookings: bookingsTable,
  ratings: ratingsTable,
};
