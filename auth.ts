import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyUser } from "@/lib/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await verifyUser(
          credentials.username as string,
          credentials.password as string
        );
        return user ?? null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      return session;
    },
  },
});
