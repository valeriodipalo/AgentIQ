/**
 * Supabase Browser Client
 * For use in Client Components (browser-side)
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for browser-side usage
 * This client uses cookies for session management
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Singleton pattern for browser client
 * Prevents multiple client instances in the browser
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error(
      'getSupabaseClient() should only be called in browser context. ' +
      'Use createServerClient() for server-side operations.'
    );
  }

  if (!browserClient) {
    browserClient = createClient();
  }

  return browserClient;
}

// Type alias for convenience
export type SupabaseBrowserClient = ReturnType<typeof createClient>;
