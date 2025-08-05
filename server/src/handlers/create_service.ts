
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput, type Service } from '../schema';

export async function createService(input: CreateServiceInput): Promise<Service> {
  try {
    // Insert service record
    const result = await db.insert(servicesTable)
      .values({
        name: input.name,
        type: input.type,
        subtype: input.subtype,
        capacity: input.capacity,
        hourly_rate: input.hourly_rate.toString(), // Convert number to string for numeric column
        description: input.description,
        is_active: input.is_active
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const service = result[0];
    return {
      ...service,
      hourly_rate: parseFloat(service.hourly_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Service creation failed:', error);
    throw error;
  }
}
