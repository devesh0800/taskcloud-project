import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('Connecting to Neon PostgreSQL...');
    const result = await prisma.$queryRaw<Array<{ version: string; current_database: string }>>`
      SELECT version(), current_database();
    `;

    console.log('✅ Connection to Neon PostgreSQL successful!');
    console.log(`Database name: ${result[0]?.current_database}`);
    console.log(`PostgreSQL Engine: ${result[0]?.version?.split(' ')[0]} ${result[0]?.version?.split(' ')[1]}`);

    // Check existing tables
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log(`\nExisting tables in public schema (${tables.length}):`);
    if (tables.length === 0) {
      console.log('  (No tables exist yet. Ready for migrations.)');
    } else {
      tables.forEach((t) => console.log(`  - ${t.table_name}`));
    }
  } catch (err: any) {
    console.error('❌ Database connection failed:');
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
