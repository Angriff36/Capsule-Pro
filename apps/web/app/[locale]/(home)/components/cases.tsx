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

interface CasesProps {
  dictionary: Dictionary;
}

export const Cases = ({ dictionary }: CasesProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [_current, setCurrent] = useState(0);

  // Create stable carousel items with unique IDs
  const carouselItems = [
    { id: "case-1", src: "/marketing/EnterpriseDashboard.png" },
    { id: "case-2", src: "/marketing/OperationsDashboard.png" },
    { id: "case-3", src: "/marketing/LeadershipKanban.png" },
    { id: "case-4", src: "/marketing/RecipesMenus.png" },
    { id: "case-5", src: "/marketing/KitchenOverview.png" },
    { id: "case-6", src: "/marketing/Dishes.png" },
    { id: "case-7", src: "/marketing/KitchenOpsDashboard.png" },
    { id: "case-8", src: "/marketing/ConsolidatedTasks.png" },
    { id: "case-9", src: "/marketing/EventChat.png" },
    { id: "case-10", src: "/marketing/EnterpriseDashboard.png" },
    { id: "case-11", src: "/marketing/OperationsDashboard.png" },
    { id: "case-12", src: "/marketing/LeadershipKanban.png" },
  ];

  useEffect(() => {
    if (!api) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent((prev) => prev + 1);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [api]);

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <h2 className="text-left font-regular text-xl tracking-tighter md:text-5xl lg:max-w-xl">
            {dictionary.web.home.cases.title}
          </h2>
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {carouselItems.map((item) => (
                <CarouselItem className="basis-1/2 lg:basis-1/4" key={item.id}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                    <Image
                      alt="Operations preview"
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      src={item.src}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
};
