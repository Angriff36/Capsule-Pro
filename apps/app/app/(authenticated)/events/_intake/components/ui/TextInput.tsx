interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  helpText?: string;
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
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <input
        className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800
          placeholder:text-stone-300 focus:border-stone-400 focus:outline-none focus:ring-2
          focus:ring-stone-100 transition-all"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {helpText && <p className="text-xs text-stone-400 mt-1">{helpText}</p>}
    </div>
  );
}
