import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'tenant_events' 
    AND table_name = 'events'
    ORDER BY ordinal_position;
  `;
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => prisma.$disconnect());
