interface StepHeaderProps {
  title: string;
  subtitle: string;
}

export default function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl md:text-3xl font-light text-stone-800 tracking-tight">
        {title}
      </h2>
      <p className="text-stone-400 text-sm mt-2">{subtitle}</p>
    </div>
  );
}
