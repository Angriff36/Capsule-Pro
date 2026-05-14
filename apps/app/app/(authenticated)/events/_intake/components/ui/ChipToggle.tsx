import { Check } from "lucide-react";

interface ChipToggleProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function ChipToggle({
  label,
  selected,
  onClick,
}: ChipToggleProps) {
  return (
    <button
      className={`
        inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium
        transition-all duration-200 border
        ${
          selected
            ? "bg-stone-800 text-white border-stone-800 shadow-md"
            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:bg-stone-50"
        }
      `}
      onClick={onClick}
      type="button"
    >
      {selected && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
