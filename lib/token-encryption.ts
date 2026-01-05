/**
 * Token Encryption Utility
 *
 * Encrypts and decrypts OAuth tokens using AES-256-GCM.
 * Uses NEXTAUTH_SECRET as the encryption key with PBKDF2 key derivation.
 *
 * Format: iv:authTag:encrypted
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;        // 16 bytes for AES
const TAG_LENGTH = 16;       // 16 bytes authentication tag
const KEY_LENGTH = 32;       // 32 bytes for AES-256
const ITERATIONS = 100000;   // PBKDF2 iterations

/**
 * Get salt for key derivation from environment variable or use default
 * In production, set TOKEN_ENCRYPTION_SALT environment variable for better security
 */
function getSalt(): string {
  return process.env.TOKEN_ENCRYPTION_SALT || 'calendar-tokens-default';
}

/**
 * Derive encryption key from NEXTAUTH_SECRET using PBKDF2
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('NEXTAUTH_SECRET must be set for token encryption');
  }

  // Derive key using PBKDF2 with configurable salt
  return crypto.pbkdf2Sync(
    secret,
    getSalt(),
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypt a token using AES-256-GCM
 *
 * @param token - The plaintext token to encrypt
 * @returns Encrypted token in format: iv:authTag:encrypted
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted token using AES-256-GCM
 *
 * @param encryptedToken - The encrypted token in format: iv:authTag:encrypted
 * @returns Decrypted plaintext token
 * @throws Error if token format is invalid or decryption fails
 */
export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  const parts = encryptedToken.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
