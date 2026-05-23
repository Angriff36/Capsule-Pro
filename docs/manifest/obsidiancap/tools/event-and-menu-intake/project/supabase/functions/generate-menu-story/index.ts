import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FormData {
  occasionType: string;
  season: string;
  guestCount: number;
  serviceStyle: string;
  menuDirection: string;
  selectedItems: string[];
  barService: string;
  notes: string;
}

const ITEM_NAMES: Record<string, string> = {
  "app-bruschetta": "Heirloom Tomato Bruschetta",
  "app-burrata": "Burrata & Stone Fruit",
  "app-crab-cakes": "Pan-Seared Crab Cakes",
  "app-mushroom-soup": "Wild Mushroom Bisque",
  "app-tuna-tartare": "Ahi Tuna Tartare",
  "app-beet-salad": "Roasted Beet & Goat Cheese Salad",
  "app-spring-rolls": "Fresh Vietnamese Spring Rolls",
  "app-flatbread": "Seasonal Flatbread",
  "main-filet": "Filet Mignon",
  "main-salmon": "Pan-Roasted Atlantic Salmon",
  "main-chicken": "Herb-Roasted Airline Chicken",
  "main-short-rib": "Braised Short Rib",
  "main-lamb": "Rack of Lamb",
  "main-risotto": "Wild Mushroom Risotto",
  "main-tofu-bowl": "Glazed Tofu & Grain Bowl",
  "main-sea-bass": "Chilean Sea Bass",
  "main-bbq-brisket": "Smoked Brisket",
  "side-roast-veg": "Seasonal Roasted Vegetables",
  "side-mashed": "Yukon Gold Mashed Potatoes",
  "side-grains": "Herbed Grain Pilaf",
  "side-caesar": "Classic Caesar Salad",
  "side-green-beans": "Haricots Verts Almondine",
  "side-mac-cheese": "Truffle Mac & Cheese",
  "side-corn-succotash": "Summer Corn Succotash",
  "dessert-chocolate": "Dark Chocolate Torte",
  "dessert-cheesecake": "New York Cheesecake",
  "dessert-panna-cotta": "Vanilla Bean Panna Cotta",
  "dessert-fruit-tart": "Seasonal Fruit Tart",
  "dessert-sorbet": "Artisan Sorbet Trio",
  "dessert-tiramisu": "Classic Tiramisu",
  "late-sliders": "Mini Burger Sliders",
  "late-tacos": "Street Taco Bar",
  "late-pizza": "Wood-Fired Pizza Station",
  "late-fries": "Truffle Fries & Dipping Sauces",
  "late-donuts": "Mini Donut Wall",
};

const DIRECTION_LABELS: Record<string, string> = {
  "classic-american": "Classic American",
  "mediterranean": "Mediterranean",
  "farm-to-table": "Farm to Table",
  "modern-fusion": "Modern Fusion",
  "southern-comfort": "Southern Comfort",
  "coastal-seafood": "Coastal Seafood",
};

function buildMenuStory(data: FormData): string {
  const direction = DIRECTION_LABELS[data.menuDirection] || data.menuDirection || "custom";
  const season = data.season || "the season";
  const style = (data.serviceStyle || "").replace(/-/g, " ");

  const itemNames = data.selectedItems
    .map((id) => ITEM_NAMES[id])
    .filter(Boolean);

  const mains = itemNames.filter((_, i) => data.selectedItems[i]?.startsWith("main-"));
  const apps = itemNames.filter((_, i) => data.selectedItems[i]?.startsWith("app-"));
  const desserts = itemNames.filter((_, i) => data.selectedItems[i]?.startsWith("dessert-"));

  const lines: string[] = [];

  lines.push(
    `Inspired by ${direction} traditions and the best of ${season}, this ${style} menu has been composed to create a seamless dining experience for your ${data.guestCount} guests.`
  );

  if (apps.length > 0) {
    lines.push(
      `The evening begins with ${apps.join(" and ")}, setting a welcoming tone.`
    );
  }

  if (mains.length > 0) {
    if (mains.length === 1) {
      lines.push(`The centerpiece of the meal is ${mains[0]}, prepared with care and seasonal ingredients.`);
    } else {
      const last = mains.pop();
      lines.push(`Guests will choose from ${mains.join(", ")} and ${last}, each crafted to showcase the finest seasonal ingredients.`);
    }
  }

  if (desserts.length > 0) {
    lines.push(
      `To close, ${desserts.join(" and ")} ${desserts.length === 1 ? "offers" : "offer"} a sweet, memorable finish.`
    );
  }

  if (data.barService && data.barService !== "none") {
    const barLabel = data.barService.replace(/-/g, " ");
    lines.push(`Complemented by ${barLabel} service throughout the evening.`);
  }

  return lines.join(" ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { formData } = await req.json();
    const story = buildMenuStory(formData);

    return new Response(JSON.stringify({ story }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to generate menu story",
        details: String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
