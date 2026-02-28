/**
 * Route-level integration test for Event.create
 * 
 * Tests the full route flow: runCommand -> createInstance -> DB persistence
 * Verifies event emission semantics are correct.
 * 
 * Run: pnpm --filter api test -- --testPathPattern="event-creation-route"
 */
import { describe, it, expect, afterAll } from 'vitest';
import { getClerkSessionToken, TEST_TENANT_ID, TEST_ORG_ID } from './helpers/clerk-auth';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:2223';

describe('Event Creation Route Integration', () => {
  const createdEventIds: string[] = [];

  afterAll(async () => {
    const { PrismaClient } = await import('@repo/database');
    const prisma = new PrismaClient();
    for (const eventId of createdEventIds) {
      try {
        await prisma.event.delete({
          where: { tenantId_id: { tenantId: TEST_TENANT_ID, id: eventId } }
        });
      } catch { /* ignore */ }
    }
    await prisma.$disconnect();
  });

  it('should persist event via route with Clerk auth', async () => {
    const { PrismaClient } = await import('@repo/database');
    const prisma = new PrismaClient();
    
    const uniqueTitle = `Route Test ${Date.now()}`;
    const eventData = {
      title: uniqueTitle,
      eventType: 'catering',
      eventDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      guestCount: 15,
      status: 'draft',
      venueName: 'Route Test Venue',
      venueAddress: '456 Route St',
    };

    // 1. Verify no event exists before
    const before = await prisma.event.findMany({
      where: { tenantId: TEST_TENANT_ID, title: uniqueTitle }
    });
    expect(before.length).toBe(0);

    // 2. Get Clerk session token and call route
    const token = await getClerkSessionToken();
    
    const response = await fetch(`${API_BASE_URL}/api/events/event/commands/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(eventData),
    });

    // 3. CRITICAL: Route must return 200
    console.log('Route response status:', response.status);
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);

    // 4. CRITICAL: DB row must exist (not just "200 OK")
    const after = await prisma.event.findMany({
      where: { tenantId: TEST_TENANT_ID, title: uniqueTitle }
    });
    
    // This is THE persistence test - if this fails, fix regressed
    expect(after.length).toBe(1);
    expect(after[0].title).toBe(uniqueTitle);
    expect(after[0].guestCount).toBe(15);
    expect(after[0].tenantId).toBe(TEST_TENANT_ID); // Tenant boundary correct
    
    createdEventIds.push(after[0].id);
    await prisma.$disconnect();
  });

  it('should reject request without auth', async () => {
    const { PrismaClient } = await import('@repo/database');
    const prisma = new PrismaClient();
    
    const uniqueTitle = `No Auth Test ${Date.now()}`;
    const eventData = {
      title: uniqueTitle,
      eventType: 'catering',
      eventDate: Date.now(),
      guestCount: 5,
      status: 'draft',
    };

    // Call WITHOUT auth header
    const response = await fetch(`${API_BASE_URL}/api/events/event/commands/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    // Should be rejected (401 or similar)
    expect(response.status).toBeGreaterThanOrEqual(400);
    
    // Verify no row was created
    const after = await prisma.event.findMany({
      where: { tenantId: TEST_TENANT_ID, title: uniqueTitle }
    });
    expect(after.length).toBe(0);
    
    await prisma.$disconnect();
  });
});
