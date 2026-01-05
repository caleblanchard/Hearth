# Code Review: HouseholdERP

**Date:** 2026-01-05  
**Reviewer:** AI Code Review  
**Scope:** Full codebase review for bugs, security, and performance concerns

**Status:** ✅ **FIXES APPLIED** - See `FIXES_APPLIED.md` for details on all fixes implemented.

---

## Executive Summary

This codebase is a well-structured Next.js application with Prisma ORM for a household management system. The application follows good practices in many areas, but there are several security, performance, and bug concerns that should be addressed before production deployment.

**Overall Assessment:**
- **Security:** ⚠️ Medium Risk - Several security concerns identified
- **Performance:** ⚠️ Medium Risk - Some performance bottlenecks
- **Code Quality:** ✅ Good - Well-structured with good patterns
- **Testing:** ✅ Good - Comprehensive test coverage

---

## 🔒 Security Issues

### Critical

#### 1. In-Memory Rate Limiting (Multi-Instance Deployment)
**Location:** `lib/rate-limit.ts`

**Issue:** The rate limiter uses an in-memory `Map` which won't work correctly in multi-instance deployments (Docker, Kubernetes, load balancers). Each instance maintains its own counter, allowing attackers to bypass rate limits by hitting different instances.

```typescript
private store: Map<string, RateLimitEntry> = new Map();
```

**Impact:** Rate limiting can be bypassed, leading to potential DoS attacks or brute force attempts.

**Recommendation:**
- Use a distributed rate limiter like `@upstash/ratelimit` with Redis
- Or implement a database-backed rate limiter
- The comment in the code acknowledges this but it should be prioritized

**Priority:** 🔴 High

---

#### 2. Static Salt in Token Encryption
**Location:** `lib/token-encryption.ts:17`

**Issue:** The encryption uses a static salt for PBKDF2 key derivation:
```typescript
const SALT = 'calendar-tokens'; // Static salt for key derivation
```

**Impact:** While PBKDF2 with a static salt is better than no salt, using a static salt reduces security. If the salt is compromised, all encrypted tokens become vulnerable.

**Recommendation:**
- Store salt in environment variable or database
- Consider using a per-token salt stored with the encrypted data
- Or use a key derivation function that doesn't require salt storage

**Priority:** 🟡 Medium

---

#### 3. Health Endpoint Error Exposure
**Location:** `app/api/health/route.ts:39`

**Issue:** The health check endpoint exposes error messages to unauthenticated users:
```typescript
error: error instanceof Error ? error.message : 'Unknown error',
```

**Impact:** Database connection errors, configuration issues, or other sensitive information could be leaked to attackers.

**Recommendation:**
- Only return generic error messages in production
- Log detailed errors server-side
- Consider requiring authentication or IP whitelist for health checks

**Priority:** 🟡 Medium

---

#### 4. Missing CSRF Protection
**Location:** Throughout API routes

**Issue:** No explicit CSRF protection is implemented. While Next.js has some built-in CSRF protection, it's not explicitly configured or verified.

**Impact:** Cross-site request forgery attacks could allow malicious sites to perform actions on behalf of authenticated users.

**Recommendation:**
- Verify Next.js CSRF protection is enabled
- Consider adding explicit CSRF tokens for state-changing operations
- Use SameSite cookies for additional protection

**Priority:** 🟡 Medium

---

### High Priority

#### 5. Excessive Console Logging
**Location:** Throughout codebase (484 matches across 191 files)

**Issue:** Extensive use of `console.log`, `console.error`, etc. throughout the codebase. In production, these can:
- Leak sensitive information
- Impact performance
- Fill up logs with unnecessary data

**Impact:** 
- Potential information disclosure
- Performance degradation
- Log storage costs

**Recommendation:**
- Use a proper logging library (e.g., `winston`, `pino`) with log levels
- Remove or replace all `console.*` calls
- Implement structured logging with sanitization
- Only log errors and warnings in production

**Priority:** 🟡 Medium

**Example locations:**
- `app/api/chores/route.ts:55, 210`
- `app/api/screentime/log/route.ts:201`
- `app/api/documents/[id]/share/route.ts:82, 128`

---

#### 6. Missing Environment Variable Validation
**Location:** Application startup

**Issue:** No validation that required environment variables are set at startup. Missing variables could cause runtime errors or security issues.

**Impact:** Application could start with misconfigured security settings, leading to vulnerabilities.

**Recommendation:**
- Add environment variable validation on startup using a library like `zod` or `envalid`
- Fail fast if required variables are missing
- Document all required environment variables

**Priority:** 🟡 Medium

---

#### 7. Request Size Validation Inconsistency
**Location:** `middleware.ts:80-94`

**Issue:** Request size validation only checks `content-length` header, which can be:
- Missing (chunked transfers)
- Spoofed by clients
- Not accurate for compressed content

**Impact:** Large request bodies could still be processed, leading to DoS or memory exhaustion.

**Recommendation:**
- Implement actual body size checking after parsing
- Set limits on JSON parsing
- Consider streaming for large file uploads
- Add timeout handling for slow requests

**Priority:** 🟡 Medium

---

#### 8. Missing Input Sanitization
**Location:** Various API routes

**Issue:** User input is validated but not always sanitized. While Prisma provides some protection against SQL injection, XSS could still occur if data is rendered in HTML.

**Impact:** Cross-site scripting (XSS) attacks if user input is rendered without sanitization.

**Recommendation:**
- Sanitize all user input before storing
- Use libraries like `DOMPurify` for HTML content
- Escape output in React components (React does this by default, but verify)
- Validate and sanitize file uploads

**Priority:** 🟡 Medium

---

#### 9. Token Storage in Database
**Location:** `prisma/schema.prisma:873-874`

**Issue:** OAuth tokens are stored encrypted in the database, but the encryption key (`NEXTAUTH_SECRET`) is the same for all tokens. If the secret is compromised, all tokens are at risk.

**Impact:** If encryption key is compromised, all stored OAuth tokens could be decrypted.

**Recommendation:**
- Consider using a key management service (KMS) for encryption keys
- Implement key rotation strategy
- Use separate keys for different purposes
- Consider not storing refresh tokens (use them immediately to get new access tokens)

**Priority:** 🟢 Low (but important for production)

---

#### 10. Missing Authorization Checks in Some Routes
**Location:** Various API routes

**Issue:** While most routes check authentication, some may not verify that the user has permission to access the specific resource (e.g., family membership verification).

**Example:** In `app/api/documents/[id]/share/route.ts`, family ownership is checked, but this pattern should be verified across all routes.

**Impact:** Users might access resources from other families if authorization checks are missing.

**Recommendation:**
- Audit all API routes to ensure family membership is verified
- Create a helper function for family authorization checks
- Add integration tests for authorization scenarios

**Priority:** 🟡 Medium

---

## ⚡ Performance Issues

### Critical

#### 1. N+1 Query Problems
**Location:** Multiple API routes

**Issue:** Many routes use nested `include` statements which can lead to N+1 queries, especially with large datasets.

**Example:** `app/api/chores/route.ts:13-51` includes nested relations that could cause multiple queries.

**Impact:** Slow response times, database load, potential timeouts.

**Recommendation:**
- Review all queries with nested includes
- Use `select` to limit fields returned
- Consider pagination for large result sets
- Use database query analysis tools to identify N+1 queries
- Consider using Prisma's `select` with explicit field selection

**Priority:** 🟡 Medium

---

#### 2. Missing Database Indexes
**Location:** `prisma/schema.prisma`

**Issue:** While many indexes exist, some common query patterns might not be optimized. For example:
- Composite indexes for common filter combinations
- Indexes on foreign keys used in joins
- Indexes on frequently sorted fields

**Impact:** Slow queries, especially as data grows.

**Recommendation:**
- Analyze query patterns and add composite indexes
- Review all foreign key relationships for index coverage
- Use database query analysis to identify missing indexes
- Consider partial indexes for filtered queries

**Priority:** 🟡 Medium

---

#### 3. No Response Pagination
**Location:** Many GET endpoints

**Issue:** Many endpoints return all results without pagination (e.g., `app/api/chores/route.ts`). As data grows, this will cause:
- Slow responses
- High memory usage
- Network timeouts

**Impact:** Poor performance, potential crashes with large datasets.

**Recommendation:**
- Implement pagination for all list endpoints
- Use cursor-based pagination for better performance
- Set reasonable default limits
- Add `totalCount` for UI pagination controls

**Priority:** 🟡 Medium

---

#### 4. In-Memory Rate Limiter Memory Leak Potential
**Location:** `lib/rate-limit.ts:23-25`

**Issue:** While cleanup is implemented, the cleanup interval (60 seconds) might not be frequent enough for high-traffic scenarios, and the Map could grow large.

**Impact:** Memory usage could grow over time, especially with many unique IP addresses.

**Recommendation:**
- Reduce cleanup interval for high-traffic scenarios
- Add maximum size limit to the Map
- Use LRU cache instead of Map
- Move to distributed rate limiting (addresses both performance and security)

**Priority:** 🟢 Low (if moving to distributed solution)

---

#### 5. Missing Connection Pool Configuration
**Location:** `lib/prisma.ts:17-21`

**Issue:** PostgreSQL connection pool is created without explicit limits:
```typescript
new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

**Impact:** Could exhaust database connections under load.

**Recommendation:**
- Configure connection pool limits:
  ```typescript
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  ```
- Monitor connection usage
- Set appropriate limits based on database capacity

**Priority:** 🟡 Medium

---

#### 6. Large JSON Responses
**Location:** Various endpoints

**Issue:** Some endpoints return large JSON objects without compression or streaming.

**Impact:** High bandwidth usage, slow responses, potential timeouts.

**Recommendation:**
- Enable gzip compression in Next.js
- Consider streaming for very large responses
- Implement response caching where appropriate
- Use GraphQL or field selection to limit response size

**Priority:** 🟢 Low

---

#### 7. No Caching Strategy
**Location:** Throughout application

**Issue:** No caching strategy is implemented for:
- Database queries
- API responses
- Static data

**Impact:** Unnecessary database load, slow responses.

**Recommendation:**
- Implement Redis caching for frequently accessed data
- Cache dashboard widgets
- Cache user sessions
- Use HTTP caching headers where appropriate
- Consider Next.js ISR (Incremental Static Regeneration) for static content

**Priority:** 🟢 Low (but important for scale)

---

## 🐛 Bugs and Code Quality Issues

### Critical

#### 1. Missing Error Handling in Transactions
**Location:** Various routes using `prisma.$transaction`

**Issue:** Transactions might not properly roll back on errors, or errors might be swallowed.

**Example:** `app/api/chores/route.ts:142-202` uses transactions but error handling might not be complete.

**Impact:** Data inconsistency, partial updates.

**Recommendation:**
- Ensure all transaction errors are caught and handled
- Verify rollback behavior
- Add transaction timeout handling
- Test error scenarios

**Priority:** 🟡 Medium

---

#### 2. Race Condition in Screen Time Logging
**Location:** `app/api/screentime/log/route.ts`

**Issue:** The screen time logging checks allowance and then updates balance. Between these operations, another request could modify the balance, leading to incorrect calculations.

**Impact:** Users could exceed allowances, incorrect balance tracking.

**Recommendation:**
- Use database transactions with proper isolation levels
- Use optimistic locking (version fields)
- Implement database-level constraints
- Consider using database functions for atomic operations

**Priority:** 🟡 Medium

---

#### 3. Missing Null Checks
**Location:** Throughout codebase

**Issue:** Some code accesses properties without null checks, especially in optional fields.

**Example:** `app/api/screentime/log/route.ts:131` uses dynamic import which could fail.

**Impact:** Runtime errors, application crashes.

**Recommendation:**
- Add null/undefined checks for optional fields
- Use optional chaining (`?.`) where appropriate
- Use TypeScript strict null checks
- Add runtime validation

**Priority:** 🟢 Low (TypeScript helps, but runtime checks needed)

---

#### 4. Date Handling Issues
**Location:** Various routes

**Issue:** Date parsing and timezone handling might be inconsistent. For example, `app/api/screentime/log/route.ts:41` creates dates that might not handle timezones correctly.

**Impact:** Incorrect date calculations, timezone-related bugs.

**Recommendation:**
- Use a consistent date library (e.g., `date-fns-tz`)
- Store all dates in UTC
- Validate timezone handling
- Test with different timezones

**Priority:** 🟢 Low

---

#### 5. Missing Input Validation
**Location:** Some API routes

**Issue:** While many routes validate input, some might be missing validation for:
- Type checking
- Range validation
- Format validation (emails, URLs, etc.)

**Example:** `app/api/chores/route.ts` validates most fields but could use a validation library.

**Impact:** Invalid data in database, potential errors.

**Recommendation:**
- Use a validation library like `zod` or `yup`
- Create reusable validation schemas
- Validate all user input
- Return clear error messages

**Priority:** 🟢 Low (most routes have validation)

---

#### 6. Hardcoded Values
**Location:** Various files

**Issue:** Some values are hardcoded that should be configurable:
- `middleware.ts:8` - Cache TTL (60000ms)
- `lib/rate-limit.ts:103-105` - Rate limit values
- Various timeout values

**Impact:** Difficult to tune performance, not adaptable to different environments.

**Recommendation:**
- Move hardcoded values to environment variables or config
- Document all configurable values
- Use constants file for application-wide values

**Priority:** 🟢 Low

---

#### 7. Missing Type Safety in JSON Fields
**Location:** `prisma/schema.prisma` - Many `Json` type fields

**Issue:** Prisma `Json` fields are typed as `any`, losing type safety. This is used in:
- `AutomationRule.trigger`, `conditions`, `actions`
- `AuditLog.previousValue`, `newValue`, `metadata`
- Various `settings` fields

**Impact:** Runtime errors, difficult to maintain.

**Recommendation:**
- Create TypeScript types for JSON fields
- Use Prisma's `JsonValue` type
- Validate JSON structure at runtime
- Consider separate tables for complex nested data

**Priority:** 🟢 Low (but improves maintainability)

---

## 📋 Recommendations Summary

### Immediate Actions (Before Production)

1. **Replace in-memory rate limiting** with distributed solution (Redis-based)
2. **Remove or replace all console.log statements** with proper logging
3. **Add environment variable validation** on startup
4. **Implement pagination** for all list endpoints
5. **Add database connection pool limits**
6. **Review and fix N+1 query issues**
7. **Add comprehensive error handling** in transactions

### Short-term Improvements

1. **Implement caching strategy** (Redis)
2. **Add missing database indexes** based on query analysis
3. **Fix race conditions** in screen time and credit calculations
4. **Add input sanitization** for XSS prevention
5. **Improve health endpoint** to not expose errors
6. **Add CSRF protection verification**
7. **Implement request body size validation** (not just header)

### Long-term Enhancements

1. **Key management service** for encryption keys
2. **Comprehensive monitoring** and alerting
3. **Performance testing** and optimization
4. **Security audit** by external team
5. **Documentation** for security practices
6. **Incident response plan**

---

## 🔍 Additional Observations

### Positive Aspects

1. ✅ Good use of Prisma ORM (prevents SQL injection)
2. ✅ Authentication and authorization patterns are consistent
3. ✅ TypeScript usage improves type safety
4. ✅ Comprehensive test coverage
5. ✅ Good code organization and structure
6. ✅ Transaction usage for data consistency
7. ✅ Rate limiting implemented (though needs improvement)
8. ✅ Input validation in most routes
9. ✅ Audit logging for important actions
10. ✅ Proper use of environment variables for secrets

### Areas for Improvement

1. ⚠️ Logging strategy needs improvement
2. ⚠️ Error handling could be more consistent
3. ⚠️ Performance optimization needed for scale
4. ⚠️ Security hardening for production
5. ⚠️ Documentation for security practices

---

## 📊 Risk Assessment

| Category | Risk Level | Impact | Likelihood |
|----------|-----------|--------|------------|
| Security - Rate Limiting | High | High | Medium |
| Security - Error Exposure | Medium | Medium | Low |
| Security - CSRF | Medium | Medium | Low |
| Performance - N+1 Queries | Medium | High | High |
| Performance - No Pagination | Medium | High | High |
| Bugs - Race Conditions | Medium | Medium | Medium |
| Bugs - Missing Validation | Low | Low | Low |

---

## 📝 Notes

- This review is based on static code analysis. Dynamic testing and security penetration testing are recommended.
- Some issues may be false positives or may have been addressed in code not reviewed.
- The codebase shows good engineering practices overall.
- Most issues are fixable with reasonable effort.
- Consider implementing a security review process for future changes.

---

**Next Steps:**
1. Prioritize issues based on your risk tolerance
2. Create tickets for each issue
3. Implement fixes following the recommendations
4. Re-review after fixes are implemented
5. Consider external security audit before production launch
