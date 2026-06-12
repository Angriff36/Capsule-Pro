import { Check } from "lucide-react";

interface ChipToggleProps {
  label: string;
  onClick: () => void;
  selected: boolean;
}

export default function ChipToggle({
  label,
  selected,
  onClick,
}: ChipToggleProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-medium text-sm transition-all duration-200 ${
        selected
          ? "border-stone-800 bg-stone-800 text-white shadow-md"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:bg-stone-50"
      }
      `}
      onClick={onClick}
      type="button"
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
