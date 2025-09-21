import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const dataCategories = [
  {
    key: 'health',
    name: 'Health & Medical Data',
  },
  {
    key: 'financial',
    name: 'Financial Information',
  },
  {
    key: 'location',
    name: 'Location & Movement Data',
  },
  {
    key: 'marketing',
    name: 'Marketing & Preferences',
  },
]

export async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Upsert data categories
    for (const category of dataCategories) {
      await prisma.dataCategory.upsert({
        where: { key: category.key },
        update: {
          name: category.name,
        },
        create: {
          key: category.key,
          name: category.name,
        },
      })
      console.log(`✅ Upserted data category: ${category.key} - ${category.name}`)
    }

    console.log('🎉 Database seed completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✨ Seed script finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seed script failed:', error)
      process.exit(1)
    })
}