import { Prisma, type PrismaClient } from "@repo/database";

const decimal = (value: number) => new Prisma.Decimal(value);

/**
 * Seed a tenant with realistic sample data for new users to explore
 * All seeded data is tagged with "sample" for easy identification and removal
 */
export const seedSampleData = async (
  prisma: PrismaClient,
  tenantId: string
) => {
  console.log(`Seeding sample data for tenant ${tenantId}`);

  // Create primary location
  const location = await prisma.location.create({
    data: {
      tenantId,
      name: "Main Kitchen",
      addressLine1: "123 Culinary Way",
      city: "San Francisco",
      stateProvince: "CA",
      postalCode: "94102",
      countryCode: "US",
      timezone: "America/Los_Angeles",
      isPrimary: true,
    },
  });

  // Create sample users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        tenantId,
        email: "alex.sample@demo.local",
        firstName: "Alex",
        lastName: "Chen",
        role: "manager",
        hourlyRate: decimal(35.0),
      },
    }),
    prisma.user.create({
      data: {
        tenantId,
        email: "jordan.sample@demo.local",
        firstName: "Jordan",
        lastName: "Rivera",
        role: "staff",
        hourlyRate: decimal(26.5),
      },
    }),
    prisma.user.create({
      data: {
        tenantId,
        email: "sam.sample@demo.local",
        firstName: "Sam",
        lastName: "Kim",
        role: "staff",
        hourlyRate: decimal(24.0),
      },
    }),
  ]);

  // Create sample client
  const client = await prisma.client.create({
    data: {
      tenantId,
      clientType: "company",
      company_name: "Apex Events Inc.",
      email: "events@apex-demo.local",
      phone: "415-555-0123",
      tags: ["sample"],
      source: "sample",
    },
  });

  // Create sample events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const inTwoDays = new Date(today);
  inTwoDays.setDate(today.getDate() + 2);

  const events = await Promise.all([
    prisma.event.create({
      data: {
        tenantId,
        title: "Annual Corporate Gala",
        eventType: "catering",
        eventDate: nextWeek,
        guestCount: 150,
        status: "confirmed",
        tags: ["sample", "corporate"],
        clientId: client.id,
        locationId: location.id,
        venueName: "Grand Ballroom",
        venueAddress: "500 Market St",
      },
    }),
    prisma.event.create({
      data: {
        tenantId,
        title: "Team Building Lunch",
        eventType: "onsite",
        eventDate: inTwoDays,
        guestCount: 45,
        status: "tentative",
        tags: ["sample", "corporate"],
        clientId: client.id,
        locationId: location.id,
        venueName: "Downtown Office",
        venueAddress: "100 Van Ness Ave",
      },
    }),
  ]);

  // Get a unit for recipes
  const unitRows = await prisma.$queryRaw<Array<{ id: number; code: string }>>`
    SELECT id, code FROM core.units ORDER BY id ASC LIMIT 1
  `;
  if (unitRows.length === 0) {
    throw new Error("No units found in core.units");
  }
  const unitId = unitRows[0].id;
  const unitCode = unitRows[0].code;

  // Create sample recipe with ingredients
  const ingredients = await Promise.all([
    prisma.ingredient.create({
      data: {
        tenantId,
        name: "Chicken Breast",
        category: "Protein",
        defaultUnitId: unitId,
        allergens: [],
      },
    }),
    prisma.ingredient.create({
      data: {
        tenantId,
        name: "Fresh Rosemary",
        category: "Herbs",
        defaultUnitId: unitId,
        allergens: [],
      },
    }),
    prisma.ingredient.create({
      data: {
        tenantId,
        name: "Lemon",
        category: "Produce",
        defaultUnitId: unitId,
        allergens: [],
      },
    }),
  ]);

  const recipe = await prisma.recipe.create({
    data: {
      tenantId,
      name: "Herb Roasted Chicken",
      category: "Entree",
      cuisineType: "American",
      tags: ["sample"],
    },
  });

  const recipeVersion = await prisma.recipeVersion.create({
    data: {
      tenantId,
      recipeId: recipe.id,
      name: "Version 1",
      versionNumber: 1,
      yieldQuantity: decimal(24),
      yieldUnitId: unitId,
      prepTimeMinutes: 45,
      cookTimeMinutes: 60,
    },
  });

  await prisma.recipeIngredient.createMany({
    data: ingredients.map((ingredient: { id: string }, index: number) => ({
      tenantId,
      recipeVersionId: recipeVersion.id,
      ingredientId: ingredient.id,
      quantity: decimal(index === 0 ? 6 : 2),
      unitId,
      adjustedQuantity: decimal(index === 0 ? 6 : 2),
      sortOrder: index,
    })),
  });

  const dish = await prisma.dish.create({
    data: {
      tenantId,
      recipeId: recipe.id,
      name: "Herb Roasted Chicken Platter",
      category: "Entree",
      serviceStyle: "Family Style",
      dietaryTags: ["gluten-free"],
      allergens: [],
      minPrepLeadDays: 2,
    },
  });

  // Link dish to event
  await prisma.$executeRaw`
    INSERT INTO tenant_events.event_dishes (
      tenant_id,
      event_id,
      dish_id,
      course,
      quantity_servings
    ) VALUES (
      ${tenantId}::uuid,
      ${events[0].id}::uuid,
      ${dish.id}::uuid,
      'main',
      150
    )
  `;

  // Create prep list for event
  const prepList = await prisma.prepList.create({
    data: {
      tenantId,
      eventId: events[0].id,
      name: "Gala Prep List",
      batchMultiplier: decimal(1),
      dietaryRestrictions: [],
      status: "draft",
      totalItems: ingredients.length,
      totalEstimatedTime: 120,
    },
  });

  await prisma.prepListItem.createMany({
    data: ingredients.map(
      (
        ingredient: { id: string; name: string; category: string | null },
        index: number
      ) => ({
        tenantId,
        prepListId: prepList.id,
        stationId: "prep-station",
        stationName: "Prep Station",
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category ?? "Prep",
        baseQuantity: decimal(1),
        baseUnit: unitCode,
        scaledQuantity: decimal(3),
        scaledUnit: unitCode,
        isOptional: false,
        preparationNotes: "Sample prep instruction",
        allergens: [],
        dietarySubstitutions: [],
        sortOrder: index,
      })
    ),
  });

  // Create prep tasks
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 5);

  await prisma.prepTask.create({
    data: {
      tenantId,
      eventId: events[0].id,
      locationId: location.id,
      taskType: "prep",
      name: "Marinate chicken portions",
      quantityTotal: decimal(24),
      quantityUnitId: unitId,
      quantityCompleted: decimal(8),
      servingsTotal: 150,
      startByDate: today,
      dueByDate: dueDate,
      status: "in-progress",
      priority: 4,
      notes: "Sample prep task",
    },
  });

  // Create kitchen tasks
  await prisma.kitchenTask.createMany({
    data: [
      {
        tenantId,
        title: "Review event final headcount",
        summary: "Confirm final guest count with client",
        status: "pending",
        priority: 5,
        complexity: 1,
        tags: ["sample", "admin"],
      },
      {
        tenantId,
        title: "Prepare garnish station",
        summary: "Set up garnish prep for service",
        status: "in-progress",
        priority: 3,
        complexity: 2,
        tags: ["sample", "prep"],
      },
    ],
  });

  // Create inventory item
  const inventoryItem = await prisma.inventoryItem.create({
    data: {
      tenantId,
      item_number: "SAMPLE-001",
      name: "Sample Olive Oil",
      category: "Pantry",
      unitCost: decimal(22.5),
      quantityOnHand: decimal(18),
      reorder_level: decimal(4),
      tags: ["sample"],
    },
  });

  // Create waste reason and entry
  const wasteReason = await prisma.wasteReason.create({
    data: {
      code: "SAMPLE",
      name: "Sample Waste",
      description: "Sample waste reason for demo",
      colorHex: "#3B82F6",
      isActive: true,
      sortOrder: 999,
    },
  });

  await prisma.wasteEntry.create({
    data: {
      tenantId,
      inventoryItemId: inventoryItem.id,
      reasonId: wasteReason.id,
      quantity: decimal(0.5),
      loggedBy: users[0].id,
      notes: "Sample waste entry",
    },
  });

  // Create allergen warning
  await prisma.allergenWarning.create({
    data: {
      tenantId,
      eventId: events[0].id,
      dishId: dish.id,
      warningType: "allergen",
      allergens: ["dairy"],
      affectedGuests: ["Table 5 - Guest A"],
      severity: "warning",
    },
  });

  // Create schedule with shift
  const schedule = await prisma.schedule.create({
    data: {
      tenantId,
      locationId: location.id,
      schedule_date: today,
      status: "published",
    },
  });

  await prisma.scheduleShift.create({
    data: {
      tenantId,
      scheduleId: schedule.id,
      employeeId: users[0].id,
      locationId: location.id,
      shift_start: new Date(),
      shift_end: new Date(Date.now() + 8 * 60 * 60 * 1000),
      role_during_shift: "Sous Chef",
      notes: "Sample shift",
    },
  });

  // Create CRM records
  await prisma.proposal.create({
    data: {
      tenantId,
      proposalNumber: `SAMPLE-${Date.now()}`,
      clientId: client.id,
      eventId: events[0].id,
      title: "Annual Gala Proposal",
      status: "draft",
      total: decimal(28_500),
    },
  });

  await prisma.eventContract.create({
    data: {
      tenantId,
      eventId: events[0].id,
      clientId: client.id,
      status: "draft",
      title: "Annual Gala Contract",
    },
  });

  // Create event profitability
  await prisma.eventProfitability.create({
    data: {
      tenantId,
      eventId: events[0].id,
      budgetedRevenue: decimal(28_500),
      actualRevenue: decimal(28_500),
      budgetedFoodCost: decimal(8500),
      actualFoodCost: decimal(8200),
      budgetedLaborCost: decimal(6000),
      actualLaborCost: decimal(5800),
      budgetedOverhead: decimal(3000),
      actualOverhead: decimal(2900),
      budgetedTotalCost: decimal(17_500),
      actualTotalCost: decimal(16_900),
      budgetedGrossMargin: decimal(11_000),
      actualGrossMargin: decimal(11_600),
      budgetedGrossMarginPct: decimal(38.6),
      actualGrossMarginPct: decimal(40.7),
    },
  });

  console.log(`Sample data seeding complete for tenant ${tenantId}`);
};

/**
 * Clear all sample data for a tenant
 * Identifies sample data by tags: ["sample"] or source: "sample"
 */
export const clearSampleData = async (
  prisma: PrismaClient,
  tenantId: string
) => {
  console.log(`Clearing sample data for tenant ${tenantId}`);

  // Delete records tagged with "sample" or created by sample seeding
  // We use cascading deletes where possible, otherwise delete in dependency order

  // First, let's find what we need to delete
  const sampleEvents = await prisma.event.findMany({
    where: {
      tenantId,
      tags: { has: "sample" },
      deletedAt: null,
    },
    select: { id: true },
  });

  const sampleEventIds = sampleEvents.map((e: { id: string }) => e.id);

  // Delete related records first (no cascade in schema for some)
  await prisma.eventProfitability.deleteMany({
    where: {
      tenantId,
      eventId: { in: sampleEventIds },
    },
  });

  await prisma.prepList.deleteMany({
    where: {
      tenantId,
      eventId: { in: sampleEventIds },
      deletedAt: null,
    },
  });

  await prisma.prepTask.deleteMany({
    where: {
      tenantId,
      eventId: { in: sampleEventIds },
      deletedAt: null,
    },
  });

  await prisma.allergenWarning.deleteMany({
    where: {
      tenantId,
      eventId: { in: sampleEventIds },
      deletedAt: null,
    },
  });

  // Delete sample dishes (via recipe tag)
  const sampleRecipes = await prisma.recipe.findMany({
    where: {
      tenantId,
      tags: { has: "sample" },
      deletedAt: null,
    },
    select: { id: true },
  });

  const sampleRecipeIds = sampleRecipes.map((r: { id: string }) => r.id);

  await prisma.dish.deleteMany({
    where: {
      tenantId,
      recipeId: { in: sampleRecipeIds },
      deletedAt: null,
    },
  });

  await prisma.recipeVersion.deleteMany({
    where: {
      tenantId,
      recipeId: { in: sampleRecipeIds },
      deletedAt: null,
    },
  });

  await prisma.recipeIngredient.deleteMany({
    where: {
      tenantId,
      recipeVersionId: { in: sampleRecipeIds },
      deletedAt: null,
    },
  });

  await prisma.recipe.deleteMany({
    where: {
      tenantId,
      id: { in: sampleRecipeIds },
      deletedAt: null,
    },
  });

  // Delete sample ingredients
  await prisma.ingredient.deleteMany({
    where: {
      tenantId,
      name: { in: ["Chicken Breast", "Fresh Rosemary", "Lemon"] },
      deletedAt: null,
    },
  });

  // Delete sample events
  await prisma.event.deleteMany({
    where: {
      tenantId,
      id: { in: sampleEventIds },
      deletedAt: null,
    },
  });

  // Delete sample client
  await prisma.proposal.deleteMany({
    where: {
      tenantId,
      proposalNumber: { startsWith: "SAMPLE" },
      deletedAt: null,
    },
  });

  await prisma.eventContract.deleteMany({
    where: {
      tenantId,
      title: { contains: "Gala" },
      deletedAt: null,
    },
  });

  await prisma.client.deleteMany({
    where: {
      tenantId,
      source: "sample",
      deletedAt: null,
    },
  });

  // Delete sample users (and their shifts)
  const sampleUsers = await prisma.user.findMany({
    where: {
      tenantId,
      email: { endsWith: ".demo.local" },
      deletedAt: null,
    },
    select: { id: true },
  });

  const sampleUserIds = sampleUsers.map((u: { id: string }) => u.id);

  await prisma.scheduleShift.deleteMany({
    where: {
      tenantId,
      employeeId: { in: sampleUserIds },
    },
  });

  await prisma.user.deleteMany({
    where: {
      tenantId,
      id: { in: sampleUserIds },
    },
  });

  // Delete sample inventory
  await prisma.wasteEntry.deleteMany({
    where: {
      tenantId,
      notes: "Sample waste entry",
      deletedAt: null,
    },
  });

  await prisma.wasteReason.deleteMany({
    where: {
      code: "SAMPLE",
    },
  });

  await prisma.inventoryItem.deleteMany({
    where: {
      tenantId,
      tags: { has: "sample" },
      deletedAt: null,
    },
  });

  // Delete sample kitchen tasks
  await prisma.kitchenTask.deleteMany({
    where: {
      tenantId,
      tags: { has: "sample" },
      deletedAt: null,
    },
  });

  // Delete sample schedules (created today for sample data)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  await prisma.scheduleShift.deleteMany({
    where: {
      tenantId,
      notes: "Sample shift",
    },
  });

  await prisma.schedule.deleteMany({
    where: {
      tenantId,
      schedule_date: { gte: today, lt: tomorrow },
      deletedAt: null,
    },
  });

  // Note: We keep the location as it may be the only one

  console.log(`Sample data cleared for tenant ${tenantId}`);
};
