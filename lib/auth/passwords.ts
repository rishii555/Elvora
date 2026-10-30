import bcrypt from "bcryptjs";

/**
 * Hashes a plaintext password using bcrypt with salt rounds = 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a plaintext password with a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
