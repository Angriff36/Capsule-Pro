"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@repo/design-system/components/ui/carousel";
import type { Dictionary } from "@repo/internationalization";
import Image from "next/image";
import { useEffect, useState } from "react";

type CasesProps = {
  dictionary: Dictionary;
};

export const Cases = ({ dictionary }: CasesProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const caseImages = [
    "/marketing/EnterpriseDashboard.png",
    "/marketing/OperationsDashboard.png",
    "/marketing/LeadershipKanban.png",
    "/marketing/RecipesMenus.png",
    "/marketing/KitchenOverview.png",
    "/marketing/Dishes.png",
    "/marketing/KitchenOpsDashboard.png",
    "/marketing/ConsolidatedTasks.png",
    "/marketing/EventChat.png",
  ];

  useEffect(() => {
    if (!api) {
      return;
    }

    setTimeout(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent(current + 1);
      }
    }, 1000);
  }, [api, current]);

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <h2 className="text-left font-regular text-xl tracking-tighter md:text-5xl lg:max-w-xl">
            {dictionary.web.home.cases.title}
          </h2>
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {Array.from({ length: 12 }).map((_, index) => {
                const src = caseImages[index % caseImages.length];

                return (
                  <CarouselItem className="basis-1/2 lg:basis-1/4" key={index}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                      <Image
                        alt="Operations preview"
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        src={src}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
};
