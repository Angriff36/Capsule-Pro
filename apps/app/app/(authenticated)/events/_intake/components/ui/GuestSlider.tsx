interface GuestSliderProps {
  onChange: (value: number) => void;
  value: number;
}

const MARKS = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];

export default function GuestSlider({ value, onChange }: GuestSliderProps) {
  const sliderIndex = MARKS.findIndex((m) => m >= value);
  const activeIndex = sliderIndex === -1 ? MARKS.length - 1 : sliderIndex;

  return (
    <div>
      <label className="mb-3 block font-medium text-sm text-stone-700">
        Expected Guest Count
      </label>
      <div className="mb-4 text-center">
        <span className="inline-block min-w-[120px] rounded-full bg-stone-800 px-6 py-2 font-light text-2xl text-white">
          {value}
        </span>
      </div>
      <input
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stone-800 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
        max={MARKS.length - 1}
        min={0}
        onChange={(e) => onChange(MARKS[Number.parseInt(e.target.value)])}
        type="range"
        value={activeIndex}
      />
      <div className="mt-2 flex justify-between">
        {MARKS.filter((_, i) => i % 3 === 0 || i === MARKS.length - 1).map(
          (mark) => (
            <span className="text-stone-400 text-xs" key={mark}>
              {mark}
            </span>
          )
        )}
      </div>
    </div>
  );
}
