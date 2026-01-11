/**
 * Authentication Configuration
 * Handles NextAuth configuration for parent and child login
 * 
 * PARTIALLY MIGRATED TO SUPABASE - January 10, 2026
 * Note: NextAuth Credentials provider still uses direct DB queries
 * This is acceptable as authentication is a critical path that benefits from simplicity
 */

import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { createClient } from './supabase/server';
import { validateGuestSession, type GuestSessionInfo } from './guest-session';

type Role = 'PARENT' | 'CHILD';

export const config = {
  providers: [
    Credentials({
      id: 'parent-login',
      name: 'Parent Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = await createClient();
        
        const { data: member } = await supabase
          .from('family_members')
          .select(`
            *,
            family:families(*)
          `)
          .eq('email', credentials.email as string)
          .single();

        if (!member || !member.password_hash || member.role !== 'PARENT') {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          member.password_hash
        );

        if (!isPasswordValid) {
          return null;
        }

        // Update last login
        await supabase
          .from('family_members')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', member.id);

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          familyId: member.family_id,
          familyName: member.family.name,
        };
      },
    }),
    Credentials({
      id: 'child-pin',
      name: 'Child PIN Login',
      credentials: {
        pin: { label: 'PIN', type: 'password' },
        memberId: { label: 'Member ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.pin || !credentials?.memberId) {
          return null;
        }

        const supabase = await createClient();
        
        const { data: member } = await supabase
          .from('family_members')
          .select(`
            *,
            family:families(*)
          `)
          .eq('id', credentials.memberId as string)
          .single();

        if (!member || !member.pin || member.role !== 'CHILD') {
          return null;
        }

        const isPinValid = await compare(
          credentials.pin as string,
          member.pin
        );

        if (!isPinValid) {
          return null;
        }

        // Update last login
        await supabase
          .from('family_members')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', member.id);

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          familyId: member.family_id,
          familyName: member.family.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.familyId = user.familyId;
        token.familyName = user.familyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.familyId = token.familyId as string;
        session.user.familyName = token.familyName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Trust all hosts (needed for internal IP access)
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

/**
 * Get current session (either NextAuth session or guest session)
 * This is a helper function that checks both authentication methods
 * Note: Named differently from Next.js middleware getSession to avoid conflicts
 */
export async function getAuthSession(
  headers?: Headers
): Promise<
  | { type: 'user'; session: { user: { id: string; role: Role; familyId: string; familyName: string; name: string | null; email: string | null } } | null }
  | { type: 'guest'; session: GuestSessionInfo }
  | { type: 'none' }
> {
  // First try NextAuth session
  const nextAuthSession = await auth();
  if (nextAuthSession?.user) {
    return { type: 'user', session: nextAuthSession as { user: { id: string; role: Role; familyId: string; familyName: string; name: string | null; email: string | null } } };
  }

  // Then try guest session if headers are provided
  if (headers) {
    const guestSessionToken = headers.get('x-guest-session-token');
    if (guestSessionToken) {
      const guestSession = await validateGuestSession(guestSessionToken);
      if (guestSession) {
        return { type: 'guest', session: guestSession };
      }
    }
  }

  return { type: 'none' };
}
