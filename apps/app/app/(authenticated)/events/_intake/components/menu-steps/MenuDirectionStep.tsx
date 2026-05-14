import { MENU_DIRECTIONS } from "../../config/menuCatalog";
import type { MenuFormData } from "../../types/menu";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";
import TextArea from "../ui/TextArea";

interface Props {
  formData: MenuFormData;
  updateField: <K extends keyof MenuFormData>(
    field: K,
    value: MenuFormData[K]
  ) => void;
}

export default function MenuDirectionStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="This guides the overall tone and flavor profile. You can mix and match dishes in the next steps."
        title="Choose a culinary direction"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MENU_DIRECTIONS.map((dir) => (
          <SelectCard
            description={dir.description}
            key={dir.value}
            label={dir.label}
            onClick={() => updateField("menuDirection", dir.value)}
            selected={formData.menuDirection === dir.value}
          />
        ))}
      </div>

      <TextArea
        label="Any notes on menu direction? (optional)"
        onChange={(v) => updateField("notes", v)}
        placeholder="Specific ingredients you love, flavors to avoid, dietary themes, inspiration from restaurants you have enjoyed..."
        rows={3}
        value={formData.notes}
      />
    </div>
  );
}
