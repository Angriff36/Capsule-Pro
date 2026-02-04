"use client";

import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  Database,
  Globe,
  Lock,
  Monitor,
  Smartphone,
} from "lucide-react";
import * as React from "react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

type MegaMenuItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
};

type MegaMenuTab = {
  value: string;
  label: string;
  items: MegaMenuItem[];
};

type TabbedMegaMenuBlockProps = {
  tabs?: MegaMenuTab[];
  ctaText?: string;
  ctaDescription?: string;
};

const defaultTabs: MegaMenuTab[] = [
  {
    value: "web",
    label: "Web",
    items: [
      {
        icon: Globe,
        title: "Web Hosting",
        description: "Fast, reliable hosting",
      },
      {
        icon: Monitor,
        title: "Static Sites",
        description: "Deploy in seconds",
      },
      {
        icon: Cloud,
        title: "Edge Network",
        description: "Global CDN delivery",
      },
    ],
  },
  {
    value: "mobile",
    label: "Mobile",
    items: [
      {
        icon: Smartphone,
        title: "Mobile SDK",
        description: "Native app development",
      },
      {
        icon: Monitor,
        title: "Cross-Platform",
        description: "React Native & Flutter",
      },
      {
        icon: Lock,
        title: "App Security",
        description: "Secure your mobile apps",
      },
    ],
  },
  {
    value: "infrastructure",
    label: "Infrastructure",
    items: [
      {
        icon: Database,
        title: "Databases",
        description: "Managed SQL & NoSQL",
      },
      {
        icon: Cloud,
        title: "Cloud Storage",
        description: "Scalable object storage",
      },
      {
        icon: Lock,
        title: "Security",
        description: "DDoS & firewall protection",
      },
    ],
  },
];

export function TabbedMegaMenuBlock({
  tabs = defaultTabs,
  ctaText = "Need help choosing?",
  ctaDescription = "Our team can help you find the right solution for your needs.",
}: TabbedMegaMenuBlockProps) {
  const initialTab = tabs[0]?.value ?? "";
  const [activeTab, setActiveTab] = React.useState(initialTab);

  return (
    <div className="pr-[50vw] pb-[50vh]">
      <div className="w-full max-w-md rounded-md border bg-background p-px">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[700px] space-y-6 p-6">
                  <Tabs onValueChange={setActiveTab} value={activeTab}>
                    <TabsList
                      className="grid w-full"
                      style={{
                        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
                      }}
                    >
                      {tabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {tabs.map((tab) => (
                      <TabsContent
                        className="mt-0"
                        key={tab.value}
                        value={tab.value}
                      >
                        <div className="grid grid-cols-3 gap-4">
                          {tab.items.map((item) => {
                            const Icon =
                              typeof item.icon === "function"
                                ? item.icon
                                : null;
                            return (
                              <NavigationMenuLink
                                className="flex flex-row items-start gap-3 rounded-md border border-transparent p-3 hover:border-border"
                                href={item.href ?? "#"}
                                key={item.title}
                              >
                                {Icon ? (
                                  <Icon className="mt-0.5 size-5" />
                                ) : null}
                                <div>
                                  <span className="block font-medium">
                                    {item.title}
                                  </span>
                                  <span className="block text-muted-foreground">
                                    {item.description}
                                  </span>
                                </div>
                              </NavigationMenuLink>
                            );
                          })}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>{ctaText}</strong> {ctaDescription}
                    </p>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}
