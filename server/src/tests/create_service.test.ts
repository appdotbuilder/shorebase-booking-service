
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { createService } from '../handlers/create_service';
import { eq } from 'drizzle-orm';

// Test inputs for different service types
const meetingRoomInput: CreateServiceInput = {
  name: 'Conference Room A',
  type: 'meeting_room',
  subtype: 'conference_room',
  capacity: 20,
  hourly_rate: 50.00,
  description: 'Large conference room with projector',
  is_active: true
};

const craneServiceInput: CreateServiceInput = {
  name: '110 Ton Crane Unit 1',
  type: 'crane_service',
  subtype: '110_ton_crane',
  capacity: 110,
  hourly_rate: 250.50,
  description: 'Heavy duty crane for construction',
  is_active: true
};

const forkliftServiceInput: CreateServiceInput = {
  name: '5 Ton Forklift Unit 3',
  type: 'forklift_service',
  subtype: '5_ton_forklift',
  capacity: 5,
  hourly_rate: 75.25,
  description: 'Electric forklift for warehouse operations',
  is_active: true
};

describe('createService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a meeting room service', async () => {
    const result = await createService(meetingRoomInput);

    // Basic field validation
    expect(result.name).toEqual('Conference Room A');
    expect(result.type).toEqual('meeting_room');
    expect(result.subtype).toEqual('conference_room');
    expect(result.capacity).toEqual(20);
    expect(result.hourly_rate).toEqual(50.00);
    expect(typeof result.hourly_rate).toEqual('number');
    expect(result.description).toEqual('Large conference room with projector');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a crane service', async () => {
    const result = await createService(craneServiceInput);

    // Basic field validation
    expect(result.name).toEqual('110 Ton Crane Unit 1');
    expect(result.type).toEqual('crane_service');
    expect(result.subtype).toEqual('110_ton_crane');
    expect(result.capacity).toEqual(110);
    expect(result.hourly_rate).toEqual(250.50);
    expect(typeof result.hourly_rate).toEqual('number');
    expect(result.description).toEqual('Heavy duty crane for construction');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a forklift service', async () => {
    const result = await createService(forkliftServiceInput);

    // Basic field validation
    expect(result.name).toEqual('5 Ton Forklift Unit 3');
    expect(result.type).toEqual('forklift_service');
    expect(result.subtype).toEqual('5_ton_forklift');
    expect(result.capacity).toEqual(5);
    expect(result.hourly_rate).toEqual(75.25);
    expect(typeof result.hourly_rate).toEqual('number');
    expect(result.description).toEqual('Electric forklift for warehouse operations');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save service to database', async () => {
    const result = await createService(meetingRoomInput);

    // Query using proper drizzle syntax
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, result.id))
      .execute();

    expect(services).toHaveLength(1);
    expect(services[0].name).toEqual('Conference Room A');
    expect(services[0].type).toEqual('meeting_room');
    expect(services[0].subtype).toEqual('conference_room');
    expect(services[0].capacity).toEqual(20);
    expect(parseFloat(services[0].hourly_rate)).toEqual(50.00);
    expect(services[0].description).toEqual('Large conference room with projector');
    expect(services[0].is_active).toEqual(true);
    expect(services[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle service with null capacity and description', async () => {
    const inputWithNulls: CreateServiceInput = {
      name: 'Basic Service',
      type: 'meeting_room',
      subtype: 'standard_room',
      capacity: null,
      hourly_rate: 25.00,
      description: null,
      is_active: true
    };

    const result = await createService(inputWithNulls);

    expect(result.name).toEqual('Basic Service');
    expect(result.capacity).toBeNull();
    expect(result.description).toBeNull();
    expect(result.hourly_rate).toEqual(25.00);
    expect(typeof result.hourly_rate).toEqual('number');
    expect(result.is_active).toEqual(true);
  });

  it('should handle is_active default value', async () => {
    const inputWithDefault: CreateServiceInput = {
      name: 'Default Active Service',
      type: 'meeting_room',
      subtype: 'standard_room',
      capacity: 10,
      hourly_rate: 30.00,
      description: 'Test service',
      is_active: true // Zod default is applied
    };

    const result = await createService(inputWithDefault);

    expect(result.is_active).toEqual(true);
  });
});
