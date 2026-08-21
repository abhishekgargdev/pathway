import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db/connect";
import { User } from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const email = credentials.email.trim().toLowerCase();
        const user = await User.findOne({ email }).exec();
        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!valid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
