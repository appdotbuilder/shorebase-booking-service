
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user directly in database
async function createTestUser(username: string, email: string, password: string, role: 'user' | 'operations' = 'user') {
  const result = await db.insert(usersTable)
    .values({
      username,
      email,
      password_hash: password, // Storing as plain text for testing
      role
    })
    .returning()
    .execute();

  return result[0];
}

const loginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create user first
    await createTestUser('testuser', 'test@example.com', 'password123', 'user');

    const result = await loginUser(loginInput);

    // Verify user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.username).toEqual('testuser');
    expect(result.user.role).toEqual('user');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should generate valid token', async () => {
    // Create user first
    const createdUser = await createTestUser('testuser', 'test@example.com', 'password123', 'user');

    const result = await loginUser(loginInput);

    // Verify token can be decoded
    const decoded = JSON.parse(Buffer.from(result.token, 'base64').toString());

    expect(decoded.userId).toEqual(createdUser.id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.role).toEqual('user');
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Date.now());
  });

  it('should reject invalid email', async () => {
    // Create user first
    await createTestUser('testuser', 'test@example.com', 'password123', 'user');

    const invalidEmailInput: LoginInput = {
      email: 'wrong@example.com',
      password: 'password123'
    };

    expect(loginUser(invalidEmailInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject invalid password', async () => {
    // Create user first
    await createTestUser('testuser', 'test@example.com', 'password123', 'user');

    const invalidPasswordInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    expect(loginUser(invalidPasswordInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject non-existent user', async () => {
    const nonExistentUserInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    expect(loginUser(nonExistentUserInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should work with operations role user', async () => {
    await createTestUser('opsuser', 'ops@example.com', 'opspassword123', 'operations');

    const opsLoginInput: LoginInput = {
      email: 'ops@example.com',
      password: 'opspassword123'
    };

    const result = await loginUser(opsLoginInput);

    expect(result.user.role).toEqual('operations');
    expect(result.user.email).toEqual('ops@example.com');
    expect(result.token).toBeDefined();

    // Verify token contains correct role
    const decoded = JSON.parse(Buffer.from(result.token, 'base64').toString());
    expect(decoded.role).toEqual('operations');
  });

  it('should save user correctly in database', async () => {
    // Create user first
    const createdUser = await createTestUser('testuser', 'test@example.com', 'password123', 'user');

    const result = await loginUser(loginInput);

    // Query database to verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].username).toEqual('testuser');
    expect(users[0].role).toEqual('user');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });
});
