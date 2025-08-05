
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Simple password verification (in real app, use bcrypt)
    // For now, we'll assume passwords are stored as plain text for testing
    if (input.password !== user.password_hash) {
      throw new Error('Invalid email or password');
    }

    // Generate simple JWT-like token (in real app, use proper JWT library)
    const jwtSecret = process.env['JWT_SECRET'] || 'default_secret_for_development';
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
    };
    
    // Simple base64 encoding for token (in real app, use proper JWT)
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        password_hash: user.password_hash,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
