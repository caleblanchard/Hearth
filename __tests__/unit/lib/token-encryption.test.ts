import { encryptToken, decryptToken } from '@/lib/token-encryption';

describe('Token Encryption', () => {
  // Save original env
  const originalEnv = process.env.NEXTAUTH_SECRET;

  beforeAll(() => {
    // Set a test secret
    process.env.NEXTAUTH_SECRET = 'test-secret-for-encryption-minimum-32-characters-long';
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv) {
      process.env.NEXTAUTH_SECRET = originalEnv;
    } else {
      delete process.env.NEXTAUTH_SECRET;
    }
  });

  describe('encryptToken', () => {
    it('should encrypt a token successfully', () => {
      const token = 'my-secret-token-12345';
      const encrypted = encryptToken(token);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(token);
      expect(typeof encrypted).toBe('string');
    });

    it('should produce different encrypted values for same token (different IV)', () => {
      const token = 'my-secret-token-12345';
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce encrypted string with correct format (iv:authTag:encrypted)', () => {
      const token = 'my-secret-token-12345';
      const encrypted = encryptToken(token);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(32); // 16 bytes IV = 32 hex chars
      expect(parts[1]).toHaveLength(32); // 16 bytes auth tag = 32 hex chars
      expect(parts[2].length).toBeGreaterThan(0); // Encrypted content
    });

    it('should encrypt different token sizes', () => {
      const shortToken = 'abc';
      const mediumToken = 'this-is-a-medium-length-token-with-more-characters';
      const longToken = 'a'.repeat(500);

      expect(() => encryptToken(shortToken)).not.toThrow();
      expect(() => encryptToken(mediumToken)).not.toThrow();
      expect(() => encryptToken(longToken)).not.toThrow();
    });

    it('should handle empty string', () => {
      const token = '';
      const encrypted = encryptToken(token);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle tokens with special characters', () => {
      const token = 'token!@#$%^&*()_+-={}[]|:;"<>?,./~`';
      const encrypted = encryptToken(token);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should throw error if NEXTAUTH_SECRET is not set', () => {
      delete process.env.NEXTAUTH_SECRET;

      expect(() => encryptToken('test-token')).toThrow('NEXTAUTH_SECRET must be set');

      // Restore for other tests
      process.env.NEXTAUTH_SECRET = 'test-secret-for-encryption-minimum-32-characters-long';
    });
  });

  describe('decryptToken', () => {
    it('should decrypt an encrypted token back to original', () => {
      const originalToken = 'my-secret-access-token-xyz-789';
      const encrypted = encryptToken(originalToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    it('should decrypt different token sizes correctly', () => {
      const tokens = [
        'short',
        'this-is-a-medium-length-token',
        'a'.repeat(500),
      ];

      for (const token of tokens) {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    });

    it('should decrypt empty string correctly', () => {
      const token = '';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });

    it('should decrypt tokens with special characters', () => {
      const token = 'token!@#$%^&*()_+-={}[]|:;"<>?,./~`';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(token);
    });

    it('should throw error for invalid encrypted token format (wrong number of parts)', () => {
      const invalidEncrypted = 'invalid:format';

      expect(() => decryptToken(invalidEncrypted)).toThrow('Invalid encrypted token format');
    });

    it('should throw error for invalid encrypted token format (not hex)', () => {
      const invalidEncrypted = 'not-hex:not-hex:not-hex';

      expect(() => decryptToken(invalidEncrypted)).toThrow();
    });

    it('should throw error for corrupted encrypted data', () => {
      const originalToken = 'my-secret-token';
      const encrypted = encryptToken(originalToken);

      // Corrupt the encrypted part
      const parts = encrypted.split(':');
      const corrupted = `${parts[0]}:${parts[1]}:corrupted-data`;

      expect(() => decryptToken(corrupted)).toThrow();
    });

    it('should throw error for tampered auth tag', () => {
      const originalToken = 'my-secret-token';
      const encrypted = encryptToken(originalToken);

      // Tamper with auth tag
      const parts = encrypted.split(':');
      const tamperedTag = 'a'.repeat(32);
      const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;

      expect(() => decryptToken(tampered)).toThrow();
    });

    it('should throw error if NEXTAUTH_SECRET is not set', () => {
      const encrypted = encryptToken('test-token');

      delete process.env.NEXTAUTH_SECRET;

      expect(() => decryptToken(encrypted)).toThrow('NEXTAUTH_SECRET must be set');

      // Restore for other tests
      process.env.NEXTAUTH_SECRET = 'test-secret-for-encryption-minimum-32-characters-long';
    });
  });

  describe('Encryption/Decryption Round Trip', () => {
    it('should successfully encrypt and decrypt multiple tokens', () => {
      const tokens = [
        'access-token-abc123',
        'refresh-token-def456',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        'very-long-token-' + 'a'.repeat(1000),
      ];

      for (const token of tokens) {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    });

    it('should handle rapid encrypt/decrypt cycles', () => {
      const token = 'test-token-for-rapid-cycles';

      for (let i = 0; i < 100; i++) {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    });
  });

  describe('Security Properties', () => {
    it('should use different IV for each encryption (non-deterministic)', () => {
      const token = 'same-token-encrypted-twice';
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect(decryptToken(encrypted1)).toBe(token);
      expect(decryptToken(encrypted2)).toBe(token);
    });

    it('should produce authenticated encryption (detect tampering)', () => {
      const token = 'secure-token';
      const encrypted = encryptToken(token);

      // Try to modify encrypted portion
      const parts = encrypted.split(':');
      const modifiedEncrypted = parts[2].replace('a', 'b');
      const tampered = `${parts[0]}:${parts[1]}:${modifiedEncrypted}`;

      // Should fail authentication
      expect(() => decryptToken(tampered)).toThrow();
    });
  });
});
