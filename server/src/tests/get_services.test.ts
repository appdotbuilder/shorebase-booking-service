
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { getServices } from '../handlers/get_services';

describe('getServices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no services exist', async () => {
    const result = await getServices();
    expect(result).toEqual([]);
  });

  it('should return all active services', async () => {
    // Create test services
    await db.insert(servicesTable).values([
      {
        name: 'Conference Room A',
        type: 'meeting_room',
        subtype: 'conference_room',
        capacity: 20,
        hourly_rate: '50.00',
        description: 'Large conference room',
        is_active: true
      },
      {
        name: '110 Ton Crane',
        type: 'crane_service',
        subtype: '110_ton_crane',
        capacity: 110,
        hourly_rate: '200.00',
        description: 'Heavy duty crane',
        is_active: true
      },
      {
        name: '5 Ton Forklift',
        type: 'forklift_service',
        subtype: '5_ton_forklift',
        capacity: 5,
        hourly_rate: '75.50',
        description: 'Heavy forklift',
        is_active: true
      }
    ]).execute();

    const result = await getServices();

    expect(result).toHaveLength(3);
    
    // Verify numeric conversion for hourly_rate
    expect(typeof result[0].hourly_rate).toBe('number');
    expect(result[0].hourly_rate).toBe(50.00);
    
    // Verify all required fields are present
    result.forEach(service => {
      expect(service.id).toBeDefined();
      expect(service.name).toBeDefined();
      expect(service.type).toBeDefined();
      expect(service.subtype).toBeDefined();
      expect(typeof service.hourly_rate).toBe('number');
      expect(service.is_active).toBe(true);
      expect(service.created_at).toBeInstanceOf(Date);
    });
  });

  it('should only return active services', async () => {
    // Create both active and inactive services
    await db.insert(servicesTable).values([
      {
        name: 'Active Service',
        type: 'meeting_room',
        subtype: 'standard_room',
        capacity: 10,
        hourly_rate: '30.00',
        is_active: true
      },
      {
        name: 'Inactive Service',
        type: 'crane_service',
        subtype: '220_ton_crane',
        capacity: 220,
        hourly_rate: '300.00',
        is_active: false
      }
    ]).execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Active Service');
    expect(result[0].is_active).toBe(true);
  });

  it('should handle services with null capacity and description', async () => {
    await db.insert(servicesTable).values({
      name: 'Simple Service',
      type: 'meeting_room',
      subtype: 'standard_room',
      capacity: null,
      hourly_rate: '25.99',
      description: null,
      is_active: true
    }).execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    expect(result[0].capacity).toBeNull();
    expect(result[0].description).toBeNull();
    expect(result[0].hourly_rate).toBe(25.99);
  });

  it('should handle different service types correctly', async () => {
    await db.insert(servicesTable).values([
      {
        name: 'Meeting Room',
        type: 'meeting_room',
        subtype: 'executive_room',
        capacity: 8,
        hourly_rate: '100.00',
        is_active: true
      },
      {
        name: 'Crane Service',
        type: 'crane_service',
        subtype: '110_ton_crane',
        capacity: 110,
        hourly_rate: '150.00',
        is_active: true
      },
      {
        name: 'Forklift Service',
        type: 'forklift_service',
        subtype: '3_ton_forklift',
        capacity: 3,
        hourly_rate: '60.00',
        is_active: true
      }
    ]).execute();

    const result = await getServices();

    expect(result).toHaveLength(3);

    const meetingRoom = result.find(s => s.type === 'meeting_room');
    const craneService = result.find(s => s.type === 'crane_service');
    const forkliftService = result.find(s => s.type === 'forklift_service');

    expect(meetingRoom).toBeDefined();
    expect(meetingRoom?.subtype).toBe('executive_room');
    
    expect(craneService).toBeDefined();
    expect(craneService?.subtype).toBe('110_ton_crane');
    
    expect(forkliftService).toBeDefined();
    expect(forkliftService?.subtype).toBe('3_ton_forklift');
  });
});
