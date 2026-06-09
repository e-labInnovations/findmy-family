// Prisma 7 config — supplies the database URL to migration commands
// (`prisma migrate`, `prisma db push`). The runtime client uses a
// driver adapter (see src/lib/db.ts), not this config.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
