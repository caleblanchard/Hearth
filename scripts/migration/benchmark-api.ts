#!/usr/bin/env tsx
/**
 * Performance Benchmark Script
 * 
 * Measures baseline API performance before Supabase migration.
 * Run with: npx tsx scripts/migration/benchmark-api.ts
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  endpoint: string;
  method: string;
  iterations: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  errors: number;
}

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Critical endpoints to benchmark
const ENDPOINTS = [
  { method: 'GET', path: '/api/families', auth: true },
  { method: 'GET', path: '/api/chores', auth: true },
  { method: 'GET', path: '/api/meals/plans', auth: true },
  { method: 'GET', path: '/api/calendar', auth: true },
  { method: 'GET', path: '/api/routines', auth: true },
  { method: 'GET', path: '/api/dashboard/layout', auth: true },
  { method: 'GET', path: '/api/health', auth: false },
];

async function benchmarkEndpoint(
  method: string,
  url: string,
  iterations: number = 50,
  authHeaders: Record<string, string> = {}
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let errors = 0;

  console.log(`Benchmarking ${method} ${url}...`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    try {
      const response = await fetch(url, {
        method,
        headers: authHeaders,
      });
      
      const end = performance.now();
      
      if (!response.ok && response.status !== 401) {
        // 401 is expected if not logged in, don't count as error
        if (response.status !== 404) { // Also ignore 404 for missing resources
          errors++;
        }
      }
      
      latencies.push(end - start);
    } catch (error) {
      const end = performance.now();
      errors++;
      latencies.push(end - start); // Still record latency even on error
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  latencies.sort((a, b) => a - b);

  return {
    endpoint: url,
    method,
    iterations,
    latencies,
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95: latencies[Math.floor(latencies.length * 0.95)],
    p99: latencies[Math.floor(latencies.length * 0.99)],
    avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    min: latencies[0],
    max: latencies[latencies.length - 1],
    errors,
  };
}

function formatResult(result: BenchmarkResult): string {
  return `
${result.method} ${result.endpoint}
  Iterations: ${result.iterations}
  p50: ${result.p50.toFixed(2)}ms
  p95: ${result.p95.toFixed(2)}ms
  p99: ${result.p99.toFixed(2)}ms
  avg: ${result.avg.toFixed(2)}ms
  min: ${result.min.toFixed(2)}ms
  max: ${result.max.toFixed(2)}ms
  errors: ${result.errors}/${result.iterations}
`;
}

async function main() {
  console.log('==========================================');
  console.log('Hearth API Performance Benchmark');
  console.log('==========================================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  console.log('⚠️  NOTE: This benchmark runs without authentication.');
  console.log('   Some endpoints will return 401, which is expected.');
  console.log('   The purpose is to measure base API response times.\n');

  const results: BenchmarkResult[] = [];

  for (const endpoint of ENDPOINTS) {
    const url = `${BASE_URL}${endpoint.path}`;
    const result = await benchmarkEndpoint(endpoint.method, url);
    results.push(result);
    console.log(formatResult(result));
  }

  // Summary
  console.log('\n==========================================');
  console.log('Summary');
  console.log('==========================================\n');

  const avgP95 = results.reduce((sum, r) => sum + r.p95, 0) / results.length;
  const avgP99 = results.reduce((sum, r) => sum + r.p99, 0) / results.length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalRequests = results.reduce((sum, r) => sum + r.iterations, 0);

  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Average p95 Latency: ${avgP95.toFixed(2)}ms`);
  console.log(`Average p99 Latency: ${avgP99.toFixed(2)}ms\n`);

  // Write results to file
  const output = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    framework: 'Prisma + NextAuth (pre-migration)',
    results: results.map(r => ({
      endpoint: r.endpoint,
      method: r.method,
      p50: r.p50,
      p95: r.p95,
      p99: r.p99,
      avg: r.avg,
      errors: r.errors,
      iterations: r.iterations,
    })),
    summary: {
      totalEndpoints: results.length,
      totalRequests,
      totalErrors,
      avgP95,
      avgP99,
    },
  };

  const fs = require('fs');
  fs.writeFileSync(
    'backups/baseline-performance.json',
    JSON.stringify(output, null, 2)
  );

  console.log('Results saved to: backups/baseline-performance.json');
  console.log('\n✅ Benchmark complete!\n');
}

main().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
