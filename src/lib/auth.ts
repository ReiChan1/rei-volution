import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { company: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.company?.name ?? null,
          jobPosition: user.jobPosition ?? null,
          image: user.profileImage ?? null,
          currency: user.currency ?? "USD",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.companyName = (user as any).companyName;
        token.jobPosition = (user as any).jobPosition;
        token.currency = (user as any).currency;
      }
      // Allows the client to push a fresh currency into the session right
      // after saving it in Settings, via useSession().update({ currency }).
      if (trigger === "update" && session?.currency) {
        token.currency = session.currency;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        (session.user as any).companyName = token.companyName;
        (session.user as any).jobPosition = token.jobPosition;
        (session.user as any).currency = token.currency ?? "USD";
      }
      return session;
    },
  },
});
