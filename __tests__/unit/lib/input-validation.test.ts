import {
  sanitizeString,
  sanitizeName,
  sanitizeDescription,
  sanitizeNotes,
  isValidEmail,
  validateRequestSize,
} from '@/lib/input-validation'

describe('lib/input-validation.ts', () => {
  describe('sanitizeString', () => {
    it('should return null for null input', () => {
      expect(sanitizeString(null)).toBeNull()
    })

    it('should return null for undefined input', () => {
      expect(sanitizeString(undefined)).toBeNull()
    })

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test')
    })

    it('should remove null bytes', () => {
      expect(sanitizeString('test\x00string')).toBe('teststring')
    })

    it('should remove control characters', () => {
      expect(sanitizeString('test\x01\x02\x03string')).toBe('teststring')
    })

    it('should preserve newlines and tabs', () => {
      expect(sanitizeString('test\n\tstring')).toBe('test\n\tstring')
    })

    it('should apply length limit', () => {
      const longString = 'a'.repeat(200)
      expect(sanitizeString(longString, 100)).toBe('a'.repeat(100))
    })

    it('should not truncate if under limit', () => {
      expect(sanitizeString('test', 100)).toBe('test')
    })

    it('should handle empty string', () => {
      // Empty string after trim returns null
      expect(sanitizeString('')).toBeNull()
    })

    it('should handle string with only whitespace', () => {
      expect(sanitizeString('   ')).toBe('')
    })
  })

  describe('sanitizeName', () => {
    it('should sanitize and limit to 100 characters by default', () => {
      const longName = 'a'.repeat(150)
      expect(sanitizeName(longName)).toBe('a'.repeat(100))
    })

    it('should allow custom max length', () => {
      const name = 'a'.repeat(150)
      expect(sanitizeName(name, 50)).toBe('a'.repeat(50))
    })

    it('should trim whitespace', () => {
      expect(sanitizeName('  John Doe  ')).toBe('John Doe')
    })

    it('should remove control characters', () => {
      expect(sanitizeName('John\x00Doe')).toBe('JohnDoe')
    })

    it('should return null for null input', () => {
      expect(sanitizeName(null)).toBeNull()
    })
  })

  describe('sanitizeDescription', () => {
    it('should sanitize and limit to 1000 characters by default', () => {
      const longDesc = 'a'.repeat(1500)
      expect(sanitizeDescription(longDesc)).toBe('a'.repeat(1000))
    })

    it('should allow custom max length', () => {
      const desc = 'a'.repeat(500)
      expect(sanitizeDescription(desc, 200)).toBe('a'.repeat(200))
    })

    it('should preserve newlines in descriptions', () => {
      const desc = 'Line 1\nLine 2\nLine 3'
      expect(sanitizeDescription(desc)).toBe('Line 1\nLine 2\nLine 3')
    })

    it('should return null for null input', () => {
      expect(sanitizeDescription(null)).toBeNull()
    })
  })

  describe('sanitizeNotes', () => {
    it('should sanitize and limit to 500 characters by default', () => {
      const longNotes = 'a'.repeat(600)
      expect(sanitizeNotes(longNotes)).toBe('a'.repeat(500))
    })

    it('should allow custom max length', () => {
      const notes = 'a'.repeat(300)
      expect(sanitizeNotes(notes, 200)).toBe('a'.repeat(200))
    })

    it('should return null for null input', () => {
      expect(sanitizeNotes(null)).toBeNull()
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
    })

    it('should return true for email with subdomain', () => {
      expect(isValidEmail('test@mail.example.com')).toBe(true)
    })

    it('should return true for email with plus sign', () => {
      expect(isValidEmail('test+tag@example.com')).toBe(true)
    })

    it('should return false for invalid email without @', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
    })

    it('should return false for invalid email without domain', () => {
      expect(isValidEmail('test@')).toBe(false)
    })

    it('should return false for invalid email without TLD', () => {
      expect(isValidEmail('test@example')).toBe(false)
    })

    it('should return false for null', () => {
      expect(isValidEmail(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isValidEmail(undefined)).toBe(false)
    })

    it('should trim whitespace before validation', () => {
      expect(isValidEmail('  test@example.com  ')).toBe(true)
    })

    it('should return false for empty string', () => {
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('validateRequestSize', () => {
    it('should return true if content-length is null', () => {
      expect(validateRequestSize(null, 1000)).toBe(true)
    })

    it('should return true if size is within limit', () => {
      expect(validateRequestSize('500', 1000)).toBe(true)
    })

    it('should return true if size equals limit', () => {
      expect(validateRequestSize('1000', 1000)).toBe(true)
    })

    it('should return false if size exceeds limit', () => {
      expect(validateRequestSize('1500', 1000)).toBe(false)
    })

    it('should return false for invalid content-length (NaN)', () => {
      // NaN size means invalid, so should return false
      expect(validateRequestSize('invalid', 1000)).toBe(false)
    })

    it('should handle large numbers', () => {
      expect(validateRequestSize('10485760', 10485760)).toBe(true) // 10MB
    })

    it('should return false for zero limit', () => {
      expect(validateRequestSize('1', 0)).toBe(false)
    })
  })
})
