
import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['user', 'operations']);
export const bookingStatusEnum = z.enum(['pending', 'confirmed', 'ongoing', 'completed', 'cancelled']);
export const serviceTypeEnum = z.enum(['meeting_room', 'crane_service', 'forklift_service']);
export const meetingRoomTypeEnum = z.enum(['standard_room', 'conference_room', 'executive_room']);
export const craneServiceTypeEnum = z.enum(['110_ton_crane', '220_ton_crane']);
export const forkliftServiceTypeEnum = z.enum(['5_ton_forklift', '3_ton_forklift', '1_ton_forklift']);

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Service schemas
export const serviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: serviceTypeEnum,
  subtype: z.string(),
  capacity: z.number().int().nullable(),
  hourly_rate: z.number(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceInputSchema = z.object({
  name: z.string(),
  type: serviceTypeEnum,
  subtype: z.string(),
  capacity: z.number().int().nullable(),
  hourly_rate: z.number().positive(),
  description: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

// Booking schemas
export const bookingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  service_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  status: bookingStatusEnum,
  total_amount: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Booking = z.infer<typeof bookingSchema>;

export const createBookingInputSchema = z.object({
  user_id: z.number(),
  service_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  notes: z.string().nullable()
});

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;

export const updateBookingInputSchema = z.object({
  id: z.number(),
  status: bookingStatusEnum.optional(),
  notes: z.string().nullable().optional()
});

export type UpdateBookingInput = z.infer<typeof updateBookingInputSchema>;

export const updateBookingStatusInputSchema = z.object({
  id: z.number(),
  status: bookingStatusEnum
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusInputSchema>;

// Rating schemas
export const ratingSchema = z.object({
  id: z.number(),
  booking_id: z.number(),
  user_id: z.number(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Rating = z.infer<typeof ratingSchema>;

export const createRatingInputSchema = z.object({
  booking_id: z.number(),
  user_id: z.number(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().nullable()
});

export type CreateRatingInput = z.infer<typeof createRatingInputSchema>;

// Query schemas
export const getBookingsQuerySchema = z.object({
  user_id: z.number().optional(),
  status: bookingStatusEnum.optional(),
  service_type: serviceTypeEnum.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetBookingsQuery = z.infer<typeof getBookingsQuerySchema>;

export const bookingStatsQuerySchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type BookingStatsQuery = z.infer<typeof bookingStatsQuerySchema>;

// Response schemas with relations
export const bookingWithDetailsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  service_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  status: bookingStatusEnum,
  total_amount: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  user: userSchema,
  service: serviceSchema,
  rating: ratingSchema.nullable()
});

export type BookingWithDetails = z.infer<typeof bookingWithDetailsSchema>;

export const bookingStatsSchema = z.object({
  total_bookings: z.number().int(),
  pending: z.number().int(),
  confirmed: z.number().int(),
  ongoing: z.number().int(),
  completed: z.number().int(),
  cancelled: z.number().int(),
  total_revenue: z.number()
});

export type BookingStats = z.infer<typeof bookingStatsSchema>;
