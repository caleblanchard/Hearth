import { Role } from '@/app/generated/prisma';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      familyId: string;
      familyName: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: Role;
    familyId: string;
    familyName: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    familyId: string;
    familyName: string;
  }
}
