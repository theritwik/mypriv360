import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('Database connected successfully!')
    
    // Check if tables exist (this will fail if migrations haven't been run)
    const userCount = await prisma.user.count()
    console.log(`Found ${userCount} users in database`)
    
  } catch (error) {
    console.error('Database connection failed:', error)
    console.log('\nTo fix this, run:')
    console.log('1. npx prisma generate')
    console.log('2. npx prisma db push')
    console.log('3. npx prisma db seed')
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()