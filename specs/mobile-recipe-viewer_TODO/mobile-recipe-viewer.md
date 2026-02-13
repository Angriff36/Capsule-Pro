# Mobile Recipe Viewer

## Outcome
Kitchen staff can view recipes on mobile devices with step-by-step instructions, timers, and ingredient lists. The interface is optimized for hands-free use in kitchen environments.

## In Scope
- Display recipes with step-by-step instructions
- Show ingredient lists with quantities and units
- Provide timers for recipe steps that require timing
- Support hands-free navigation (voice commands, large buttons)
- Display recipe images and preparation notes
- Support offline viewing of previously loaded recipes

## Out of Scope
- Recipe editing or creation from mobile
- Recipe sharing or collaboration features
- Integration with kitchen equipment
- Recipe scaling or quantity adjustments

## Invariants / Must Never Happen
- Recipe instructions must never be incomplete or missing steps
- Ingredient quantities must never be zero or negative
- Timers must never be inaccurate or fail to trigger
- Recipe display must never require more than 2 taps to view full recipe
- Offline recipes must never show outdated information when online
- Recipe viewer must never require internet connection for basic viewing

## Acceptance Checks
- View recipe on mobile → recipe displays with all steps and ingredients
- Start timer for recipe step → timer counts down accurately
- Navigate recipe hands-free → can move between steps without touching screen
- View recipe offline → previously loaded recipes accessible
- View recipe images → images load and display correctly
- Scale recipe → quantities adjust proportionally
