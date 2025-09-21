import NextAuth, { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import { verifyPassword, hashPassword } from './passwords'
import { signInSchema, signUpSchema } from './validations'
import { PrismaAdapter } from '@auth/prisma-adapter'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'hidden' }, // 'signin' or 'signup'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password')
        }

        const action = credentials.action || 'signin'

        try {
          if (action === 'signup') {
            // Validate signup input
            const validatedData = signUpSchema.parse({
              email: credentials.email,
              password: credentials.password,
            })

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
              where: { email: validatedData.email },
            })

            if (existingUser) {
              throw new Error('User with this email already exists')
            }

            // Create new user
            const hashedPassword = await hashPassword(validatedData.password)
            const newUser = await prisma.user.create({
              data: {
                email: validatedData.email,
                passwordHash: hashedPassword,
              },
            })

            return {
              id: newUser.id,
              email: newUser.email,
            }
          } else {
            // Sign in flow
            const validatedData = signInSchema.parse({
              email: credentials.email,
              password: credentials.password,
            })

            // Find user by email
            const user = await prisma.user.findUnique({
              where: { email: validatedData.email },
            })

            if (!user) {
              throw new Error('No user found with this email address')
            }

            // Verify password
            const isPasswordValid = await verifyPassword(
              validatedData.password,
              user.passwordHash
            )

            if (!isPasswordValid) {
              throw new Error('Invalid password')
            }

            return {
              id: user.id,
              email: user.email,
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(error.message)
          }
          throw new Error('Authentication failed')
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
}

// For NextAuth v4, use getServerSession instead of auth()
export const auth = () => getServerSession(authOptions)

export default NextAuth(authOptions)