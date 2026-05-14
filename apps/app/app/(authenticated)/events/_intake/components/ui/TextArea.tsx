interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  helpText?: string;
}

export default function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  helpText,
}: TextAreaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}
      </label>
      <textarea
        className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800
          placeholder:text-stone-300 focus:border-stone-400 focus:outline-none focus:ring-2
          focus:ring-stone-100 transition-all resize-none"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      {helpText && <p className="text-xs text-stone-400 mt-1">{helpText}</p>}
    </div>
  );
}
