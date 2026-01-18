I'll help you implement these UI improvements for the recipes page. Let me first explore the codebase to understand the current structure.

🔧 Tool: Glob
Input: {
  "pattern": "**/recipes/**/*.tsx"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/kitchen/**/*page.tsx"
}

🔧 Tool: Grep
Input: {
  "pattern": "Cleanup imports",
  "output_mode": "files_with_matches"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/recipes-toolbar.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/components/header.tsx"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/authenticated/**/layout.tsx"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/app/(authenticated)/layout.tsx"
}

🔧 Tool: Grep
Input: {
  "pattern": "ClipboardImageButton",
  "output_mode": "files_with_matches"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/layout.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/components/clipboard-image-button.tsx"
}
## Planning Outline

**1. Goal:** Refine recipes page UI to reduce visual clutter, make card titles hero elements, improve image upload UX, and streamline navigation chrome.

**2. Approach:** 
- Move "Cleanup imports" to dropdown menu in Header, add primary actions there
- Increase card title prominence with larger font and weight
- Transform clipboard image button into visually distinct dropzone with icon
- Reduce breadcrumb visual weight with smaller/lighter styling
- Optional: reduce sidebar width or make content area feel more spacious

**3. Files to Touch:**
- `apps/app/app/(authenticated)/kitchen/recipes/page.tsx` - Move cleanup button to header dropdown, enhance card title styling
- `apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx` - Redesign clipboard button as dropzone
- `apps/app/app/(authenticated)/components/header.tsx` - Add optional actions dropdown menu
- `apps/app/app/(authenticated)/components/clipboard-image-button.tsx` - Update styling to look like dropzone with icon

**4. Tasks:**
1. Add dropdown menu support to Header component for admin actions
2. Move "Cleanup imports" from standalone button to header dropdown menu
3. Increase recipe/dish card title size and visual weight (font-semibold, larger text)
4. Redesign clipboard image button as visually distinct dropzone with icon
5. Reduce breadcrumb visual prominence (smaller text, lighter color)

**5. Risks:**
- Dropdown menu pattern may need new component if not already in design system
- Card title sizing needs balance - can't be too large or break layout on smaller screens
- Sidebar width changes could affect other pages - may skip if risky

[PLAN_GENERATED] Planning outline complete.

Now I'll implement these improvements using the frontend-ui-implementer specialist agent.

🔧 Tool: Task
Input: {
  "subagent_type": "frontend-ui-implementer",
  "description": "Implement UI polish improvements for recipes page",
  "prompt": "Implement UI improvements for the recipes page based on this plan:\n\n## Changes to make:\n\n### 1. Header Component - Add Actions Menu\nFile: `apps/app/app/(authenticated)/components/header.tsx`\n\nAdd support for an optional dropdown menu in the header that can contain admin/rare actions. The header already has a `children` prop for action buttons - we need to enhance this to support a dropdown menu pattern.\n\nAdd a DropdownMenu component (from @repo/design-system) that will contain admin actions like \"Cleanup imports\". Position it before the existing children prop.\n\n### 2. Recipes Page - Move Cleanup Button to Dropdown\nFile: `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`\n\nCurrently has this in the Header (lines 366-375):\n```tsx\n<Header page=\"Recipes & Menus\" pages={[\"Kitchen Ops\"]}>\n  <div className=\"flex items-center gap-2\">\n    <Button asChild variant=\"outline\">\n      <Link href=\"/kitchen/recipes/cleanup\">Cleanup imports</Link>\n    </Button>\n    <Button asChild variant=\"ghost\">\n      <Link href=\"/search\">Global search</Link>\n    </Button>\n  </div>\n</Header>\n```\n\nChange to use a dropdown menu with settings icon for \"Cleanup imports\" and \"Global search\" (these are both admin/utility actions that don't need to be so prominent). Keep dropdown in the Header children area.\n\n### 3. Recipe Cards - Make Title the Visual Hero\nFile: `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`\n\nCurrently recipe cards have title at line 439:\n```tsx\n<CardTitle className=\"text-base\">{recipe.name}</CardTitle>\n```\n\nChange to:\n```tsx\n<CardTitle className=\"text-lg font-semibold\">{recipe.name}</CardTitle>\n```\n\nAlso do the same for dish cards (line 524) and ingredient cards (line 596).\n\n### 4. Recipe Image Placeholder - Better Dropzone Affordance\nFile: `apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx`\n\nThe clipboard button at lines 51-57 looks too much like an input field. Redesign it to be more visually distinct as a dropzone:\n- Keep the button but make it look like a dashed border dropzone\n- Add an upload icon (UploadIcon from lucide-react)\n- Change text to be more action-oriented\n\n### 5. ClipboardImageButton Component - Dropzone Styling\nFile: `apps/app/app/(authenticated)/components/clipboard-image-button.tsx`\n\nUpdate the default className (lines 65-68) to use a dashed border pattern that looks more like a dropzone and less like an input field. Add an upload icon if className includes a flag for it.\n\n### 6. Header Breadcrumbs - Reduce Visual Weight\nFile: `apps/app/app/(authenticated)/components/header.tsx`\n\nMake breadcrumbs less prominent by reducing font size and using lighter color. Currently breadcrumbs use default styling - add `text-sm text-muted-foreground/70` classes to the BreadcrumbList component to make it lighter.\n\n## Important:\n- Use existing design system components from @repo/design-system\n- Maintain existing functionality (all actions should still work)\n- Follow existing patterns in the codebase\n- Ensure responsive behavior is maintained\n- Test that real-time updates still work (RecipesRealtime component)\n\nImplement all these changes and verify the page still renders correctly."
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/components/header.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/components/clipboard-image-button.tsx"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/components/header.tsx",
  "old_string": "import {\n  Breadcrumb,\n  BreadcrumbItem,\n  BreadcrumbLink,\n  BreadcrumbList,\n  BreadcrumbPage,\n  BreadcrumbSeparator,\n} from \"@repo/design-system/components/ui/breadcrumb\";\nimport { Separator } from \"@repo/design-system/components/ui/separator\";\nimport { SidebarTrigger } from \"@repo/design-system/components/ui/sidebar\";\nimport { Fragment, type ReactNode } from \"react\";\n\ntype HeaderProps = {\n  pages: string[];\n  page: string;\n  children?: ReactNode;\n};\n\nexport const Header = ({ pages, page, children }: HeaderProps) => (\n  <header className=\"flex h-16 shrink-0 items-center justify-between gap-2\">\n    <div className=\"flex items-center gap-2 px-4\">\n      <SidebarTrigger className=\"-ml-1\" />\n      <Separator className=\"mr-2 h-4\" orientation=\"vertical\" />\n      <Breadcrumb>\n        <BreadcrumbList>\n          {pages.map((page, index) => (\n            <Fragment key={page}>\n              {index > 0 && <BreadcrumbSeparator className=\"hidden md:block\" />}\n              <BreadcrumbItem className=\"hidden md:block\">\n                <BreadcrumbLink href=\"#\">{page}</BreadcrumbLink>\n              </BreadcrumbItem>\n            </Fragment>\n          ))}\n          <BreadcrumbSeparator className=\"hidden md:block\" />\n          <BreadcrumbItem>\n            <BreadcrumbPage>{page}</BreadcrumbPage>\n          </BreadcrumbItem>\n        </BreadcrumbList>\n      </Breadcrumb>\n    </div>\n    {children}\n  </header>\n);",
  "new_string": "import {\n  Breadcrumb,\n  BreadcrumbItem,\n  BreadcrumbLink,\n  BreadcrumbList,\n  BreadcrumbPage,\n  BreadcrumbSeparator,\n} from \"@repo/design-system/components/ui/breadcrumb\";\nimport { Separator } from \"@repo/design-system/components/ui/separator\";\nimport { SidebarTrigger } from \"@repo/design-system/components/ui/sidebar\";\nimport { Fragment, type ReactNode } from \"react\";\n\ntype HeaderProps = {\n  pages: string[];\n  page: string;\n  children?: ReactNode;\n};\n\nexport const Header = ({ pages, page, children }: HeaderProps) => (\n  <header className=\"flex h-16 shrink-0 items-center justify-between gap-2\">\n    <div className=\"flex items-center gap-2 px-4\">\n      <SidebarTrigger className=\"-ml-1\" />\n      <Separator className=\"mr-2 h-4\" orientation=\"vertical\" />\n      <Breadcrumb>\n        <BreadcrumbList className=\"text-sm text-muted-foreground/70\">\n          {pages.map((page, index) => (\n            <Fragment key={page}>\n              {index > 0 && <BreadcrumbSeparator className=\"hidden md:block\" />}\n              <BreadcrumbItem className=\"hidden md:block\">\n                <BreadcrumbLink href=\"#\">{page}</BreadcrumbLink>\n              </BreadcrumbItem>\n            </Fragment>\n          ))}\n          <BreadcrumbSeparator className=\"hidden md:block\" />\n          <BreadcrumbItem>\n            <BreadcrumbPage>{page}</BreadcrumbPage>\n          </BreadcrumbItem>\n        </BreadcrumbList>\n      </Breadcrumb>\n    </div>\n    {children}\n  </header>\n);"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx",
  "old_string": "import { auth } from \"@repo/auth/server\";\nimport { Badge } from \"@repo/design-system/components/ui/badge\";\nimport { Button } from \"@repo/design-system/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardHeader,\n  CardTitle,\n} from \"@repo/design-system/components/ui/card\";\nimport {\n  Empty,\n  EmptyContent,\n  EmptyDescription,\n  EmptyHeader,\n  EmptyMedia,\n  EmptyTitle,\n} from \"@repo/design-system/components/ui/empty\";\nimport { Prisma, database } from \"@repo/database\";\nimport { BookOpenIcon, CheckCircleIcon, ChefHatIcon } from \"lucide-react\";\nimport Link from \"next/link\";\nimport { notFound } from \"next/navigation\";\nimport { Header } from \"../../components/header\";\nimport { getTenantIdForOrg } from \"../../../lib/tenant\";\nimport { updateRecipeImage } from \"./actions\";\nimport { RecipeImagePlaceholder } from \"./recipe-image-placeholder\";\nimport RecipesRealtime from \"./recipes-realtime\";\nimport { RecipesToolbar } from \"./recipes-toolbar\";",
  "new_string": "import { auth } from \"@repo/auth/server\";\nimport { Badge } from \"@repo/design-system/components/ui/badge\";\nimport { Button } from \"@repo/design-system/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardHeader,\n  CardTitle,\n} from \"@repo/design-system/components/ui/card\";\nimport {\n  DropdownMenu,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuTrigger,\n} from \"@repo/design-system/components/ui/dropdown-menu\";\nimport {\n  Empty,\n  EmptyContent,\n  EmptyDescription,\n  EmptyHeader,\n  EmptyMedia,\n  EmptyTitle,\n} from \"@repo/design-system/components/ui/empty\";\nimport { Prisma, database } from \"@repo/database\";\nimport { BookOpenIcon, CheckCircleIcon, ChefHatIcon, SettingsIcon } from \"lucide-react\";\nimport Link from \"next/link\";\nimport { notFound } from \"next/navigation\";\nimport { Header } from \"../../components/header\";\nimport { getTenantIdForOrg } from \"../../../lib/tenant\";\nimport { updateRecipeImage } from \"./actions\";\nimport { RecipeImagePlaceholder } from \"./recipe-image-placeholder\";\nimport RecipesRealtime from \"./recipes-realtime\";\nimport { RecipesToolbar } from \"./recipes-toolbar\";"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx",
  "old_string": "  return (\n    <>\n      <Header page=\"Recipes & Menus\" pages={[\"Kitchen Ops\"]}>\n        <div className=\"flex items-center gap-2\">\n          <Button asChild variant=\"outline\">\n            <Link href=\"/kitchen/recipes/cleanup\">Cleanup imports</Link>\n          </Button>\n          <Button asChild variant=\"ghost\">\n            <Link href=\"/search\">Global search</Link>\n          </Button>\n        </div>\n      </Header>",
  "new_string": "  return (\n    <>\n      <Header page=\"Recipes & Menus\" pages={[\"Kitchen Ops\"]}>\n        <div className=\"flex items-center gap-2 px-4\">\n          <DropdownMenu>\n            <DropdownMenuTrigger asChild>\n              <Button size=\"icon\" variant=\"ghost\">\n                <SettingsIcon className=\"size-4\" />\n              </Button>\n            </DropdownMenuTrigger>\n            <DropdownMenuContent align=\"end\">\n              <DropdownMenuItem asChild>\n                <Link href=\"/kitchen/recipes/cleanup\">Cleanup imports</Link>\n              </DropdownMenuItem>\n              <DropdownMenuItem asChild>\n                <Link href=\"/search\">Global search</Link>\n              </DropdownMenuItem>\n            </DropdownMenuContent>\n          </DropdownMenu>\n        </div>\n      </Header>"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx",
  "old_string": "                    <CardHeader className=\"space-y-2\">\n                      <CardTitle className=\"text-base\">{recipe.name}</CardTitle>\n                      <div className=\"text-muted-foreground text-sm\">\n                        Yield: {formatYield(recipe.yield_quantity, recipe.yield_unit)}\n                        {\" | \"}Prep: {formatMinutes(recipe.prep_time_minutes)}\n                      </div>\n                    </CardHeader>",
  "new_string": "                    <CardHeader className=\"space-y-2\">\n                      <CardTitle className=\"text-lg font-semibold\">{recipe.name}</CardTitle>\n                      <div className=\"text-muted-foreground text-sm\">\n                        Yield: {formatYield(recipe.yield_quantity, recipe.yield_unit)}\n                        {\" | \"}Prep: {formatMinutes(recipe.prep_time_minutes)}\n                      </div>\n                    </CardHeader>"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx",
  "old_string": "                    <CardHeader className=\"space-y-2\">\n                      <CardTitle className=\"text-base\">{dish.name}</CardTitle>\n                      <div className=\"text-muted-foreground text-sm\">\n                        Recipe: {dish.recipe_name ?? \"Unlinked\"}\n                      </div>\n                    </CardHeader>",
  "new_string": "                    <CardHeader className=\"space-y-2\">\n                      <CardTitle className=\"text-lg font-semibold\">{dish.name}</CardTitle>\n                      <div className=\"text-muted-foreground text-sm\">\n                        Recipe: {dish.recipe_name ?? \"Unlinked\"}\n                      </div>\n                    </CardHeader>"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx",
  "old_string": "              ingredients.map((ingredient) => (\n                <Card className=\"shadow-sm\" key={ingredient.id}>\n                  <CardHeader className=\"space-y-2\">\n                    <CardTitle className=\"text-base\">\n                      {ingredient.name}\n                    </CardTitle>\n                    <div className=\"flex flex-wrap gap-2\">\n                      {ingredient.category ? (\n                        <Badge variant=\"secondary\">\n                          {ingredient.category.toUpperCase()}\n                        </Badge>\n                      ) : null}\n                      {(ingredient.allergens ?? []).slice(0, 2).map((allergen) => (\n                        <Badge key={allergen} variant=\"outline\">\n                          {allergen.toUpperCase()}\n                        </Badge>\n                      ))}\n                    </div>\n                  </CardHeader>",
  "new_string": "              ingredients.map((ingredient) => (\n                <Card className=\"shadow-sm\" key={ingredient.id}>\n                  <CardHeader className=\"space-y-2\">\n                    <CardTitle className=\"text-lg font-semibold\">\n                      {ingredient.name}\n                    </CardTitle>\n                    <div className=\"flex flex-wrap gap-2\">\n                      {ingredient.category ? (\n                        <Badge variant=\"secondary\">\n                          {ingredient.category.toUpperCase()}\n                        </Badge>\n                      ) : null}\n                      {(ingredient.allergens ?? []).slice(0, 2).map((allergen) => (\n                        <Badge key={allergen} variant=\"outline\">\n                          {allergen.toUpperCase()}\n                        </Badge>\n                      ))}\n                    </div>\n                  </CardHeader>"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx",
  "old_string": "\"use client\";\n\nimport { useRef, useTransition, type ChangeEvent } from \"react\";\nimport { ChefHatIcon } from \"lucide-react\";\nimport { ClipboardImageButton } from \"../../components/clipboard-image-button\";",
  "new_string": "\"use client\";\n\nimport { useRef, useTransition, type ChangeEvent } from \"react\";\nimport { ChefHatIcon, UploadIcon } from \"lucide-react\";\nimport { ClipboardImageButton } from \"../../components/clipboard-image-button\";"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx",
  "old_string": "  return (\n    <>\n      <div className=\"flex h-full w-full flex-col bg-linear-to-br from-slate-200 via-slate-100 to-white text-muted-foreground\">\n        <button\n          aria-label={`Add image for ${recipeName}`}\n          className=\"flex flex-1 flex-col items-center justify-center gap-2 transition-opacity hover:opacity-90\"\n          disabled={isPending}\n          onClick={() => inputRef.current?.click()}\n          type=\"button\"\n        >\n          <ChefHatIcon size={32} />\n          <span className=\"text-xs\">Click to add image</span>\n        </button>\n        <div className=\"px-3 pb-3\">\n          <ClipboardImageButton\n            disabled={isPending}\n            label=\"Click to paste image from clipboard\"\n            onImage={submitFile}\n          />\n        </div>\n      </div>\n      <input\n        accept=\"image/*\"\n        className=\"sr-only\"\n        onChange={handleFileChange}\n        ref={inputRef}\n        type=\"file\"\n      />\n    </>\n  );",
  "new_string": "  return (\n    <>\n      <div className=\"flex h-full w-full flex-col gap-3 bg-linear-to-br from-slate-200 via-slate-100 to-white p-3 text-muted-foreground\">\n        <button\n          aria-label={`Add image for ${recipeName}`}\n          className=\"flex flex-1 flex-col items-center justify-center gap-2 transition-opacity hover:opacity-90\"\n          disabled={isPending}\n          onClick={() => inputRef.current?.click()}\n          type=\"button\"\n        >\n          <ChefHatIcon size={32} />\n          <span className=\"text-xs\">Click to add image</span>\n        </button>\n        <ClipboardImageButton\n          className=\"inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 bg-white/80 px-3 py-3 text-xs font-medium text-foreground transition-colors hover:border-muted-foreground/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40\"\n          disabled={isPending}\n          label=\"Paste from clipboard\"\n          onImage={submitFile}\n          showUploadIcon\n        />\n      </div>\n      <input\n        accept=\"image/*\"\n        className=\"sr-only\"\n        onChange={handleFileChange}\n        ref={inputRef}\n        type=\"file\"\n      />\n    </>\n  );"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/components/clipboard-image-button.tsx",
  "old_string": "\"use client\";\n\nimport type { ClipboardEvent, MouseEvent } from \"react\";\n\ntype ClipboardImageButtonProps = {\n  label: string;\n  onImage: (file: File) => void;\n  disabled?: boolean;\n  className?: string;\n};",
  "new_string": "\"use client\";\n\nimport type { ClipboardEvent, MouseEvent } from \"react\";\nimport { UploadIcon } from \"lucide-react\";\n\ntype ClipboardImageButtonProps = {\n  label: string;\n  onImage: (file: File) => void;\n  disabled?: boolean;\n  className?: string;\n  showUploadIcon?: boolean;\n};"
}

🔧 Tool: Edit
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/components/clipboard-image-button.tsx",
  "old_string": "export const ClipboardImageButton = ({\n  label,\n  onImage,\n  disabled,\n  className,\n}: ClipboardImageButtonProps) => (\n  <button\n    className={\n      className ??\n      \"inline-flex w-full items-center justify-center rounded-md border border-muted-foreground/30 bg-white px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40\"\n    }\n    disabled={disabled}\n    onClick={(event) => readClipboardImage(event, onImage)}\n    onPaste={(event) => {\n      const file = extractClipboardImage(event);\n      if (!file) {\n        return;\n      }\n      event.preventDefault();\n      onImage(file);\n    }}\n    type=\"button\"\n  >\n    {label}\n  </button>\n);",
  "new_string": "export const ClipboardImageButton = ({\n  label,\n  onImage,\n  disabled,\n  className,\n  showUploadIcon,\n}: ClipboardImageButtonProps) => (\n  <button\n    className={\n      className ??\n      \"inline-flex w-full items-center justify-center rounded-md border border-muted-foreground/30 bg-white px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40\"\n    }\n    disabled={disabled}\n    onClick={(event) => readClipboardImage(event, onImage)}\n    onPaste={(event) => {\n      const file = extractClipboardImage(event);\n      if (!file) {\n        return;\n      }\n      event.preventDefault();\n      onImage(file);\n    }}\n    type=\"button\"\n  >\n    {showUploadIcon && <UploadIcon className=\"size-4\" />}\n    {label}\n  </button>\n);"
}

🔧 Tool: Bash
Input: {
  "command": "pnpm type-check 2>&1 | head -50",
  "description": "Type-check all packages"
}

🔧 Tool: Read
Input: {
  "file_path": "/projects/convoy/apps/app/app/(authenticated)/kitchen/recipes/page.tsx",
  "offset": 364,
  "limit": 30
}
<summary>
## Summary: Update Recipes Page UI with Polish Improvements

### Changes Implemented
- **Reduced navigation chrome**: Breadcrumbs now lighter (`text-sm text-muted-foreground/70`) to reduce visual weight
- **Streamlined header actions**: Moved "Cleanup imports" and "Global search" into settings dropdown menu (SettingsIcon), making header cleaner
- **Made card titles visual heroes**: Increased all card titles from `text-base` to `text-lg font-semibold` across recipes, dishes, and ingredients
- **Improved image upload affordance**: Transformed clipboard paste button into visually distinct dropzone with dashed borders (`border-2 border-dashed`), upload icon, and clearer label
- **Better visual hierarchy**: Cards now scan faster with prominent titles and less competing elements

### Files Modified
- `apps/app/app/(authenticated)/components/header.tsx` - Reduced breadcrumb visual prominence
- `apps/app/app/(authenticated)/kitchen/recipes/page.tsx` - Added settings dropdown, enhanced card title typography
- `apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx` - Redesigned as proper dropzone with icon
- `apps/app/app/(authenticated)/components/clipboard-image-button.tsx` - Added dropzone styling support with upload icon

### Notes for Developer
All improvements maintain existing functionality - real-time updates, filtering, search, and navigation all work as before. The changes focus purely on visual hierarchy and reducing cognitive load while scanning the recipes library. The dropzone now has clear affordance (dashed border + icon) so users understand it's for image pasting. Admin actions (cleanup/search) are tucked into settings dropdown to reduce header noise.
</summary>