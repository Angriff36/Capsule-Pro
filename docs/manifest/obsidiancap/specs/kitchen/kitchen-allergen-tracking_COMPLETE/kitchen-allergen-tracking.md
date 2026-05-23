# Allergen and Dietary Tracking

## Outcome
The system tracks allergens and dietary restrictions at recipe and dish level. Allergen warnings are provided during event planning and production to prevent safety issues.

## In Scope
- Tag recipes and dishes with allergens (peanuts, dairy, gluten, etc.)
- Tag recipes and dishes with dietary restrictions (vegan, vegetarian, kosher, etc.)
- Display allergen warnings when planning events with menu items
- Show allergen information on prep lists and production documents
- Filter menu items by allergen or dietary restriction
- Prevent serving allergens to guests with restrictions (warnings)

## Out of Scope
- Automatic allergen detection from ingredient lists
- Integration with external allergen databases
- Allergen testing or verification workflows
- Historical allergen incident tracking

## Invariants / Must Never Happen
- Allergen information must never be omitted from production documents
- Recipes must never be served to guests with matching allergen restrictions without explicit override
- Allergen tags must never be removed without proper authorization
- Dietary restriction information must never be hidden or suppressed
- Allergen warnings must never be ignored silently; require explicit acknowledgment
- Recipe allergen tags must never conflict with ingredient allergen tags

## Acceptance Checks
- Tag recipe with allergens → allergens appear on recipe and all dishes using it
- Plan event with allergen-restricted guest → warning shown for conflicting menu items
- View prep list → allergen information included for each item
- Filter menu by dietary restriction → only matching items shown
- Attempt to serve allergen to restricted guest → warning shown with override option
- Update recipe allergens → changes reflected in all related dishes and events
