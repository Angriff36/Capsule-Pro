"use client";

import { HeartIcon } from "lucide-react";

type RecipeFavoriteButtonProps = {
  recipeName: string;
};

export const RecipeFavoriteButton = ({
  recipeName,
}: RecipeFavoriteButtonProps) => {
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
      <HeartIcon className="size-5" />
    </button>
  );
};
