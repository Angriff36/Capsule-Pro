import { Check } from "lucide-react";

interface SelectCardProps {
  description?: string;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  selected: boolean;
}

export default function SelectCard({
  label,
  description,
  selected,
  onClick,
  icon,
}: SelectCardProps) {
  return (
    <button
      className={`relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "scale-[1.02] border-stone-800 bg-stone-800 text-white shadow-lg"
          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:shadow-md"
      }
      `}
      onClick={onClick}
      type="button"
    >
      {selected && (
        <span className="absolute top-3 right-3">
          <Check className="h-4 w-4" />
        </span>
      )}
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className={`mt-0.5 ${selected ? "text-white" : "text-stone-400"}`}
          >
            {icon}
          </span>
        )}
        <div>
          <span className="font-medium text-sm">{label}</span>
          {description && (
            <p
              className={`mt-1 text-xs ${selected ? "text-stone-300" : "text-stone-400"}`}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
