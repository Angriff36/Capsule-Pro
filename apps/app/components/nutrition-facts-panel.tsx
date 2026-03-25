/**
 * @module NutritionFactsPanel
 * @intent Display FDA-compliant nutrition facts label
 * @responsibility Render standardized black/white bordered nutrition label
 * @domain Kitchen
 * @tags nutrition, fda, label, dietary
 * @canonical true
 */

export interface NutritionFactsProps {
  /** Food item name */
  name?: string;
  /** Calories per serving */
  calories: number;
  /** Total fat in grams */
  fat: number;
  /** Saturated fat in grams */
  saturatedFat?: number;
  /** Trans fat in grams */
  transFat?: number;
  /** Cholesterol in milligrams */
  cholesterol?: number;
  /** Sodium in milligrams */
  sodium: number;
  /** Total carbohydrates in grams */
  carbs: number;
  /** Dietary fiber in grams */
  fiber?: number;
  /** Total sugars in grams */
  sugar?: number;
  /** Added sugars in grams */
  addedSugar?: number;
  /** Protein in grams */
  protein: number;
  /** Vitamin D in micrograms */
  vitaminD?: number;
  /** Calcium in milligrams */
  calcium?: number;
  /** Iron in milligrams */
  iron?: number;
  /** Potassium in milligrams */
  potassium?: number;
  /** Vitamin A in micrograms */
  vitaminA?: number;
  /** Vitamin C in milligrams */
  vitaminC?: number;
  /** Serving size description */
  servingSize: string;
  /** Number of servings per container */
  servingsPerContainer: number;
  /** Additional class names */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
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

function calculatePercentDV(value: number | undefined, dailyValue: number): number | undefined {
  if (value === undefined || value === 0) return undefined;
  return Math.round((value / dailyValue) * 100);
}

function formatValue(value: number | undefined): string {
  if (value === undefined) return "0";
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
    const percentDV = dvKey ? calculatePercentDV(value, DAILY_VALUES[dvKey]) : undefined;

    return (
      <div
        className={`flex justify-between py-0.5 ${isIndented ? `pl-3 ${textSize}` : `border-t border-gray-300 ${isBold ? "font-bold" : "font-medium"}`}`}
      >
        <span>
          {isIndented ? "\u00A0\u00A0" : ""}
          {label}
        </span>
        <span className="flex gap-3">
          <span className="text-right w-14">
            {formatValue(value)}
            {unit}
          </span>
          {percentDV !== undefined && (
            <span className="text-right w-10 font-medium">{percentDV}%</span>
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
      <div className={`${headerSize} font-black border-b-4 border-black pb-0.5`}>
        Nutrition Facts
      </div>

      {/* Serving Info */}
      <div className="py-2">
        {name && <div className="text-base font-bold mb-1">{name}</div>}
        <div className="font-medium">
          {servingSize}
        </div>
        <div className={`${textSize}`}>
          Servings Per Container: {servingsPerContainer}
        </div>
      </div>

      {/* Amount Per Serving Header */}
      <div className="border-t-8 border-black">
        <div className="text-right text-xs py-0.5 font-medium">
          Amount Per Serving
        </div>
      </div>

      {/* Calories */}
      <div className="border-t-4 border-black py-1">
        <div className="flex justify-between font-bold text-lg">
          <span>Calories</span>
          <span>{calories}</span>
        </div>
      </div>

      {/* Daily Value Header */}
      <div className="border-t border-gray-300 py-0.5 text-right text-xs font-medium">
        % Daily Value*
      </div>

      {/* Fat Section */}
      {renderNutrientRow("Total Fat", fat, "g", "totalFat", false, true)}
      {renderNutrientRow("Saturated Fat", saturatedFat, "g", "saturatedFat", true)}
      {transFat !== undefined && renderNutrientRow("Trans Fat", transFat, "g", undefined, true)}

      {/* Cholesterol & Sodium */}
      {cholesterol !== undefined && renderNutrientRow("Cholesterol", cholesterol, "mg", "cholesterol", false, true)}
      {renderNutrientRow("Sodium", sodium, "mg", "sodium", false, true)}

      {/* Carbohydrate Section */}
      {renderNutrientRow("Total Carbohydrate", carbs, "g", "totalCarbs", false, true)}
      {renderNutrientRow("Dietary Fiber", fiber, "g", "dietaryFiber", true)}
      {renderNutrientRow("Total Sugars", sugar, "g", undefined, true)}
      {addedSugar !== undefined && renderNutrientRow("Includes Added Sugars", addedSugar, "g", "addedSugar", true)}

      {/* Protein */}
      {renderNutrientRow("Protein", protein, "g", "protein", false, true)}

      {/* Vitamins & Minerals */}
      <div className="border-t-4 border-black mt-1 pt-1">
        {vitaminD !== undefined && renderNutrientRow("Vitamin D", vitaminD, "mcg", "vitaminD")}
        {calcium !== undefined && renderNutrientRow("Calcium", calcium, "mg", "calcium")}
        {iron !== undefined && renderNutrientRow("Iron", iron, "mg", "iron")}
        {potassium !== undefined && renderNutrientRow("Potassium", potassium, "mg", "potassium")}
        {vitaminA !== undefined && renderNutrientRow("Vitamin A", vitaminA, "mcg", "vitaminA")}
        {vitaminC !== undefined && renderNutrientRow("Vitamin C", vitaminC, "mg", "vitaminC")}
      </div>

      {/* Footer */}
      <div className="border-t-4 border-black mt-2 pt-1 text-xs">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for
        general nutrition advice.
      </div>
    </div>
  );
}

export default NutritionFactsPanel;
