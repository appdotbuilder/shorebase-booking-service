
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Service } from '../schema';

export async function getServices(): Promise<Service[]> {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(service => ({
      ...service,
      hourly_rate: parseFloat(service.hourly_rate)
    }));
  } catch (error) {
    console.error('Failed to fetch services:', error);
    throw error;
  }
}
