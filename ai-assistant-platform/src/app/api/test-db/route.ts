/**
 * Database Connection Test API Route
 * Tests if Supabase connection works
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const startTime = Date.now();
  const logs: string[] = [];

  const log = (msg: string) => {
    const elapsed = Date.now() - startTime;
    const entry = `[${elapsed}ms] ${msg}`;
    logs.push(entry);
    console.log('DB Test:', entry);
  };

  log('Starting database test...');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    log('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set');
    return NextResponse.json({
      status: 'error',
      error: 'NEXT_PUBLIC_SUPABASE_URL is not set',
      logs,
    }, { status: 500 });
  }

  if (!serviceRoleKey) {
    log('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json({
      status: 'error',
      error: 'SUPABASE_SERVICE_ROLE_KEY is not set',
      logs,
    }, { status: 500 });
  }

  log('Environment variables OK');
  log(`Supabase URL: ${supabaseUrl.substring(0, 30)}...`);

  // Create client
  log('Creating Supabase client...');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  log('Supabase client created');

  // Test query
  log('Executing test query...');
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1);

    if (error) {
      log(`Query error: ${error.message}`);
      return NextResponse.json({
        status: 'error',
        error: error.message,
        logs,
      }, { status: 500 });
    }

    log(`Query successful, got ${data?.length || 0} rows`);

    return NextResponse.json({
      status: 'ok',
      data: data,
      totalTime: `${Date.now() - startTime}ms`,
      logs,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log(`Exception: ${errorMsg}`);
    return NextResponse.json({
      status: 'error',
      error: errorMsg,
      logs,
    }, { status: 500 });
  }
}
