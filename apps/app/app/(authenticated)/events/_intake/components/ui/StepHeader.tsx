interface StepHeaderProps {
  subtitle: string;
  title: string;
}

export default function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className="font-light text-2xl text-stone-800 tracking-tight md:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-stone-400">{subtitle}</p>
    </div>
  );
}
