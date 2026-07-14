import bcrypt from "bcryptjs";

/**
 * bcrypt cost factor.
 *
 * 12 rounds is the recommended minimum for production (roughly 300ms per hash
 * on modern hardware). This naturally rate-limits brute-force attacks without
 * requiring additional logic.
 */
const BCRYPT_COST_FACTOR = 12;

/**
 * Hashes a plaintext password with bcrypt.
 * Always use this before persisting passwords to the database.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST_FACTOR);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * bcrypt.compare is time-constant — safe against timing attacks.
 *
 * @returns `true` if the password matches, `false` otherwise.
 */
export async function comparePassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
