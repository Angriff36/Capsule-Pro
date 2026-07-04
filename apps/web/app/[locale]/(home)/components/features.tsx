import type { Dictionary } from "@repo/internationalization";
import Image from "next/image";

interface FeaturesProps {
  dictionary: Dictionary;
}

export const Features = ({ dictionary }: FeaturesProps) => {
  const featureItems = dictionary.web.home.features.items;
  const cards = [
    {
      image: "/marketing/KitchenOverview.png",
      alt: "Unified operations overview",
      sizes: "(min-width: 1024px) 40vw, 100vw",
      aspect: "aspect-[16/9]",
      wide: true,
      item: featureItems[0],
    },
    {
      image: "/marketing/ConsolidatedTasks.png",
      alt: "Task coordination preview",
      sizes: "(min-width: 1024px) 20vw, 100vw",
      aspect: "aspect-[4/3]",
      wide: false,
      item: featureItems[1],
    },
    {
      image: "/marketing/EnterpriseDashboard.png",
      alt: "Realtime analytics preview",
      sizes: "(min-width: 1024px) 20vw, 100vw",
      aspect: "aspect-[4/3]",
      wide: false,
      item: featureItems[2],
    },
    {
      image: "/marketing/RecipesMenus.webp",
      alt: "Menu and recipe management",
      sizes: "(min-width: 1024px) 40vw, 100vw",
      aspect: "aspect-[16/9]",
      wide: true,
      item: featureItems[3],
    },
  ];

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
                {dictionary.web.home.features.title}
              </h2>
              <p className="max-w-xl text-left text-lg text-muted-foreground leading-relaxed tracking-tight lg:max-w-lg">
                {dictionary.web.home.features.description}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                className={`flex flex-col justify-between gap-6 rounded-2xl border bg-muted p-6${
                  card.wide ? " h-full lg:col-span-2" : ""
                }`}
                key={card.image}
              >
                <div
                  className={`relative ${card.aspect} overflow-hidden rounded-xl`}
                >
                  <Image
                    alt={card.alt}
                    fill
                    sizes={card.sizes}
                    src={card.image}
                    style={{ objectFit: "cover" }}
                  />
                </div>
                {card.item ? (
                  <div className="flex flex-col">
                    <h3 className="text-xl tracking-tight">
                      {card.item.title}
                    </h3>
                    <p className="max-w-xs text-base text-muted-foreground">
                      {card.item.description}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
