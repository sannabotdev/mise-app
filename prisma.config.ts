import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prisma CLI should use the same env file as Next.js local dev.
dotenv.config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Pooler-URL für den Prisma Client (pgBouncer-kompatibel)
    url: process.env.DATABASE_URL!,
  },
})
