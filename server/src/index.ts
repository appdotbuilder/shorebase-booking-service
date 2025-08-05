
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createServiceInputSchema,
  createBookingInputSchema,
  updateBookingStatusInputSchema,
  createRatingInputSchema,
  getBookingsQuerySchema,
  bookingStatsQuerySchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { getServices } from './handlers/get_services';
import { createService } from './handlers/create_service';
import { createBooking } from './handlers/create_booking';
import { getBookings } from './handlers/get_bookings';
import { getUserBookings } from './handlers/get_user_bookings';
import { updateBookingStatus } from './handlers/update_booking_status';
import { cancelBooking } from './handlers/cancel_booking';
import { createRating } from './handlers/create_rating';
import { getBookingStats } from './handlers/get_booking_stats';
import { getWhatsAppBookingLink } from './handlers/get_whatsapp_booking_link';
import { seedSampleData } from './handlers/seed_sample_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Services
  getServices: publicProcedure
    .query(() => getServices()),

  createService: publicProcedure
    .input(createServiceInputSchema)
    .mutation(({ input }) => createService(input)),

  // Bookings
  createBooking: publicProcedure
    .input(createBookingInputSchema)
    .mutation(({ input }) => createBooking(input)),

  getBookings: publicProcedure
    .input(getBookingsQuerySchema)
    .query(({ input }) => getBookings(input)),

  getUserBookings: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserBookings(input.userId)),

  updateBookingStatus: publicProcedure
    .input(updateBookingStatusInputSchema)
    .mutation(({ input }) => updateBookingStatus(input)),

  cancelBooking: publicProcedure
    .input(z.object({ bookingId: z.number(), userId: z.number() }))
    .mutation(({ input }) => cancelBooking(input.bookingId, input.userId)),

  // Ratings
  createRating: publicProcedure
    .input(createRatingInputSchema)
    .mutation(({ input }) => createRating(input)),

  // Operations Dashboard
  getBookingStats: publicProcedure
    .input(bookingStatsQuerySchema)
    .query(({ input }) => getBookingStats(input)),

  getWhatsAppBookingLink: publicProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(({ input }) => getWhatsAppBookingLink(input.bookingId)),

  // Utilities
  seedSampleData: publicProcedure
    .mutation(() => seedSampleData()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
