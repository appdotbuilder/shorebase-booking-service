
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'user'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('user');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20); // bcrypt hashes are long
  });

  it('should save user to database with valid password hash', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.role).toEqual('user');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
    
    // Verify password hash is valid
    const isValidHash = await Bun.password.verify('password123', savedUser.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should create user with operations role', async () => {
    const operationsInput: CreateUserInput = {
      username: 'opsuser',
      email: 'ops@example.com',
      password: 'securepass456',
      role: 'operations'
    };

    const result = await createUser(operationsInput);
    
    expect(result.role).toEqual('operations');
    expect(result.username).toEqual('opsuser');
    expect(result.email).toEqual('ops@example.com');
  });

  it('should handle unique constraint violations', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create user with same email
    const duplicateEmailInput: CreateUserInput = {
      username: 'different',
      email: 'test@example.com', // Same email
      password: 'password456',
      role: 'user'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/duplicate key/i);

    // Try to create user with same username
    const duplicateUsernameInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password456',
      role: 'user'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/duplicate key/i);
  });
});
