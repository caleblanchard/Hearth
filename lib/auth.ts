import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import prisma from './prisma';
import { Role } from '@/app/generated/prisma';
import { validateGuestSession, type GuestSessionInfo } from './guest-session';

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

        const member = await prisma.familyMember.findUnique({
          where: { email: credentials.email as string },
          include: { family: true },
        });

        if (!member || !member.passwordHash || member.role !== Role.PARENT) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          member.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        // Update last login
        await prisma.familyMember.update({
          where: { id: member.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          familyId: member.familyId,
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

        const member = await prisma.familyMember.findUnique({
          where: { id: credentials.memberId as string },
          include: { family: true },
        });

        if (!member || !member.pin || member.role !== Role.CHILD) {
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
        await prisma.familyMember.update({
          where: { id: member.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          familyId: member.familyId,
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
 */
export async function getSession(
  headers?: Headers
): Promise<
  | { type: 'user'; session: Awaited<ReturnType<typeof auth>> }
  | { type: 'guest'; session: GuestSessionInfo }
  | { type: 'none' }
> {
  // First try NextAuth session
  const nextAuthSession = await auth();
  if (nextAuthSession?.user) {
    return { type: 'user', session: nextAuthSession };
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
