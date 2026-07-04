"use client";

import { cn } from "@repo/design-system/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  Hourglass,
  Lightbulb,
  Link2,
  Package,
  RotateCcw,
  Thermometer,
  Timer,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

// Cookbook-integration: recipe detail styled after c:/Projects/cookbook, bound to
// capsule's real data. Keeps ALL of capsule's rich step metadata (duration,
// temperature/HACCP CCP, equipment, tips) and adds cookbook's phase grouping,
// packaging notes, sub-recipe/technique links, and checkable step progress.

const PHASE_ORDER = ["prep", "method", "finish", "packaging"] as const;
type Phase = (typeof PHASE_ORDER)[number];
const PHASE_LABELS: Record<Phase, string> = {
  prep: "Prep Tasks",
  method: "Method",
  finish: "Finish at Event",
  packaging: "Packaging & Event Build",
};

// HACCP hot-holding critical control point threshold (Fahrenheit).
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
  equipment: string[];
  heroImageUrl: string | null;
  ingredients: CookbookIngredient[];
  isActive: boolean;
  isSubrecipe: boolean;
  name: string;
  packaging: { dropOff: string; bringHot: string; cookOnSite: string };
  portion: string;
  progressScope: string;
  restTime: string;
  steps: CookbookStep[];
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

  const packagingRows = [
    { label: "Drop-Off (ready to serve)", value: recipe.packaging.dropOff },
    { label: "Bring-Hot (hot hold + serve)", value: recipe.packaging.bringHot },
    {
      label: "Cook On-Site (finish at event)",
      value: recipe.packaging.cookOnSite,
    },
  ].filter((r) => r.value?.trim());

  return (
    <div className="pb-12">
      <div className="relative h-64 w-full overflow-hidden sm:h-80">
        <SmartImage
          alt={recipe.name}
          className="h-full w-full"
          src={recipe.heroImageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-4xl px-4 pb-6 sm:px-6">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-orange-300 text-xs uppercase tracking-widest">
                {recipe.categoryLabel}
              </p>
              {recipe.isSubrecipe && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium text-[10px] text-white uppercase tracking-wide">
                  Sub-Recipe
                </span>
              )}
              {!recipe.isActive && (
                <span className="rounded-full bg-red-500/30 px-2 py-0.5 font-medium text-[10px] text-red-100 uppercase tracking-wide">
                  Inactive
                </span>
              )}
            </div>
            <h1 className="mt-1 font-bold text-3xl text-white tracking-tight sm:text-4xl">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="mt-2 max-w-2xl text-sm text-stone-200">
                {recipe.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="-mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Timer} label="Active Prep" value={recipe.activePrep} />
          <Stat icon={Flame} label="Cook Time" value={recipe.cookTime} />
          <Stat icon={Hourglass} label="Rest Time" value={recipe.restTime} />
          <Stat icon={Clock} label="Total Time" value={recipe.totalTime} />
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4">
          <Meta label="Yield" value={recipe.yield} />
          <Meta label="Portion" value={recipe.portion} />
          <Meta label="Difficulty" value={recipe.difficulty} />
          <Meta label="Version" value={recipe.versionLabel} />
        </div>

        {(recipe.allergens.length > 0 || recipe.equipment.length > 0) && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="mb-2 font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                Allergens
              </p>
              <AllergenBadges allergens={recipe.allergens} />
            </div>
            {recipe.equipment.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                  <Wrench className="h-3.5 w-3.5" /> Equipment Needed
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recipe.equipment.map((e) => (
                    <span
                      className="rounded-md bg-secondary px-2.5 py-1 font-medium text-secondary-foreground text-xs"
                      key={e}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
          {ingredients.length > 0 && (
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <h2 className="mb-3 font-bold text-lg tracking-tight">
                Ingredients
              </h2>
              <ul className="overflow-hidden rounded-xl border border-border bg-card">
                {ingredients.map((i) => (
                  <li
                    className="flex items-baseline justify-between gap-3 border-border border-b px-4 py-2.5 text-sm last:border-0"
                    key={i.id}
                  >
                    <span className="font-medium text-foreground">
                      {i.name}
                      {i.note && (
                        <span className="ml-1 text-muted-foreground text-xs">
                          ({i.note})
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-primary">
                      {i.amountDisplay}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <section className={cn(ingredients.length === 0 && "lg:col-span-2")}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-lg tracking-tight">
                  Instructions
                </h2>
                {ccpCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 font-semibold text-white text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    {ccpCount} CCP
                  </span>
                )}
              </div>
              {steps.length > 0 && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
                  onClick={reset}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              )}
            </div>

            {steps.length > 0 && (
              <div className="mb-6 rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {completed} of {steps.length} tasks complete
                  </span>
                  <span className="font-bold text-primary">{pct}%</span>
                </div>
                <ProgressBar value={pct} />
                {pct === 100 && (
                  <p className="mt-2 inline-flex items-center gap-1.5 font-medium text-emerald-700 text-sm">
                    <CheckCircle2 className="h-4 w-4" /> All tasks done — ready
                    to plate!
                  </p>
                )}
              </div>
            )}

            <div className="space-y-6">
              {PHASE_ORDER.filter((p) => grouped[p].length > 0).map((phase) => (
                <div key={phase}>
                  <h3 className="mb-2 font-bold text-muted-foreground text-sm uppercase tracking-wider">
                    {PHASE_LABELS[phase]}
                  </h3>
                  <ol className="space-y-2">
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
              ))}
            </div>

            {packagingRows.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-2 flex items-center gap-1.5 font-bold text-muted-foreground text-sm uppercase tracking-wider">
                  <Package className="h-4 w-4" /> Packaging / Event Build
                </h3>
                <div className="space-y-2">
                  {packagingRows.map((r) => (
                    <div
                      className="rounded-xl border border-border bg-card p-4"
                      key={r.label}
                    >
                      <p className="font-bold text-foreground text-sm">
                        {r.label}
                      </p>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {r.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
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
    <li
      className={cn(
        "group flex gap-3 rounded-xl border bg-card p-3.5 transition-colors",
        checked
          ? "border-emerald-200 bg-emerald-50/60"
          : ccp
            ? "border-amber-300"
            : "border-border hover:border-primary/30"
      )}
    >
      <button
        aria-label="Toggle task"
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          checked
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-muted-foreground/30 text-transparent hover:border-primary"
        )}
        onClick={onToggle}
        type="button"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 font-bold text-xs",
              checked
                ? "text-emerald-600"
                : ccp
                  ? "text-amber-600"
                  : "text-primary"
            )}
          >
            {index + 1}
          </span>
          <p
            className={cn(
              "text-sm leading-relaxed transition-colors",
              checked ? "text-muted-foreground line-through" : "text-foreground"
            )}
          >
            {step.instruction}
          </p>
        </div>

        {(duration || temp || step.equipmentNeeded.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
            {ccp && (
              <Badge className="bg-amber-500 text-white">
                <AlertTriangle className="h-3 w-3" /> CCP
              </Badge>
            )}
            {duration && (
              <Badge>
                <Clock className="h-3 w-3" /> {duration}
              </Badge>
            )}
            {temp && (
              <Badge className={cn(ccp && "bg-amber-900/10 text-amber-900")}>
                <Thermometer className="h-3 w-3" /> {temp}
              </Badge>
            )}
            {step.equipmentNeeded.map((eq) => (
              <Badge key={eq}>
                <Wrench className="h-3 w-3" /> {eq}
              </Badge>
            ))}
          </div>
        )}

        {(step.linkedRecipeId || step.linkedTechniqueId) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
            {step.linkedRecipeId && (
              <Link
                className="inline-flex items-center gap-1 font-semibold text-orange-700 text-xs underline decoration-orange-300 underline-offset-2 hover:decoration-orange-600"
                href={`/kitchen/recipes/${step.linkedRecipeId}`}
              >
                <Link2 className="h-3 w-3" />
                {step.linkedRecipeName ?? "Linked sub-recipe"}
              </Link>
            )}
            {step.linkedTechniqueId && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground text-xs">
                <Lightbulb className="h-3 w-3" /> Technique
              </span>
            )}
          </div>
        )}

        {step.tips?.trim() && (
          <div className="mt-2 pl-6">
            <button
              className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-xs hover:text-foreground"
              onClick={() => setTipsOpen((o) => !o)}
              type="button"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {tipsOpen ? "Hide tip" : "Show tip"}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  tipsOpen && "rotate-180"
                )}
              />
            </button>
            {tipsOpen && (
              <div className="mt-1.5 rounded-md bg-muted/50 p-3 text-muted-foreground text-sm">
                {step.tips}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 font-medium text-secondary-foreground text-xs",
        className
      )}
    >
      {children}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="font-bold text-foreground text-sm">{value || "—"}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-foreground text-sm">
        {value || "—"}
      </p>
    </div>
  );
}

function AllergenBadges({ allergens }: { allergens: string[] }) {
  if (allergens.length === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 font-medium text-accent-foreground text-xs">
        No major allergens
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {allergens.map((a) => (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-800 text-xs"
          key={a}
        >
          <AlertTriangle className="h-3 w-3" />
          {a}
        </span>
      ))}
    </div>
  );
}

function SmartImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-100 to-stone-200",
          className
        )}
      >
        <UtensilsCrossed className="h-10 w-10 text-orange-300" />
      </div>
    );
  }
  return (
    <Image
      alt={alt}
      className={cn("object-cover", className)}
      fill
      onError={() => setFailed(true)}
      sizes="(max-width: 640px) 100vw, 896px"
      src={src}
    />
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
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
