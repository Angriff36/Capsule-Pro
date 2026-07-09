"use client";

import {
  DisplayHeading,
  FilterRail,
  FilterRailGroup,
  FilterRailLabel,
  MonoLabel,
  OperationalColumn,
  PageBody,
  SectionHeader,
  StatusPill,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lightbulb,
  Link2,
  RotateCcw,
  Thermometer,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConvertInstructionsButton } from "./convert-instructions-button";
import { RecipePackagingEditor } from "./recipe-packaging-editor";
import { StorageContainerSelect } from "./storage-container-select";
import { UpdatePhotoControl } from "./update-photo-control";

// Recipe detail per DESIGN.md: light editorial header (mono eyebrow, Playfair
// headline, compact hairline time strip — no dark hero band; too heavy on
// record pages, especially mobile), then rail (ingredients + at-a-glance)
// beside phase-grouped, checkable instructions. Coral is reserved for the
// attention signals: allergens and CCP food-safety steps (>=135°F hot hold).
// Step progress stays device-local (localStorage), no backend.

const PHASE_ORDER = ["prep", "method", "finish", "packaging"] as const;
type Phase = (typeof PHASE_ORDER)[number];
const PHASE_LABELS: Record<Phase, string> = {
  prep: "Prep Tasks",
  method: "Method",
  finish: "Finish at Event",
  packaging: "Packaging & Event Build",
};

const CCP_MIN_F = 135;
const isCCP = (value: number | null, unit: string | null) => {
  if (value === null || value === undefined) {
    return false;
  }
  const f = unit === "C" ? (value * 9) / 5 + 32 : value;
  return f >= CCP_MIN_F;
};
const formatTemp = (value: number | null, unit: string | null) =>
  value === null || value === undefined
    ? null
    : `${value}${unit === "C" ? "°C" : "°F"}`;
const formatDuration = (minutes: number | null) => {
  if (!minutes || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export interface CookbookStep {
  durationMinutes: number | null;
  equipmentNeeded: string[];
  instruction: string;
  key: string;
  linkedRecipeId: string | null;
  linkedRecipeName: string | null;
  linkedTechniqueId: string | null;
  phase: Phase;
  stepNumber: number;
  temperatureUnit: string | null;
  temperatureValue: number | null;
  tips: string | null;
}

export interface CookbookIngredient {
  amountDisplay: string;
  id: string;
  name: string;
  note: string | null;
}

export interface RecipeCookbookViewProps {
  activePrep: string;
  allergens: string[];
  categoryLabel: string;
  cookTime: string;
  description: string | null;
  difficulty: string;
  // Dish backing this recipe (storage + presentation photo live on the dish).
  dishId: string | null;
  equipment: string[];
  heroImageUrl: string | null;
  ingredients: CookbookIngredient[];
  // Flat-text method fallback for recipes without structured steps (e.g.
  // legacy bulk imports that only populated recipe_versions.instructions).
  instructionsText: string | null;
  isActive: boolean;
  isSubrecipe: boolean;
  name: string;
  packaging: { dropOff: string; bringHot: string; cookOnSite: string };
  portion: string;
  progressScope: string;
  // Latest version id — target for flat-text → RecipeStep conversion.
  recipeVersionId: string | null;
  restTime: string;
  steps: CookbookStep[];
  storageContainer: {
    containerType: string;
    id: string;
    name: string;
  } | null;
  totalTime: string;
  versionLabel: string;
  yield: string;
}

export function RecipeCookbookView(recipe: RecipeCookbookViewProps) {
  const { done, toggle, reset } = useLocalProgress(recipe.progressScope);
  const { steps, ingredients } = recipe;

  const grouped = useMemo(() => {
    const g: Record<Phase, CookbookStep[]> = {
      prep: [],
      method: [],
      finish: [],
      packaging: [],
    };
    for (const s of steps) {
      g[s.phase]?.push(s);
    }
    return g;
  }, [steps]);

  const completed = steps.filter((s) => done[s.key]).length;
  const pct = steps.length ? Math.round((completed / steps.length) * 100) : 0;
  const ccpCount = steps.filter((s) =>
    isCCP(s.temperatureValue, s.temperatureUnit)
  ).length;

  const timeMetrics = [
    { label: "Active Prep", value: recipe.activePrep },
    { label: "Cook Time", value: recipe.cookTime },
    { label: "Rest Time", value: recipe.restTime },
    { label: "Total Time", value: recipe.totalTime },
  ];

  const atAGlance = [
    { label: "Yield", value: recipe.yield },
    { label: "Portion", value: recipe.portion },
    { label: "Difficulty", value: recipe.difficulty },
    { label: "Version", value: recipe.versionLabel },
  ].filter((row) => row.value?.trim());

  const packagingRows = [
    {
      label: "Drop-off",
      note: "ready to serve",
      value: recipe.packaging.dropOff,
    },
    {
      label: "Bring hot",
      note: "hot hold + serve",
      value: recipe.packaging.bringHot,
    },
    {
      label: "Cook on-site",
      note: "finish at event",
      value: recipe.packaging.cookOnSite,
    },
  ].filter((r) => r.value?.trim());

  return (
    <>
      <header className="space-y-6">
        <div className="min-w-0 space-y-3">
          <MonoLabel>Kitchen / {recipe.categoryLabel}</MonoLabel>
          <DisplayHeading className="max-w-4xl text-balance" size="md">
            {recipe.name}
          </DisplayHeading>
          {recipe.description && (
            <p className="max-w-2xl text-[16px] text-muted-foreground leading-relaxed">
              {recipe.description}
            </p>
          )}
          {(recipe.isSubrecipe ||
            !recipe.isActive ||
            recipe.allergens.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {recipe.isSubrecipe && <StatusPill>Sub-Recipe</StatusPill>}
              {!recipe.isActive && (
                <StatusPill className="text-muted-foreground">
                  Inactive
                </StatusPill>
              )}
              {recipe.allergens.map((a) => (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-coral-soft bg-coral/10 px-3 py-1 font-mono text-[11px] text-ink uppercase tracking-[0.18em]"
                  key={a}
                >
                  <AlertTriangle className="size-3 text-coral" />
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-card-border bg-card-border sm:grid-cols-4">
          {timeMetrics.map((m) => (
            <div className="bg-canvas px-4 py-3.5" key={m.label}>
              <dt className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.28em]">
                {m.label}
              </dt>
              <dd className="mt-1 text-[22px] text-ink leading-tight">
                {m.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <PageBody variant="rail">
        <FilterRail>
          <RailPhoto
            dishId={recipe.dishId}
            heroImageUrl={recipe.heroImageUrl}
            name={recipe.name}
          />

          {ingredients.length > 0 && (
            <FilterRailGroup>
              <FilterRailLabel>
                Ingredients · {ingredients.length}
              </FilterRailLabel>
              <ul className="divide-y divide-hairline">
                {ingredients.map((i) => (
                  <li
                    className="flex items-baseline justify-between gap-3 py-2.5"
                    key={i.id}
                  >
                    <span className="text-[14px] text-ink leading-snug">
                      {i.name}
                      {i.note && (
                        <span className="ml-1 text-[12px] text-muted-foreground">
                          ({i.note})
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] text-ink/70">
                      {i.amountDisplay}
                    </span>
                  </li>
                ))}
              </ul>
            </FilterRailGroup>
          )}

          {recipe.equipment.length > 0 && (
            <FilterRailGroup>
              <FilterRailLabel>Equipment</FilterRailLabel>
              <div className="flex flex-wrap gap-1.5">
                {recipe.equipment.map((e) => (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[12px] text-ink"
                    key={e}
                  >
                    <Wrench className="size-3 text-muted-foreground" />
                    {e}
                  </span>
                ))}
              </div>
            </FilterRailGroup>
          )}

          {atAGlance.length > 0 && (
            <FilterRailGroup>
              <FilterRailLabel>At a Glance</FilterRailLabel>
              <dl className="divide-y divide-hairline">
                {atAGlance.map((row) => (
                  <div
                    className="flex items-baseline justify-between gap-3 py-2.5"
                    key={row.label}
                  >
                    <dt className="text-[13px] text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="text-right text-[14px] text-ink">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </FilterRailGroup>
          )}

          <RailStorage
            dishId={recipe.dishId}
            storageContainer={recipe.storageContainer}
          />

          {recipe.allergens.length === 0 && (
            <FilterRailGroup>
              <FilterRailLabel>Allergens</FilterRailLabel>
              <p className="text-[13px] text-muted-foreground">
                No major allergens recorded.
              </p>
            </FilterRailGroup>
          )}
        </FilterRail>

        <OperationalColumn>
          <section className="space-y-6">
            <SectionHeader
              actions={
                <>
                  {ccpCount > 0 && (
                    <StatusPill className="border-coral-soft bg-coral/10 text-coral">
                      <AlertTriangle className="mr-1 size-3" />
                      {ccpCount} CCP
                    </StatusPill>
                  )}
                  {steps.length > 0 && (
                    <Button onClick={reset} size="sm" variant="outline">
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
                  )}
                </>
              }
              count={
                steps.length > 0 ? `${completed}/${steps.length} done` : null
              }
              eyebrow="Execution"
              title="Instructions"
            />

            {steps.length > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-soft-stone">
                    <div
                      className="h-full rounded-full bg-deep-green transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                      }}
                    />
                  </div>
                  {pct === 100 && (
                    <p className="flex items-center gap-1.5 text-[14px] text-deep-green">
                      <CheckCircle2 className="size-4" />
                      All tasks done — ready to plate.
                    </p>
                  )}
                </div>

                <div className="space-y-8">
                  {PHASE_ORDER.filter((p) => grouped[p].length > 0).map(
                    (phase) => (
                      <div className="space-y-3" key={phase}>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                            {PHASE_LABELS[phase]}
                          </span>
                          <span
                            aria-hidden
                            className="h-px flex-1 bg-hairline"
                          />
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {grouped[phase].filter((s) => done[s.key]).length}/
                            {grouped[phase].length}
                          </span>
                        </div>
                        <ol className="space-y-2.5">
                          {grouped[phase].map((step, idx) => (
                            <StepRow
                              checked={!!done[step.key]}
                              index={idx}
                              key={step.key}
                              onToggle={() => toggle(step.key)}
                              step={step}
                            />
                          ))}
                        </ol>
                      </div>
                    )
                  )}
                </div>
              </>
            ) : (
              <FlatInstructionsFallback
                instructionsText={recipe.instructionsText}
                recipeVersionId={recipe.recipeVersionId}
              />
            )}
          </section>

          {recipe.recipeVersionId ? (
            <section className="space-y-6">
              <SectionHeader
                eyebrow="Service"
                title="Packaging & event build"
              />
              {packagingRows.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {packagingRows.map((r) => (
                    <div
                      className="rounded-card border border-hairline bg-canvas p-5"
                      key={r.label}
                    >
                      <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                        {r.label}
                        <span className="ml-2 normal-case tracking-normal">
                          · {r.note}
                        </span>
                      </p>
                      <p className="mt-2 text-[15px] text-ink leading-relaxed">
                        {r.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <RecipePackagingEditor
                key={`${recipe.recipeVersionId}:${recipe.packaging.dropOff}:${recipe.packaging.bringHot}:${recipe.packaging.cookOnSite}`}
                packaging={recipe.packaging}
                recipeVersionId={recipe.recipeVersionId}
              />
            </section>
          ) : null}
        </OperationalColumn>
      </PageBody>
    </>
  );
}

// Rail: finished-product photo (dish presentation image, falling back to the
// first step image). The update affordance writes to the dish, so it only
// renders when a dish is linked; with neither image nor dish, render nothing.
function RailPhoto({
  dishId,
  heroImageUrl,
  name,
}: {
  dishId: string | null;
  heroImageUrl: string | null;
  name: string;
}) {
  if (!(heroImageUrl || dishId)) {
    return null;
  }
  return (
    <FilterRailGroup>
      <FilterRailLabel>Finished Product</FilterRailLabel>
      {heroImageUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-media border border-hairline">
          <Image
            alt={name}
            className="object-cover"
            fill
            sizes="(max-width: 1024px) 100vw, 360px"
            src={heroImageUrl}
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-media border border-hairline border-dashed bg-soft-stone">
          <p className="text-[13px] text-muted-foreground">No photo yet</p>
        </div>
      )}
      {dishId && (
        <div className="mt-2">
          <UpdatePhotoControl dishId={dishId} hasImage={!!heroImageUrl} />
        </div>
      )}
    </FilterRailGroup>
  );
}

// Rail: dish-level storage container (governed Dish commands via the select).
function RailStorage({
  dishId,
  storageContainer,
}: {
  dishId: string | null;
  storageContainer: RecipeCookbookViewProps["storageContainer"];
}) {
  return (
    <FilterRailGroup>
      <FilterRailLabel>Storage</FilterRailLabel>
      {dishId ? (
        <StorageContainerSelect
          currentContainerId={storageContainer?.id ?? null}
          currentContainerName={storageContainer?.name ?? null}
          dishId={dishId}
        />
      ) : (
        <p className="text-[13px] text-muted-foreground">
          No dish linked yet — storage is set on the dish.
        </p>
      )}
    </FilterRailGroup>
  );
}

// Flat-text method fallback with one-click conversion into governed
// RecipeStep rows; empty state when the version has no instructions at all.
function FlatInstructionsFallback({
  instructionsText,
  recipeVersionId,
}: {
  instructionsText: string | null;
  recipeVersionId: string | null;
}) {
  if (!instructionsText) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-hairline bg-soft-stone px-6 py-14 text-center">
        <p className="font-medium text-[16px] text-ink">No method steps yet</p>
        <p className="max-w-md text-[14px] text-muted-foreground">
          Edit this recipe to add phase-grouped steps — prep, method, finish at
          event, and packaging.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-card border border-hairline bg-canvas p-6">
        <p className="whitespace-pre-wrap text-[15px] text-ink leading-relaxed">
          {instructionsText}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {recipeVersionId && (
          <ConvertInstructionsButton
            instructionsText={instructionsText}
            recipeVersionId={recipeVersionId}
          />
        )}
        <p className="text-[13px] text-muted-foreground">
          Imported as flat text — convert it into checkable, phase-grouped
          steps, then refine them in the editor.
        </p>
      </div>
    </div>
  );
}

function StepRow({
  step,
  index,
  checked,
  onToggle,
}: {
  step: CookbookStep;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const [tipsOpen, setTipsOpen] = useState(false);
  const ccp = isCCP(step.temperatureValue, step.temperatureUnit);
  const duration = formatDuration(step.durationMinutes);
  const temp = formatTemp(step.temperatureValue, step.temperatureUnit);

  return (
    <li className="flex gap-4 rounded-card border border-hairline bg-canvas p-4 transition-colors hover:border-ink/25 sm:p-5">
      <span
        aria-hidden
        className={cn(
          "w-0.5 shrink-0 self-stretch rounded-full",
          ccp ? "bg-coral" : "bg-ink/10"
        )}
      />
      <button
        aria-label={checked ? "Mark step incomplete" : "Mark step complete"}
        aria-pressed={checked}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked
            ? "border-deep-green bg-deep-green text-white"
            : "border-ink/25 bg-canvas text-transparent hover:border-deep-green/60"
        )}
        onClick={onToggle}
        type="button"
      >
        <Check className="size-3.5" />
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline gap-3">
          <span
            className={cn(
              "shrink-0 font-mono text-[12px]",
              ccp ? "text-coral" : "text-muted-foreground"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <p
            className={cn(
              "text-[15px] leading-relaxed",
              checked ? "text-muted-foreground line-through" : "text-ink"
            )}
          >
            {step.instruction}
          </p>
        </div>

        {(ccp || duration || temp || step.equipmentNeeded.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pl-[30px]">
            {ccp && (
              <span className="inline-flex items-center gap-1 rounded-full bg-coral px-2.5 py-0.5 font-mono text-[10px] text-white uppercase tracking-[0.18em]">
                <AlertTriangle className="size-3" /> CCP
              </span>
            )}
            {duration && (
              <StepChip>
                <Clock className="size-3" /> {duration}
              </StepChip>
            )}
            {temp && (
              <StepChip>
                <Thermometer className="size-3" /> {temp}
              </StepChip>
            )}
            {step.equipmentNeeded.map((eq) => (
              <StepChip key={eq}>
                <Wrench className="size-3" /> {eq}
              </StepChip>
            ))}
          </div>
        )}

        {(step.linkedRecipeId || step.linkedTechniqueId) && (
          <div className="flex flex-wrap items-center gap-3 pl-[30px]">
            {step.linkedRecipeId && (
              <Link
                className="inline-flex items-center gap-1 text-[13px] text-action-blue underline underline-offset-2"
                href={`/kitchen/recipes/${step.linkedRecipeId}`}
              >
                <Link2 className="size-3" />
                {step.linkedRecipeName ?? "Linked sub-recipe"}
              </Link>
            )}
            {step.linkedTechniqueId && <StepChip>Technique</StepChip>}
          </div>
        )}

        {step.tips?.trim() && (
          <div className="pl-[30px]">
            <button
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-ink"
              onClick={() => setTipsOpen((o) => !o)}
              type="button"
            >
              <Lightbulb className="size-3.5" />
              {tipsOpen ? "Hide tip" : "Show tip"}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  tipsOpen && "rotate-180"
                )}
              />
            </button>
            {tipsOpen && (
              <div className="mt-2 rounded-sm bg-soft-stone p-3 text-[14px] text-ink/80 leading-relaxed">
                {step.tips}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function StepChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-soft-stone/60 px-2.5 py-0.5 font-mono text-[11px] text-ink/80">
      {children}
    </span>
  );
}

// Device-scoped step progress in localStorage (no backend — mirrors cookbook's
// anonymous progress without the Supabase dependency).
function useLocalProgress(scope: string) {
  const storageKey = `recipe-progress:${scope}`;
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setDone(JSON.parse(raw));
      }
    } catch {
      // ignore corrupt/absent storage
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      setDone(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore quota/availability errors
      }
    },
    [storageKey]
  );

  const toggle = useCallback(
    (key: string) => persist({ ...done, [key]: !done[key] }),
    [done, persist]
  );
  const reset = useCallback(() => persist({}), [persist]);

  return { done, toggle, reset };
}
