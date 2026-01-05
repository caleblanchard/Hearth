/**
 * Redis-based Rate Limiter
 * 
 * Distributed rate limiter using Redis for multi-instance deployments.
 * Falls back to in-memory rate limiter if Redis is not available.
 */

import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// In-memory fallback rate limiter
class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  public readonly maxRequests: number;
  public readonly windowMs: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.windowMs;
      this.store.set(identifier, {
        count: 1,
        resetTime,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    this.store.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.store.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.store.delete(key));
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Redis-based rate limiter
class RedisRateLimiter {
  private redis: any;
  private maxRequests: number;
  private windowMs: number;
  private isConnected: boolean = false;

  constructor(redis: any, windowMs: number, maxRequests: number) {
    this.redis = redis;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async check(identifier: string): Promise<RateLimitResult> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current entries
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(this.windowMs / 1000));
      
      const results = await pipeline.exec();
      const count = results[1][1] as number;
      const resetTime = now + this.windowMs;

      if (count >= this.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }

      return {
        allowed: true,
        remaining: this.maxRequests - count - 1,
        resetTime,
      };
    } catch (error) {
      logger.error('Redis rate limit check failed', error);
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }
  }

  setConnected(connected: boolean): void {
    this.isConnected = connected;
  }
}

// Hybrid rate limiter that uses Redis if available, falls back to in-memory
class HybridRateLimiter {
  private redisLimiter: RedisRateLimiter | null = null;
  private memoryLimiter: InMemoryRateLimiter;
  private useRedis: boolean = false;
  public readonly maxRequests: number;
  public readonly windowMs: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.memoryLimiter = new InMemoryRateLimiter(windowMs, maxRequests);
    
    // Try to initialize Redis
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('REDIS_URL not set, using in-memory rate limiting');
      return;
    }

    try {
      // Dynamic import to avoid requiring redis in all environments
      // If ioredis is not installed, this will fail gracefully
      let redis;
      try {
        redis = await import('ioredis');
      } catch (importError) {
        logger.warn('ioredis not installed, using in-memory rate limiting only');
        return;
      }
      const Redis = redis.default || redis;
      
      const client = new Redis(redisUrl, {
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 retries, falling back to in-memory rate limiting');
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      client.on('error', (error) => {
        logger.error('Redis connection error', error);
        this.useRedis = false;
      });

      client.on('connect', () => {
        logger.info('Redis connected for rate limiting');
        this.useRedis = true;
        if (this.redisLimiter) {
          this.redisLimiter.setConnected(true);
        }
      });

      await client.connect();
      
      this.redisLimiter = new RedisRateLimiter(client, this.windowMs, this.maxRequests);
      this.redisLimiter.setConnected(true);
      this.useRedis = true;
      
      logger.info('Using Redis for distributed rate limiting');
    } catch (error) {
      logger.warn('Failed to initialize Redis, using in-memory rate limiting', error);
      this.useRedis = false;
    }
  }

  async check(identifier: string): Promise<RateLimitResult> {
    if (this.useRedis && this.redisLimiter) {
      try {
        return await this.redisLimiter.check(identifier);
      } catch (error) {
        logger.warn('Redis rate limit check failed, falling back to memory', error);
        this.useRedis = false;
      }
    }
    
    // Fallback to in-memory
    return this.memoryLimiter.check(identifier);
  }

  destroy(): void {
    this.memoryLimiter.destroy();
    // Redis client cleanup would be handled by the ioredis library
  }
}

// Create rate limiters for different endpoint types
export const apiRateLimiter = new HybridRateLimiter(60000, 100); // 100 requests per minute
export const authRateLimiter = new HybridRateLimiter(60000, 5); // 5 requests per minute for auth
export const cronRateLimiter = new HybridRateLimiter(60000, 10); // 10 requests per minute for cron

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (set by proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  
  return ip;
}
