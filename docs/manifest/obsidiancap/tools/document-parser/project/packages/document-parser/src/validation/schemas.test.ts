import { describe, it, expect } from 'vitest';
import { validateEntity } from './schemas.js';

describe('Validation schemas', () => {
  describe('MenuItem', () => {
    it('validates a correct menu item', () => {
      const result = validateEntity({
        kind: 'menu_item',
        name: 'Pan-Seared Salmon',
        description: 'With lemon dill sauce',
        dietaryFlags: ['gluten-free'],
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(true);
    });

    it('rejects menu item with empty name', () => {
      const result = validateEntity({
        kind: 'menu_item',
        name: '',
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Recipe', () => {
    it('validates a recipe with ingredients', () => {
      const result = validateEntity({
        kind: 'recipe',
        name: 'Salmon Marinade',
        ingredients: [
          { item: 'lemon juice', quantity: 2, unit: 'tbsp' },
          { item: 'dill', quantity: 1, unit: 'tbsp' },
        ],
        instructions: ['Mix ingredients', 'Apply to salmon'],
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(true);
    });

    it('rejects recipe with no ingredients', () => {
      const result = validateEntity({
        kind: 'recipe',
        name: 'Empty Recipe',
        ingredients: [],
        instructions: [],
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('InventoryNeed', () => {
    it('validates an inventory need', () => {
      const result = validateEntity({
        kind: 'inventory_need',
        item: 'Atlantic salmon fillets',
        quantity: 20,
        unit: 'lbs',
        category: 'seafood',
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(true);
    });

    it('rejects negative quantity', () => {
      const result = validateEntity({
        kind: 'inventory_need',
        item: 'salmon',
        quantity: -5,
        unit: 'lbs',
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('StaffingAssignment', () => {
    it('validates a staffing assignment', () => {
      const result = validateEntity({
        kind: 'staffing_assignment',
        role: 'Grill',
        person: 'Mike R.',
        station: 'Station 1',
        shift: 'PM shift',
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(true);
    });

    it('rejects assignment with empty role', () => {
      const result = validateEntity({
        kind: 'staffing_assignment',
        role: '',
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('discriminated union', () => {
    it('rejects unknown entity kinds', () => {
      const result = validateEntity({
        kind: 'unknown_thing',
        name: 'test',
        sourceBlockIds: ['b1'],
      });

      expect(result.success).toBe(false);
    });
  });
});
