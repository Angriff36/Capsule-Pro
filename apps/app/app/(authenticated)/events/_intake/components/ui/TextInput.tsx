interface TextInputProps {
  helpText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}

export default function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  helpText,
}: TextInputProps) {
  return (
    <div>
      <label className="mb-1.5 block font-medium text-sm text-stone-700">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      <input
        className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 transition-all placeholder:text-stone-300 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {helpText && <p className="mt-1 text-stone-400 text-xs">{helpText}</p>}
    </div>
  );
}
