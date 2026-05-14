interface GuestSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MARKS = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];

export default function GuestSlider({ value, onChange }: GuestSliderProps) {
  const sliderIndex = MARKS.findIndex((m) => m >= value);
  const activeIndex = sliderIndex === -1 ? MARKS.length - 1 : sliderIndex;

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-3">
        Expected Guest Count
      </label>
      <div className="text-center mb-4">
        <span className="inline-block bg-stone-800 text-white text-2xl font-light px-6 py-2 rounded-full min-w-[120px]">
          {value}
        </span>
      </div>
      <input
        className="w-full h-2 bg-stone-200 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stone-800
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
        max={MARKS.length - 1}
        min={0}
        onChange={(e) => onChange(MARKS[Number.parseInt(e.target.value)])}
        type="range"
        value={activeIndex}
      />
      <div className="flex justify-between mt-2">
        {MARKS.filter((_, i) => i % 3 === 0 || i === MARKS.length - 1).map(
          (mark) => (
            <span className="text-xs text-stone-400" key={mark}>
              {mark}
            </span>
          )
        )}
      </div>
    </div>
  );
}
