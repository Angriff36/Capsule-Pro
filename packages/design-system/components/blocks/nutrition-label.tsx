/**
 * Nutrition Label Block
 *
 * Displays FDA-compliant nutrition labels including:
 * - Serving size and servings per container
 * - Calorie information
 * - Percent daily values for nutrients
 * - Allergen information
 * - Ingredients list
 *
 * @module kitchen-ops/nutrition-labels
 */

"use client";

import {
  AlertCircle,
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  Printer,
  Share,
  WheatOff,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Separator } from "../ui/separator";

/**
 * Vitamins and minerals data
 */
interface VitaminsMinerals {
  calcium?: number;
  copper?: number;
  folate?: number;
  iodine?: number;
  iron?: number;
  magnesium?: number;
  manganese?: number;
  niacin?: number;
  phosphorus?: number;
  riboflavin?: number;
  selenium?: number;
  thiamin?: number;
  vitaminA?: number;
  vitaminB6?: number;
  vitaminB12?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  zinc?: number;
}

/**
 * Nutritional values per serving
 */
export interface NutrientsPerServing {
  addedSugars: number;
  calories: number;
  caloriesFromFat: number;
  cholesterol: number;
  dietaryFiber: number;
  potassium: number;
  protein: number;
  saturatedFat: number;
  sodium: number;
  totalCarbohydrate: number;
  totalFat: number;
  totalSugars: number;
  transFat: number;
  vitamins: VitaminsMinerals;
}

/**
 * Percent daily values
 */
export interface PercentDailyValues {
  addedSugars: number;
  calcium: number;
  cholesterol: number;
  dietaryFiber: number;
  iron: number;
  potassium: number;
  protein: number;
  saturatedFat: number;
  sodium: number;
  totalCarbohydrate: number;
  totalFat: number;
  totalSugars: number;
  transFat: number;
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
}

/**
 * Allergen information
 */
export interface AllergenInfo {
  contains: string[];
  freeFrom: string[];
  highlights: string[];
  mayContain: string[];
}

/**
 * FDA compliance information
 */
export interface FDAComplianceInfo {
  isCompliant: boolean;
  requiredNutrients: string[];
  servingSize: string;
  servingsPerContainer: number;
  warnings: string[];
}

/**
 * Complete nutrition label data
 */
export interface NutritionLabel {
  allergens: AllergenInfo;
  fdaCompliance: FDAComplianceInfo;
  generatedAt: Date | string;
  ingredientsList: string;
  perContainer: NutrientsPerServing;
  percentDailyValues: PercentDailyValues;
  perServing: NutrientsPerServing;
  recipeName: string;
  recipeVersionId: string;
  servingSize: string;
  servingsPerContainer: number;
}

/**
 * Props for NutritionLabel component
 */
export interface NutritionLabelCardProps {
  /**
   * Optional CSS class
   */
  className?: string;
  /**
   * The nutrition label data to display
   */
  label: NutritionLabel;
  onDownload?: () => void;

  /**
   * Optional callback for print/download
   */
  onPrint?: () => void;
  onShare?: () => void;

  /**
   * Whether to show allergen alerts
   */
  showAllergenAlerts?: boolean;
}

/**
 * Nutrient row component for the label
 */
function NutrientRow({
  label,
  value,
  unit,
  dv,
  indent = false,
  bold = false,
}: {
  label: string;
  value: number;
  unit: string;
  dv?: number;
  indent?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-0.5 ${indent ? "ml-4" : ""} ${bold ? "font-bold" : ""}`}
    >
      <span>{label}</span>
      <span className="flex gap-2">
        <span>
          {value} {unit}
        </span>
        {dv !== undefined && <span className="font-bold">{dv}%</span>}
      </span>
    </div>
  );
}

/**
 * FDA-style nutrition label display
 */
function FDANutritionLabel({ label }: { label: NutritionLabel }) {
  const { perServing, percentDailyValues } = label;

  return (
    <div className="mx-auto max-w-xs border-4 border-black bg-white p-4 font-sans text-black text-sm">
      {/* Header */}
      <div className="mb-2 font-bold text-lg">Nutrition Facts</div>
      <div className="mb-2">
        {label.servingsPerContainer} servings per container
      </div>
      <div className="mb-4">
        <span className="font-bold text-base">Serving size </span>
        <span className="font-bold text-base">{label.servingSize}</span>
      </div>

      <Separator className="my-2 border-black border-b-4" />

      {/* Calories */}
      <div className="flex items-baseline justify-between py-2">
        <span className="font-bold text-2xl">{perServing.calories}</span>
        <span className="font-bold text-base">Calories</span>
      </div>

      <Separator className="my-2 border-black border-b-2" />

      {/* Calories from fat */}
      <div className="mb-2 flex justify-between text-xs">
        <span>Calories from Fat</span>
        <span>{perServing.caloriesFromFat}</span>
      </div>

      <Separator className="my-2 border-black border-b-4" />

      <div className="mb-2 font-bold text-xs">% Daily Value*</div>

      {/* Total Fat */}
      <NutrientRow
        bold
        dv={percentDailyValues.totalFat}
        label="Total Fat"
        unit="g"
        value={perServing.totalFat}
      />

      {/* Saturated Fat */}
      <NutrientRow
        dv={percentDailyValues.saturatedFat}
        indent
        label="Saturated Fat"
        unit="g"
        value={perServing.saturatedFat}
      />

      {/* Trans Fat */}
      {perServing.transFat > 0 && (
        <NutrientRow
          indent
          label="Trans Fat"
          unit="g"
          value={perServing.transFat}
        />
      )}

      {/* Cholesterol */}
      <NutrientRow
        bold
        dv={percentDailyValues.cholesterol}
        label="Cholesterol"
        unit="mg"
        value={perServing.cholesterol}
      />

      {/* Sodium */}
      <NutrientRow
        bold
        dv={percentDailyValues.sodium}
        label="Sodium"
        unit="mg"
        value={perServing.sodium}
      />

      {/* Total Carbohydrate */}
      <NutrientRow
        bold
        dv={percentDailyValues.totalCarbohydrate}
        label="Total Carbohydrate"
        unit="g"
        value={perServing.totalCarbohydrate}
      />

      {/* Dietary Fiber */}
      <NutrientRow
        dv={percentDailyValues.dietaryFiber}
        indent
        label="Dietary Fiber"
        unit="g"
        value={perServing.dietaryFiber}
      />

      {/* Total Sugars */}
      <NutrientRow
        indent
        label="Total Sugars"
        unit="g"
        value={perServing.totalSugars}
      />

      {/* Added Sugars */}
      {perServing.addedSugars > 0 && (
        <NutrientRow
          dv={percentDailyValues.addedSugars}
          indent
          label="Includes Added Sugars"
          unit="g"
          value={perServing.addedSugars}
        />
      )}

      {/* Protein */}
      <NutrientRow
        bold
        dv={percentDailyValues.protein}
        label="Protein"
        unit="g"
        value={perServing.protein}
      />

      <Separator className="my-2 border-black border-b-4" />

      {/* Vitamins - showing if we have data */}
      <div className="flex justify-between py-0.5">
        <span>Vitamin D</span>
        <span>{perServing.vitamins.vitaminD || 0}mcg</span>
      </div>
      <div className="flex justify-between py-0.5">
        <span>Calcium</span>
        <span>{percentDailyValues.calcium || 0}%</span>
      </div>
      <div className="flex justify-between py-0.5">
        <span>Iron</span>
        <span>{percentDailyValues.iron || 0}%</span>
      </div>
      <div className="flex justify-between py-0.5">
        <span>Potassium</span>
        <span>{perServing.potassium}mg</span>
      </div>

      <Separator className="my-2 border-black border-b-4" />

      {/* Footer */}
      <div className="mt-2 text-xs">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for
        general nutrition advice.
      </div>
    </div>
  );
}

/**
 * Allergen badge component
 */
function AllergenBadge({
  allergen,
  type,
}: {
  allergen: string;
  type: "contains" | "mayContain" | "freeFrom";
}) {
  const colors = {
    contains: "bg-red-100 text-red-700 border-red-200",
    mayContain: "bg-amber-100 text-amber-700 border-amber-200",
    freeFrom: "bg-green-100 text-green-700 border-green-200",
  };

  const icons = {
    contains: <AlertTriangle className="h-3 w-3" />,
    mayContain: <AlertCircle className="h-3 w-3" />,
    freeFrom: <WheatOff className="h-3 w-3" />,
  };

  return (
    <Badge
      className={`${colors[type]} flex items-center gap-1`}
      variant="outline"
    >
      {icons[type]}
      {allergen}
    </Badge>
  );
}

/**
 * Collapsible section component
 */
function NutritionSection({
  title,
  defaultValue = false,
  children,
  icon: Icon,
  badge,
}: {
  title: string;
  defaultValue?: boolean;
  children: React.ReactNode;
  icon?: React.ElementType;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultValue);

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <div className="overflow-hidden rounded-lg border">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-3 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <span className="font-medium text-sm">{title}</span>
            {badge}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-3">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Nutrition label card component
 */
export function NutritionLabelCard({
  label,
  className,
  showAllergenAlerts = true,
  onPrint,
  onDownload,
  onShare,
}: NutritionLabelCardProps) {
  const hasAllergens = label.allergens.contains.length > 0;
  const hasMayContain = label.allergens.mayContain.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Nutrition Label</CardTitle>
            <CardDescription>
              {label.recipeName} • FDA-compliant nutrition information
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {onPrint && (
              <Button onClick={onPrint} size="sm" variant="outline">
                <Printer className="h-4 w-4" />
              </Button>
            )}
            {onDownload && (
              <Button onClick={onDownload} size="sm" variant="outline">
                <Download className="h-4 w-4" />
              </Button>
            )}
            {onShare && (
              <Button onClick={onShare} size="sm" variant="outline">
                <Share className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Allergen Alerts */}
        {showAllergenAlerts && hasAllergens && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm">
              <span className="font-semibold">Contains allergens:</span>{" "}
              {label.allergens.contains.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        {/* FDA Nutrition Label */}
        <FDANutritionLabel label={label} />

        {/* Allergen Information */}
        <NutritionSection
          badge={
            label.allergens.contains.length > 0 ? (
              <Badge className="ml-2" variant="destructive">
                {label.allergens.contains.length} allergen
                {label.allergens.contains.length > 1 ? "s" : ""}
              </Badge>
            ) : null
          }
          defaultValue={hasAllergens || hasMayContain}
          icon={AlertTriangle}
          title="Allergen Information"
        >
          <div className="space-y-3">
            {label.allergens.contains.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 font-medium text-xs">
                  <Ban className="h-3 w-3 text-red-500" />
                  Contains
                </div>
                <div className="flex flex-wrap gap-1">
                  {label.allergens.contains.map((allergen) => (
                    <AllergenBadge
                      allergen={allergen}
                      key={allergen}
                      type="contains"
                    />
                  ))}
                </div>
              </div>
            )}

            {label.allergens.mayContain.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 font-medium text-xs">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  May Contain
                </div>
                <div className="flex flex-wrap gap-1">
                  {label.allergens.mayContain.map((allergen) => (
                    <AllergenBadge
                      allergen={allergen}
                      key={allergen}
                      type="mayContain"
                    />
                  ))}
                </div>
              </div>
            )}

            {label.allergens.freeFrom.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 font-medium text-xs">
                  <WheatOff className="h-3 w-3 text-green-500" />
                  Free From
                </div>
                <div className="flex flex-wrap gap-1">
                  {label.allergens.freeFrom.slice(0, 8).map((allergen) => (
                    <AllergenBadge
                      allergen={allergen}
                      key={allergen}
                      type="freeFrom"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </NutritionSection>

        {/* Ingredients List */}
        <NutritionSection icon={Info} title="Ingredients List">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {label.ingredientsList}
          </p>
        </NutritionSection>

        {/* FDA Compliance Info */}
        {!label.fdaCompliance.isCompliant && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="mb-1 font-medium text-sm">
                FDA Compliance Notices
              </div>
              <ul className="list-inside list-disc space-y-1 text-xs">
                {label.fdaCompliance.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <div className="text-center text-muted-foreground text-xs">
          Generated on {new Date(label.generatedAt).toLocaleDateString()} •
          Based on available ingredient nutritional data
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simplified allergen-only display
 */
export function AllergenDisplay({
  allergens,
  className,
}: {
  allergens: AllergenInfo;
  className?: string;
}) {
  if (allergens.contains.length === 0 && allergens.mayContain.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className || ""}`}>
        <WheatOff className="h-4 w-4 text-green-500" />
        <span className="text-green-600">No major allergens detected</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className || ""}`}>
      {allergens.contains.map((allergen) => (
        <AllergenBadge allergen={allergen} key={allergen} type="contains" />
      ))}
      {allergens.mayContain.map((allergen) => (
        <AllergenBadge allergen={allergen} key={allergen} type="mayContain" />
      ))}
    </div>
  );
}
