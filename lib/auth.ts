import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      // Scaffolds a token directly on the user resource during OAuth,
      // avoiding extra requests. GitHub returns enough in one call.
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist GitHub access token in the JWT so we can call the
      // GitHub API as the logged-in user (BYOK publish flow).
      if (account) {
        token.accessToken = account.access_token;
        token.username = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.user = {
        ...session.user,
        name: session.user?.name ?? (token.username as string | undefined),
      };
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};