import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Prisma, PrismaClient } from "@repo/database/generated/client";
import ws from "ws";

type AccountRecord = {
  id: string;
  slug: string;
  name: string;
};

const invariant = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const optionalEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined) return undefined;
  invariant(value.trim().length > 0, `${key} must not be empty`);
  return value;
};

const decimal = (value: number) => new Prisma.Decimal(value);

const databaseUrl = optionalEnv("DATABASE_URL");
invariant(databaseUrl, "DATABASE_URL must be set for seeding");

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const resolveAccount = async (): Promise<AccountRecord> => {
  const seedTenantId = optionalEnv("SEED_TENANT_ID");
  const seedTenantSlug =
    optionalEnv("SEED_TENANT_SLUG") ??
    optionalEnv("SEED_ORG_ID") ??
    optionalEnv("SEED_ORG_SLUG");

  if (seedTenantId) {
    const account = await prisma.account.findUnique({
      where: { id: seedTenantId },
    });
    invariant(
      account,
      `No account found for SEED_TENANT_ID=${seedTenantId}`
    );
    return {
      id: account.id,
      slug: account.slug,
      name: account.name,
    };
  }

  if (seedTenantSlug) {
    const account = await prisma.account.upsert({
      where: { slug: seedTenantSlug },
      update: {},
      create: {
        name: seedTenantSlug,
        slug: seedTenantSlug,
      },
    });
    return {
      id: account.id,
      slug: account.slug,
      name: account.name,
    };
  }

  const accounts = await prisma.account.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (accounts.length === 1) {
    return {
      id: accounts[0].id,
      slug: accounts[0].slug,
      name: accounts[0].name,
    };
  }

  if (accounts.length === 0) {
    const account = await prisma.account.create({
      data: {
        name: "Seed Org",
        slug: "seed-org",
      },
    });
    return {
      id: account.id,
      slug: account.slug,
      name: account.name,
    };
  }

  throw new Error(
    "Multiple accounts exist. Set SEED_TENANT_SLUG or SEED_TENANT_ID to choose one."
  );
};

const ensureLocation = async (tenantId: string) => {
  const existing = await prisma.location.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.location.create({
    data: {
      tenantId,
      name: "Main Kitchen",
      addressLine1: "123 Prep Way",
      city: "Chicago",
      stateProvince: "IL",
      postalCode: "60601",
      countryCode: "US",
      timezone: "America/Chicago",
      isPrimary: true,
    },
  });
};

const ensureUsers = async (tenantId: string) => {
  const existing = await prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  if (existing.length >= 2) return existing;

  const seedUsers = [
    {
      tenantId,
      email: "alex.manager@seed.local",
      firstName: "Alex",
      lastName: "Rivera",
      role: "manager",
      hourlyRate: decimal(32.5),
    },
    {
      tenantId,
      email: "jordan.chef@seed.local",
      firstName: "Jordan",
      lastName: "Lee",
      role: "staff",
      hourlyRate: decimal(24.75),
    },
  ];

  const created = [];
  for (const user of seedUsers) {
    const existingUser = await prisma.user.findFirst({
      where: { tenantId, email: user.email, deletedAt: null },
    });
    if (existingUser) {
      created.push(existingUser);
      continue;
    }
    created.push(await prisma.user.create({ data: user }));
  }

  return [...existing, ...created].slice(0, 3);
};

const ensureClient = async (tenantId: string) => {
  const existing = await prisma.client.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.client.create({
    data: {
      tenantId,
      clientType: "company",
      company_name: "Seeded Hospitality Group",
      email: "hello@seeded-hospitality.local",
      phone: "312-555-0199",
      tags: ["seed"],
      source: "seed",
    },
  });
};

const ensureEvents = async (
  tenantId: string,
  clientId: string,
  locationId: string
) => {
  const existing = await prisma.event.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    take: 2,
  });
  if (existing.length > 0) return existing;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);

  const eventOne = await prisma.event.create({
    data: {
      tenantId,
      title: "Seeded Gala Dinner",
      eventType: "catering",
      eventDate: nextWeek,
      guestCount: 120,
      status: "confirmed",
      tags: ["seed", "gala"],
      clientId,
      locationId,
      venueName: "Harbor Loft",
      venueAddress: "500 Lakeshore Dr",
    },
  });

  const eventTwo = await prisma.event.create({
    data: {
      tenantId,
      title: "Seeded Team Lunch",
      eventType: "onsite",
      eventDate: inThreeDays,
      guestCount: 45,
      status: "tentative",
      tags: ["seed", "lunch"],
      clientId,
      locationId,
      venueName: "Downtown Studio",
      venueAddress: "22 Wacker Dr",
    },
  });

  return [eventOne, eventTwo];
};

const ensureEventProfitability = async (
  tenantId: string,
  events: Array<{ id: string }>
) => {
  const existing = await prisma.eventProfitability.count({
    where: { tenantId },
  });
  if (existing > 0) return;

  await prisma.eventProfitability.createMany({
    data: events.map((event, index) => ({
      tenantId,
      eventId: event.id,
      budgetedRevenue: decimal(index === 0 ? 85000 : 24000),
      actualRevenue: decimal(index === 0 ? 91000 : 21000),
      budgetedFoodCost: decimal(index === 0 ? 22000 : 6000),
      actualFoodCost: decimal(index === 0 ? 23500 : 5800),
      budgetedLaborCost: decimal(index === 0 ? 15000 : 4500),
      actualLaborCost: decimal(index === 0 ? 16500 : 4200),
      budgetedOverhead: decimal(index === 0 ? 8000 : 2000),
      actualOverhead: decimal(index === 0 ? 7500 : 1800),
      budgetedTotalCost: decimal(index === 0 ? 45000 : 12500),
      actualTotalCost: decimal(index === 0 ? 47800 : 11800),
      budgetedGrossMargin: decimal(index === 0 ? 40000 : 11500),
      actualGrossMargin: decimal(index === 0 ? 43200 : 9200),
      budgetedGrossMarginPct: decimal(index === 0 ? 47.1 : 47.9),
      actualGrossMarginPct: decimal(index === 0 ? 47.5 : 43.8),
    })),
  });
};

const ensureRecipeData = async (tenantId: string) => {
  const existingRecipe = await prisma.recipe.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const unitRows = await prisma.$queryRaw<Array<{ id: number; code: string }>>`
    SELECT id, code FROM core.units ORDER BY id ASC LIMIT 1
  `;
  invariant(unitRows.length > 0, "core.units must have at least one unit");
  const unitId = unitRows[0].id;
  const unitCode = unitRows[0].code;

  const recipe =
    existingRecipe ??
    (await prisma.recipe.create({
      data: {
        tenantId,
        name: "Seeded Herb Chicken",
        category: "Hot Line",
        cuisineType: "American",
        tags: ["seed"],
      },
    }));

  const recipeVersion =
    (await prisma.recipeVersion.findFirst({
      where: { tenantId, recipeId: recipe.id, deletedAt: null },
      orderBy: { versionNumber: "desc" },
    })) ??
    (await prisma.recipeVersion.create({
      data: {
        tenantId,
        recipeId: recipe.id,
        versionNumber: 1,
        yieldQuantity: decimal(20),
        yieldUnitId: unitId,
        prepTimeMinutes: 30,
        cookTimeMinutes: 45,
      },
    }));

  const ingredients = await prisma.ingredient.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  let seededIngredients = ingredients;
  if (ingredients.length === 0) {
    const created = await Promise.all([
      prisma.ingredient.create({
        data: {
          tenantId,
          name: "Chicken Breast",
          category: "Hot Line",
          defaultUnitId: unitId,
          allergens: [],
        },
      }),
      prisma.ingredient.create({
        data: {
          tenantId,
          name: "Fresh Herbs",
          category: "Garnish",
          defaultUnitId: unitId,
          allergens: [],
        },
      }),
    ]);
    seededIngredients = created;
  }

  const hasIngredients = await prisma.recipeIngredient.count({
    where: { tenantId, recipeVersionId: recipeVersion.id, deletedAt: null },
  });
  if (hasIngredients === 0) {
    await prisma.recipeIngredient.createMany({
      data: seededIngredients.map((ingredient, index) => ({
        tenantId,
        recipeVersionId: recipeVersion.id,
        ingredientId: ingredient.id,
        quantity: decimal(index === 0 ? 5 : 1),
        unitId,
        adjustedQuantity: decimal(index === 0 ? 5 : 1),
        sortOrder: index,
      })),
    });
  }

  const dish =
    (await prisma.dish.findFirst({
      where: { tenantId, recipeId: recipe.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.dish.create({
      data: {
        tenantId,
        recipeId: recipe.id,
        name: "Herb Chicken Platter",
        category: "Entree",
        serviceStyle: "Family Style",
        dietaryTags: ["gluten-free"],
        allergens: [],
        minPrepLeadDays: 1,
      },
    }));

  return {
    unitId,
    unitCode,
    recipe,
    recipeVersion,
    dish,
    ingredients: seededIngredients,
  };
};

const ensureEventDishes = async (
  tenantId: string,
  eventId: string,
  dishId: string
) => {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM tenant_events.event_dishes
    WHERE tenant_id = ${tenantId}::uuid
      AND event_id = ${eventId}::uuid
      AND dish_id = ${dishId}::uuid
      AND deleted_at IS NULL
    LIMIT 1
  `;

  if (existing.length > 0) return;

  await prisma.$executeRaw`
    INSERT INTO tenant_events.event_dishes (
      tenant_id,
      event_id,
      dish_id,
      course,
      quantity_servings
    ) VALUES (
      ${tenantId}::uuid,
      ${eventId}::uuid,
      ${dishId}::uuid,
      'main',
      120
    )
  `;
};

const ensurePrepList = async (
  tenantId: string,
  eventId: string,
  unitCode: string,
  ingredients: Array<{ id: string; name: string; category: string | null }>
) => {
  const existing = await prisma.prepList.findFirst({
    where: { tenantId, eventId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  if (existing) return existing;

  const prepList = await prisma.prepList.create({
    data: {
      tenantId,
      eventId,
      name: "Seeded Prep List",
      batchMultiplier: decimal(1),
      dietaryRestrictions: [],
      status: "draft",
      totalItems: ingredients.length,
      totalEstimatedTime: 90,
    },
  });

  await prisma.prepListItem.createMany({
    data: ingredients.map((ingredient, index) => ({
      tenantId,
      prepListId: prepList.id,
      stationId: "prep-station",
      stationName: "Prep Station",
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      category: ingredient.category ?? "Prep",
      baseQuantity: decimal(1),
      baseUnit: unitCode,
      scaledQuantity: decimal(2),
      scaledUnit: unitCode,
      isOptional: false,
      preparationNotes: "Seeded prep notes",
      allergens: [],
      dietarySubstitutions: [],
      sortOrder: index,
    })),
  });

  return prepList;
};

const ensurePrepTasks = async (
  tenantId: string,
  eventId: string,
  locationId: string,
  unitId: number
) => {
  const existing = await prisma.prepTask.findFirst({
    where: { tenantId, eventId, deletedAt: null },
  });
  if (existing) return;

  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 2);

  await prisma.prepTask.create({
    data: {
      tenantId,
      eventId,
      locationId,
      taskType: "prep",
      name: "Seeded prep task",
      quantityTotal: decimal(10),
      quantityUnitId: unitId,
      quantityCompleted: decimal(2),
      servingsTotal: 40,
      startByDate: today,
      dueByDate: dueDate,
      status: "in-progress",
      priority: 3,
      notes: "Seeded prep task notes",
    },
  });
};

const ensureKitchenTasks = async (tenantId: string) => {
  const existing = await prisma.kitchenTask.findFirst({
    where: { tenantId, deletedAt: null },
  });
  if (existing) return;

  await prisma.kitchenTask.createMany({
    data: [
      {
        tenantId,
        title: "Seeded hot line prep",
        summary: "Finalize hot line mise en place before service.",
        status: "pending",
        priority: 4,
        complexity: 3,
        tags: ["seed", "prep"],
      },
      {
        tenantId,
        title: "Seeded garnish station",
        summary: "Prep garnish trays for plated service.",
        status: "in-progress",
        priority: 3,
        complexity: 2,
        tags: ["seed", "garnish"],
      },
    ],
  });
};

const ensureInventory = async (tenantId: string) => {
  const existing = await prisma.inventoryItem.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.inventoryItem.create({
    data: {
      tenantId,
      item_number: "INV-001",
      name: "Seeded Olive Oil",
      category: "Pantry",
      unitCost: decimal(18.5),
      quantityOnHand: decimal(24),
      reorder_level: decimal(6),
      tags: ["seed"],
    },
  });
};

const ensureWasteReason = async () => {
  const existing = await prisma.wasteReason.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
  if (existing) return existing;

  return prisma.wasteReason.create({
    data: {
      code: "SEED",
      name: "Seeded Waste",
      description: "Seeded waste reason",
      colorHex: "#F97316",
      isActive: true,
      sortOrder: 1,
    },
  });
};

const ensureWasteEntry = async (
  tenantId: string,
  inventoryItemId: string,
  reasonId: number,
  employeeId: string
) => {
  const existing = await prisma.wasteEntry.findFirst({
    where: { tenantId, deletedAt: null },
  });
  if (existing) return;

  await prisma.wasteEntry.create({
    data: {
      tenantId,
      inventoryItemId,
      reasonId,
      quantity: decimal(1.5),
      loggedBy: employeeId,
      notes: "Seeded waste entry",
    },
  });
};

const ensureAllergenWarning = async (
  tenantId: string,
  eventId: string,
  dishId: string
) => {
  const existing = await prisma.allergenWarning.findFirst({
    where: { tenantId, eventId, deletedAt: null },
  });
  if (existing) return;

  await prisma.allergenWarning.create({
    data: {
      tenantId,
      eventId,
      dishId,
      warningType: "allergen",
      allergens: ["dairy"],
      affectedGuests: ["Guest A", "Guest B"],
      severity: "warning",
    },
  });
};

const ensureSchedule = async (
  tenantId: string,
  locationId: string,
  employeeId: string
) => {
  const existing = await prisma.schedule.findFirst({
    where: { tenantId, deletedAt: null },
  });
  if (existing) return existing;

  const schedule = await prisma.schedule.create({
    data: {
      tenantId,
      locationId,
      schedule_date: new Date(),
      status: "draft",
    },
  });

  await prisma.scheduleShift.create({
    data: {
      tenantId,
      scheduleId: schedule.id,
      employeeId,
      locationId,
      shift_start: new Date(),
      shift_end: new Date(Date.now() + 4 * 60 * 60 * 1000),
      role_during_shift: "Prep",
      notes: "Seeded shift",
    },
  });

  return schedule;
};

const ensureCRMRecords = async (
  tenantId: string,
  clientId: string,
  eventId: string
) => {
  const existingProposal = await prisma.proposal.findFirst({
    where: { tenantId, deletedAt: null },
  });
  if (!existingProposal) {
    await prisma.proposal.create({
      data: {
        tenantId,
        proposalNumber: `SEED-${new Date().getTime()}`,
        clientId,
        eventId,
        title: "Seeded Proposal",
        status: "draft",
        total: decimal(12500),
      },
    });
  }

  const existingContract = await prisma.eventContract.findFirst({
    where: { tenantId, deletedAt: null },
  });
  if (!existingContract) {
    await prisma.eventContract.create({
      data: {
        tenantId,
        eventId,
        clientId,
        status: "active",
        title: "Seeded Contract",
      },
    });
  }
};

const main = async () => {
  const account = await resolveAccount();
  const tenantId = account.id;

  console.log(`Seeding tenant ${account.slug} (${tenantId})`);

  const location = await ensureLocation(tenantId);
  const users = await ensureUsers(tenantId);
  const client = await ensureClient(tenantId);
  const events = await ensureEvents(tenantId, client.id, location.id);

  await ensureEventProfitability(tenantId, events);

  const recipeSeed = await ensureRecipeData(tenantId);
  await ensureEventDishes(tenantId, events[0].id, recipeSeed.dish.id);
  await ensurePrepList(
    tenantId,
    events[0].id,
    recipeSeed.unitCode,
    recipeSeed.ingredients
  );
  await ensurePrepTasks(
    tenantId,
    events[0].id,
    location.id,
    recipeSeed.unitId
  );
  await ensureKitchenTasks(tenantId);

  const inventoryItem = await ensureInventory(tenantId);
  const wasteReason = await ensureWasteReason();
  await ensureWasteEntry(tenantId, inventoryItem.id, wasteReason.id, users[0].id);

  await ensureAllergenWarning(tenantId, events[0].id, recipeSeed.dish.id);
  await ensureSchedule(tenantId, location.id, users[0].id);
  await ensureCRMRecords(tenantId, client.id, events[0].id);

  console.log("Seed complete.");
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
