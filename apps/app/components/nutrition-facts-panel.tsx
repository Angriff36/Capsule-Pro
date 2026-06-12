/**
 * @module NutritionFactsPanel
 * @intent Display FDA-compliant nutrition facts label
 * @responsibility Render standardized black/white bordered nutrition label
 * @domain Kitchen
 * @tags nutrition, fda, label, dietary
 * @canonical true
 */

export interface NutritionFactsProps {
  /** Added sugars in grams */
  addedSugar?: number;
  /** Calcium in milligrams */
  calcium?: number;
  /** Calories per serving */
  calories: number;
  /** Total carbohydrates in grams */
  carbs: number;
  /** Cholesterol in milligrams */
  cholesterol?: number;
  /** Additional class names */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Total fat in grams */
  fat: number;
  /** Dietary fiber in grams */
  fiber?: number;
  /** Iron in milligrams */
  iron?: number;
  /** Food item name */
  name?: string;
  /** Potassium in milligrams */
  potassium?: number;
  /** Protein in grams */
  protein: number;
  /** Saturated fat in grams */
  saturatedFat?: number;
  /** Serving size description */
  servingSize: string;
  /** Number of servings per container */
  servingsPerContainer: number;
  /** Sodium in milligrams */
  sodium: number;
  /** Total sugars in grams */
  sugar?: number;
  /** Trans fat in grams */
  transFat?: number;
  /** Vitamin A in micrograms */
  vitaminA?: number;
  /** Vitamin C in milligrams */
  vitaminC?: number;
  /** Vitamin D in micrograms */
  vitaminD?: number;
}

// Daily Value reference amounts (based on 2,000 calorie diet)
const DAILY_VALUES = {
  totalFat: 78,
  saturatedFat: 20,
  cholesterol: 300,
  sodium: 2300,
  totalCarbs: 275,
  dietaryFiber: 28,
  protein: 50,
  vitaminD: 20,
  calcium: 1300,
  iron: 18,
  potassium: 4700,
  vitaminA: 900,
  vitaminC: 90,
  addedSugar: 50,
} as const;

function calculatePercentDV(
  value: number | undefined,
  dailyValue: number
): number | undefined {
  if (value === undefined || value === 0) {
    return;
  }
  return Math.round((value / dailyValue) * 100);
}

function formatValue(value: number | undefined): string {
  if (value === undefined) {
    return "0";
  }
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
}

export function NutritionFactsPanel({
  name,
  calories,
  fat,
  saturatedFat,
  transFat,
  cholesterol,
  sodium,
  carbs,
  fiber,
  sugar,
  addedSugar,
  protein,
  vitaminD,
  calcium,
  iron,
  potassium,
  vitaminA,
  vitaminC,
  servingSize,
  servingsPerContainer,
  className = "",
  compact = false,
}: NutritionFactsProps) {
  const textSize = compact ? "text-xs" : "text-sm";
  const headerSize = compact ? "text-2xl" : "text-3xl";
  const borderWidth = compact ? "border" : "border-2";

  const renderNutrientRow = (
    label: string,
    value: number | undefined,
    unit: string,
    dvKey?: keyof typeof DAILY_VALUES,
    isIndented = false,
    isBold = false
  ) => {
    const percentDV = dvKey
      ? calculatePercentDV(value, DAILY_VALUES[dvKey])
      : undefined;

    return (
      <div
        className={`flex justify-between py-0.5 ${isIndented ? `pl-3 ${textSize}` : `border-gray-300 border-t ${isBold ? "font-bold" : "font-medium"}`}`}
      >
        <span>
          {isIndented ? "\u00A0\u00A0" : ""}
          {label}
        </span>
        <span className="flex gap-3">
          <span className="w-14 text-right">
            {formatValue(value)}
            {unit}
          </span>
          {percentDV !== undefined && (
            <span className="w-10 text-right font-medium">{percentDV}%</span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`bg-white ${borderWidth} border-black p-3 font-mono ${textSize} ${className}`}
    >
      {/* Header */}
      <div
        className={`${headerSize} border-black border-b-4 pb-0.5 font-black`}
      >
        Nutrition Facts
      </div>

      {/* Serving Info */}
      <div className="py-2">
        {name && <div className="mb-1 font-bold text-base">{name}</div>}
        <div className="font-medium">{servingSize}</div>
        <div className={`${textSize}`}>
          Servings Per Container: {servingsPerContainer}
        </div>
      </div>

      {/* Amount Per Serving Header */}
      <div className="border-black border-t-8">
        <div className="py-0.5 text-right font-medium text-xs">
          Amount Per Serving
        </div>
      </div>

      {/* Calories */}
      <div className="border-black border-t-4 py-1">
        <div className="flex justify-between font-bold text-lg">
          <span>Calories</span>
          <span>{calories}</span>
        </div>
      </div>

      {/* Daily Value Header */}
      <div className="border-gray-300 border-t py-0.5 text-right font-medium text-xs">
        % Daily Value*
      </div>

      {/* Fat Section */}
      {renderNutrientRow("Total Fat", fat, "g", "totalFat", false, true)}
      {renderNutrientRow(
        "Saturated Fat",
        saturatedFat,
        "g",
        "saturatedFat",
        true
      )}
      {transFat !== undefined &&
        renderNutrientRow("Trans Fat", transFat, "g", undefined, true)}

      {/* Cholesterol & Sodium */}
      {cholesterol !== undefined &&
        renderNutrientRow(
          "Cholesterol",
          cholesterol,
          "mg",
          "cholesterol",
          false,
          true
        )}
      {renderNutrientRow("Sodium", sodium, "mg", "sodium", false, true)}

      {/* Carbohydrate Section */}
      {renderNutrientRow(
        "Total Carbohydrate",
        carbs,
        "g",
        "totalCarbs",
        false,
        true
      )}
      {renderNutrientRow("Dietary Fiber", fiber, "g", "dietaryFiber", true)}
      {renderNutrientRow("Total Sugars", sugar, "g", undefined, true)}
      {addedSugar !== undefined &&
        renderNutrientRow(
          "Includes Added Sugars",
          addedSugar,
          "g",
          "addedSugar",
          true
        )}

      {/* Protein */}
      {renderNutrientRow("Protein", protein, "g", "protein", false, true)}

      {/* Vitamins & Minerals */}
      <div className="mt-1 border-black border-t-4 pt-1">
        {vitaminD !== undefined &&
          renderNutrientRow("Vitamin D", vitaminD, "mcg", "vitaminD")}
        {calcium !== undefined &&
          renderNutrientRow("Calcium", calcium, "mg", "calcium")}
        {iron !== undefined && renderNutrientRow("Iron", iron, "mg", "iron")}
        {potassium !== undefined &&
          renderNutrientRow("Potassium", potassium, "mg", "potassium")}
        {vitaminA !== undefined &&
          renderNutrientRow("Vitamin A", vitaminA, "mcg", "vitaminA")}
        {vitaminC !== undefined &&
          renderNutrientRow("Vitamin C", vitaminC, "mg", "vitaminC")}
      </div>

      {/* Footer */}
      <div className="mt-2 border-black border-t-4 pt-1 text-xs">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for
        general nutrition advice.
      </div>
    </div>
  );
}

export default NutritionFactsPanel;
