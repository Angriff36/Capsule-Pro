import "server-only";

import { auth } from "@repo/auth/server";
import { Prisma, database } from "@repo/database";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
};

const ensurePlatformAccount = async (tenant: TenantRow) => {
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO platform.accounts (id, name, slug)
      VALUES (${tenant.id}, ${tenant.name}, ${tenant.slug})
      ON CONFLICT (slug) DO NOTHING
    `,
  );
};

export const getTenantIdForOrg = async (orgId: string): Promise<string> => {
  const [account] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM platform.accounts
      WHERE slug = ${orgId}
        AND deleted_at IS NULL
      LIMIT 1
    `,
  );

  const tenant = await database.tenant.upsert({
    where: {
      slug: orgId,
    },
    update: {
      name: orgId,
    },
    create: {
      id: account?.id,
      name: orgId,
      slug: orgId,
    },
  });

  if (!account?.id) {
    await ensurePlatformAccount(tenant);
  }

  return tenant.id;
};

export const requireTenantId = async (): Promise<string> => {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  return getTenantIdForOrg(orgId);
};
