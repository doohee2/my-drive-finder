import NextAuth, { type DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user: {
      // Add any custom fields here if needed
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 1. Initial sign in
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        return token
      }

      // 2. Return previous token if the access token has not expired yet
      // token.expiresAt is in seconds, Date.now() is in milliseconds.
      // We give a 1-minute (60,000 ms) buffer.
      if (Date.now() < (token.expiresAt as number) * 1000 - 60000) {
        return token
      }

      // 3. Access token has expired, try to update it
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        })

        const tokens = await response.json()

        if (!response.ok) throw tokens

        return {
          ...token,
          accessToken: tokens.access_token,
          // expires_in is usually 3599 (1 hour). We add it to the current time.
          expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
          // Fall back to old refresh token
          refreshToken: tokens.refresh_token ?? token.refreshToken,
        }
      } catch (error) {
        console.error("Error refreshing access token", error)
        return { ...token, error: "RefreshAccessTokenError" }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.error = token.error as string | undefined
      return session
    },
  },
})
