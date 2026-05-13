import type { MenuFormData } from '../../types/menu';
import StepHeader from '../ui/StepHeader';
import SelectCard from '../ui/SelectCard';
import TextArea from '../ui/TextArea';
import { MENU_DIRECTIONS } from '../../config/menuCatalog';

interface Props {
  formData: MenuFormData;
  updateField: <K extends keyof MenuFormData>(field: K, value: MenuFormData[K]) => void;
}

export default function MenuDirectionStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        title="Choose a culinary direction"
        subtitle="This guides the overall tone and flavor profile. You can mix and match dishes in the next steps."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MENU_DIRECTIONS.map(dir => (
          <SelectCard
            key={dir.value}
            label={dir.label}
            description={dir.description}
            selected={formData.menuDirection === dir.value}
            onClick={() => updateField('menuDirection', dir.value)}
          />
        ))}
      </div>

      <TextArea
        label="Any notes on menu direction? (optional)"
        value={formData.notes}
        onChange={v => updateField('notes', v)}
        placeholder="Specific ingredients you love, flavors to avoid, dietary themes, inspiration from restaurants you have enjoyed..."
        rows={3}
      />
    </div>
  );
}
