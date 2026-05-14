import type { CostDataProvider, DishCost } from "../types/menu";

const MOCK_COSTS: Record<string, DishCost> = {
  "app-bruschetta": {
    costPerPortion: 1.8,
    ingredients: [
      { name: "Sourdough bread", costPerPortion: 0.4, unit: "2 slices" },
      { name: "Heirloom tomatoes", costPerPortion: 0.9, unit: "100g" },
      { name: "Basil & balsamic", costPerPortion: 0.5, unit: "garnish" },
    ],
  },
  "app-burrata": {
    costPerPortion: 3.2,
    ingredients: [
      { name: "Burrata", costPerPortion: 2.0, unit: "60g" },
      { name: "Stone fruit", costPerPortion: 0.7, unit: "80g" },
      { name: "Arugula & honey", costPerPortion: 0.5, unit: "garnish" },
    ],
  },
  "app-crab-cakes": {
    costPerPortion: 5.5,
    ingredients: [
      { name: "Jumbo lump crab", costPerPortion: 4.2, unit: "80g" },
      { name: "Old Bay remoulade", costPerPortion: 0.8, unit: "30ml" },
      { name: "Microgreens", costPerPortion: 0.5, unit: "garnish" },
    ],
  },
  "app-mushroom-soup": {
    costPerPortion: 2.1,
    ingredients: [
      { name: "Wild mushrooms", costPerPortion: 1.2, unit: "60g" },
      { name: "Cream & truffle oil", costPerPortion: 0.7, unit: "30ml" },
      { name: "Herbs", costPerPortion: 0.2, unit: "garnish" },
    ],
  },
  "app-tuna-tartare": {
    costPerPortion: 6.2,
    ingredients: [
      { name: "Sushi-grade tuna", costPerPortion: 5.0, unit: "80g" },
      { name: "Avocado", costPerPortion: 0.6, unit: "40g" },
      { name: "Sesame-soy & wonton", costPerPortion: 0.6, unit: "garnish" },
    ],
  },
  "app-beet-salad": {
    costPerPortion: 2.0,
    ingredients: [
      { name: "Beets", costPerPortion: 0.8, unit: "100g" },
      { name: "Goat cheese", costPerPortion: 0.7, unit: "30g" },
      { name: "Walnuts & vinaigrette", costPerPortion: 0.5, unit: "garnish" },
    ],
  },
  "app-spring-rolls": {
    costPerPortion: 1.8,
    ingredients: [
      { name: "Rice paper & vermicelli", costPerPortion: 0.4, unit: "2 rolls" },
      { name: "Shrimp", costPerPortion: 0.9, unit: "40g" },
      { name: "Herbs & peanut sauce", costPerPortion: 0.5, unit: "garnish" },
    ],
  },
  "app-flatbread": {
    costPerPortion: 1.5,
    ingredients: [
      { name: "Flatbread dough", costPerPortion: 0.5, unit: "1 piece" },
      { name: "Seasonal toppings", costPerPortion: 0.7, unit: "60g" },
      { name: "Herb oil", costPerPortion: 0.3, unit: "drizzle" },
    ],
  },

  "main-filet": {
    costPerPortion: 16.0,
    ingredients: [
      { name: "Center-cut filet", costPerPortion: 14.0, unit: "200g" },
      { name: "Compound butter", costPerPortion: 0.8, unit: "20g" },
      { name: "Garlic jus", costPerPortion: 1.2, unit: "60ml" },
    ],
  },
  "main-salmon": {
    costPerPortion: 10.5,
    ingredients: [
      { name: "Atlantic salmon", costPerPortion: 8.5, unit: "180g" },
      { name: "Citrus-herb glaze", costPerPortion: 1.0, unit: "30ml" },
      { name: "Capers & dill cream", costPerPortion: 1.0, unit: "30ml" },
    ],
  },
  "main-chicken": {
    costPerPortion: 6.5,
    ingredients: [
      { name: "Airline chicken breast", costPerPortion: 4.5, unit: "220g" },
      { name: "Lemon pan sauce", costPerPortion: 1.0, unit: "45ml" },
      { name: "Wilted greens", costPerPortion: 1.0, unit: "60g" },
    ],
  },
  "main-short-rib": {
    costPerPortion: 13.0,
    ingredients: [
      { name: "Beef short rib", costPerPortion: 10.5, unit: "250g" },
      { name: "Red wine reduction", costPerPortion: 1.5, unit: "60ml" },
      { name: "Root vegetables", costPerPortion: 1.0, unit: "80g" },
    ],
  },
  "main-lamb": {
    costPerPortion: 15.0,
    ingredients: [
      { name: "Colorado lamb rack", costPerPortion: 12.5, unit: "200g" },
      { name: "Herb crust", costPerPortion: 1.0, unit: "15g" },
      { name: "Mint gremolata & jus", costPerPortion: 1.5, unit: "45ml" },
    ],
  },
  "main-risotto": {
    costPerPortion: 4.5,
    ingredients: [
      { name: "Arborio rice", costPerPortion: 1.0, unit: "100g" },
      { name: "Wild mushrooms", costPerPortion: 2.0, unit: "60g" },
      { name: "Parmesan & truffle oil", costPerPortion: 1.5, unit: "30g" },
    ],
  },
  "main-tofu-bowl": {
    costPerPortion: 3.5,
    ingredients: [
      { name: "Organic tofu", costPerPortion: 1.2, unit: "150g" },
      { name: "Farro & vegetables", costPerPortion: 1.5, unit: "120g" },
      { name: "Miso-ginger & tahini", costPerPortion: 0.8, unit: "45ml" },
    ],
  },
  "main-sea-bass": {
    costPerPortion: 18.0,
    ingredients: [
      { name: "Chilean sea bass", costPerPortion: 15.0, unit: "180g" },
      { name: "Bok choy & jasmine rice", costPerPortion: 1.5, unit: "100g" },
      { name: "Ginger broth", costPerPortion: 1.5, unit: "60ml" },
    ],
  },
  "main-bbq-brisket": {
    costPerPortion: 8.0,
    ingredients: [
      { name: "Beef brisket", costPerPortion: 6.0, unit: "200g" },
      { name: "House BBQ sauce", costPerPortion: 1.0, unit: "45ml" },
      { name: "Pickled onions", costPerPortion: 1.0, unit: "30g" },
    ],
  },

  "side-roast-veg": {
    costPerPortion: 1.8,
    ingredients: [
      { name: "Market vegetables", costPerPortion: 1.3, unit: "120g" },
      { name: "Herb oil & sea salt", costPerPortion: 0.5, unit: "drizzle" },
    ],
  },
  "side-mashed": {
    costPerPortion: 1.2,
    ingredients: [
      { name: "Yukon gold potatoes", costPerPortion: 0.6, unit: "150g" },
      { name: "Butter & cream", costPerPortion: 0.4, unit: "30ml" },
      { name: "Roasted garlic & chive", costPerPortion: 0.2, unit: "garnish" },
    ],
  },
  "side-grains": {
    costPerPortion: 1.5,
    ingredients: [
      { name: "Farro & quinoa", costPerPortion: 0.8, unit: "100g" },
      { name: "Almonds & cranberries", costPerPortion: 0.5, unit: "20g" },
      { name: "Fresh herbs", costPerPortion: 0.2, unit: "garnish" },
    ],
  },
  "side-caesar": {
    costPerPortion: 1.4,
    ingredients: [
      { name: "Romaine", costPerPortion: 0.5, unit: "80g" },
      { name: "Croutons & parmesan", costPerPortion: 0.5, unit: "20g" },
      { name: "Anchovy dressing", costPerPortion: 0.4, unit: "30ml" },
    ],
  },
  "side-green-beans": {
    costPerPortion: 1.6,
    ingredients: [
      { name: "Haricots verts", costPerPortion: 0.9, unit: "100g" },
      { name: "Almonds", costPerPortion: 0.4, unit: "15g" },
      { name: "Brown butter & lemon", costPerPortion: 0.3, unit: "drizzle" },
    ],
  },
  "side-mac-cheese": {
    costPerPortion: 2.0,
    ingredients: [
      { name: "Cavatappi pasta", costPerPortion: 0.4, unit: "100g" },
      { name: "Three-cheese blend", costPerPortion: 1.0, unit: "60g" },
      {
        name: "Truffle oil & breadcrumb",
        costPerPortion: 0.6,
        unit: "topping",
      },
    ],
  },
  "side-corn-succotash": {
    costPerPortion: 1.3,
    ingredients: [
      { name: "Sweet corn & lima beans", costPerPortion: 0.8, unit: "100g" },
      { name: "Cherry tomatoes & basil", costPerPortion: 0.5, unit: "40g" },
    ],
  },

  "dessert-chocolate": {
    costPerPortion: 2.5,
    ingredients: [
      { name: "Dark chocolate", costPerPortion: 1.5, unit: "60g" },
      { name: "Salted caramel", costPerPortion: 0.5, unit: "20ml" },
      { name: "Cream", costPerPortion: 0.5, unit: "30ml" },
    ],
  },
  "dessert-cheesecake": {
    costPerPortion: 2.2,
    ingredients: [
      { name: "Cream cheese base", costPerPortion: 1.5, unit: "1 slice" },
      { name: "Graham crust", costPerPortion: 0.3, unit: "base" },
      { name: "Fruit compote", costPerPortion: 0.4, unit: "30ml" },
    ],
  },
  "dessert-panna-cotta": {
    costPerPortion: 1.8,
    ingredients: [
      { name: "Cream & vanilla", costPerPortion: 1.0, unit: "120ml" },
      { name: "Gelatin", costPerPortion: 0.3, unit: "3g" },
      { name: "Berry coulis", costPerPortion: 0.5, unit: "30ml" },
    ],
  },
  "dessert-fruit-tart": {
    costPerPortion: 2.0,
    ingredients: [
      { name: "Butter pastry", costPerPortion: 0.6, unit: "1 tart" },
      { name: "Pastry cream", costPerPortion: 0.6, unit: "40ml" },
      { name: "Seasonal fruits", costPerPortion: 0.8, unit: "60g" },
    ],
  },
  "dessert-sorbet": {
    costPerPortion: 1.5,
    ingredients: [
      { name: "Three sorbets", costPerPortion: 1.0, unit: "3 scoops" },
      { name: "Fresh berries & mint", costPerPortion: 0.5, unit: "garnish" },
    ],
  },
  "dessert-tiramisu": {
    costPerPortion: 2.4,
    ingredients: [
      { name: "Ladyfingers & espresso", costPerPortion: 0.8, unit: "4 pieces" },
      { name: "Mascarpone", costPerPortion: 1.2, unit: "60g" },
      { name: "Cocoa", costPerPortion: 0.4, unit: "dusting" },
    ],
  },

  "late-sliders": {
    costPerPortion: 3.0,
    ingredients: [
      { name: "Wagyu blend patties", costPerPortion: 2.0, unit: "2 sliders" },
      { name: "Buns & cheese", costPerPortion: 0.6, unit: "2 buns" },
      { name: "Pickles & sauce", costPerPortion: 0.4, unit: "garnish" },
    ],
  },
  "late-tacos": {
    costPerPortion: 3.2,
    ingredients: [
      { name: "Carne asada & al pastor", costPerPortion: 2.2, unit: "100g" },
      { name: "Tortillas", costPerPortion: 0.4, unit: "3 tortillas" },
      { name: "Salsa & toppings", costPerPortion: 0.6, unit: "assorted" },
    ],
  },
  "late-pizza": {
    costPerPortion: 2.8,
    ingredients: [
      { name: "Pizza dough", costPerPortion: 0.6, unit: "2 slices" },
      { name: "Mozzarella & sauce", costPerPortion: 1.2, unit: "80g" },
      { name: "Toppings", costPerPortion: 1.0, unit: "assorted" },
    ],
  },
  "late-fries": {
    costPerPortion: 1.4,
    ingredients: [
      { name: "Hand-cut potatoes", costPerPortion: 0.6, unit: "120g" },
      { name: "Truffle oil & parmesan", costPerPortion: 0.5, unit: "drizzle" },
      { name: "Three sauces", costPerPortion: 0.3, unit: "45ml" },
    ],
  },
  "late-donuts": {
    costPerPortion: 1.8,
    ingredients: [
      { name: "Mini donuts", costPerPortion: 1.0, unit: "3 donuts" },
      { name: "Glazes", costPerPortion: 0.4, unit: "assorted" },
      { name: "Toppings bar", costPerPortion: 0.4, unit: "assorted" },
    ],
  },
};

export class MockCostDataProvider implements CostDataProvider {
  async getCOGS(dishId: string): Promise<DishCost | null> {
    return MOCK_COSTS[dishId] || null;
  }
}
