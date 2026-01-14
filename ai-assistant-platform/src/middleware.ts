/**
 * Next.js Middleware
 *
 * Note: This app uses localStorage sessions, NOT Supabase Auth.
 * The middleware simply passes through all requests without auth checking.
 * Authentication is handled at the API route level using session tokens.
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // This app uses localStorage sessions, NOT Supabase Auth.
  // The previous auth.getUser() call was hanging indefinitely because
  // there's no Supabase Auth session configured.
  // Simply pass through all requests without auth checking.
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
