export declare function getEventDishes(eventId: string): Promise<
  {
    link_id: string;
    dish_id: string;
    name: string;
    category: string | null;
    recipe_name: string | null;
    course: string | null;
    quantity_servings: number;
    dietary_tags: string[] | null;
  }[]
>;
export declare function getAvailableDishes(eventId: string): Promise<
  {
    id: string;
    name: string;
    category: string | null;
    recipe_name: string | null;
  }[]
>;
export declare function addDishToEvent(
  eventId: string,
  dishId: string,
  course?: string,
  quantityServings?: number
): Promise<
  | {
      success: boolean;
      error?: undefined;
    }
  | {
      success: boolean;
      error: string;
    }
>;
export declare function removeDishFromEvent(
  eventId: string,
  linkId: string
): Promise<
  | {
      success: boolean;
      error?: undefined;
    }
  | {
      success: boolean;
      error: string;
    }
>;
//# sourceMappingURL=event-dishes.d.ts.map
