"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeFavoriteButton = void 0;
const lucide_react_1 = require("lucide-react");
const RecipeFavoriteButton = ({ recipeName }) => {
  return (
    <button
      aria-label={`Favorite ${recipeName}`}
      className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm transition-all hover:scale-110 hover:bg-white active:scale-95"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      type="button"
    >
      <lucide_react_1.HeartIcon className="size-5" />
    </button>
  );
};
exports.RecipeFavoriteButton = RecipeFavoriteButton;
