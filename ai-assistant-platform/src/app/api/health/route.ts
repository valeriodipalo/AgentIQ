/**
 * Health Check API Route
 * Simple endpoint to test if serverless functions are working
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();

  // Test 1: Basic response
  console.log('Health check: Starting...');

  // Test 2: Environment variable check
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  console.log('Health check: Environment variables:', envStatus);

  const responseTime = Date.now() - startTime;

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    environment: envStatus,
  });
}
