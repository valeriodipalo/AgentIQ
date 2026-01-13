/**
 * Session Management
 * Handles user sessions using localStorage
 */

export const SESSION_KEY = 'agent_iq_session';

export interface UserSession {
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    branding: {
      primary_color?: string;
      logo_url?: string;
    } | null;
  };
  token: string;
  created_at: string;
  last_active: string;
}

/**
 * Get the current session from localStorage
 */
export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as UserSession;

    // Update last active time
    session.last_active = new Date().toISOString();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return session;
  } catch (error) {
    console.error('Error reading session:', error);
    return null;
  }
}

/**
 * Save a new session to localStorage
 */
export function saveSession(session: UserSession): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

/**
 * Clear the current session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Check if user has a valid session
 */
export function hasSession(): boolean {
  return getSession() !== null;
}

/**
 * Generate a simple session token
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
