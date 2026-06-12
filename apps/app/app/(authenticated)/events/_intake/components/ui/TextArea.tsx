interface TextAreaProps {
  helpText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
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
      <label className="mb-1.5 block font-medium text-sm text-stone-700">
        {label}
      </label>
      <textarea
        className="w-full resize-none rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 transition-all placeholder:text-stone-300 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      {helpText && <p className="mt-1 text-stone-400 text-xs">{helpText}</p>}
    </div>
  );
}
