"use client";

import React from "react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import AutoScroll from "embla-carousel-auto-scroll";
import { Card } from "@/components/ui/card";
import Icon from "@/components/icon";
import { Section as SectionType } from "@/types/blocks/section";
import { Star } from "lucide-react";
import { useRef } from "react";

export default function Testimonial({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  const plugin = useRef(
    AutoScroll({
      startDelay: 500,
      speed: 0.7,
    })
  );

  return (
    <section id={section.name} className="py-16">
      <div className="container flex flex-col items-center gap-4">
        {section.label && (
          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
            {section.icon && (
              <Icon name={section.icon} className="h-6 w-auto border-primary" />
            )}
            {section.label}
          </div>
        )}
        <h2 className="text-center text-2xl font-semibold md:text-3xl lg:text-4xl max-w-4xl">
          {section.title?.split('\n').map((line, index, array) => (
            <React.Fragment key={index}>
              {line}
              {index < array.length - 1 && <br />}
            </React.Fragment>
          ))}
        </h2>
        <p className="text-center text-sm text-muted-foreground md:text-base lg:text-lg max-w-3xl px-4">
          {section.description}
        </p>
      </div>
      <div className="w-full">
        <div className="mt-16 space-y-4">
          <Carousel
            opts={{
              loop: true,
            }}
            plugins={[plugin.current]}
            onMouseLeave={() => plugin.current.play()}
            className="relative before:absolute before:bottom-0 before:left-0 before:top-0 before:z-10 before:w-36 before:bg-linear-to-r before:from-background before:to-transparent after:absolute after:bottom-0 after:right-0 after:top-0 after:z-10 after:w-36 after:bg-linear-to-l after:from-background after:to-transparent"
          >
            <CarouselContent>
              {section.items?.map((item, index) => (
                <CarouselItem key={index} className="basis-auto">
                  <Card className="max-w-96 h-[280px] flex flex-col select-none p-6">
                    <div className="flex justify-between">
                      <div className="mb-4 flex gap-4">
                        <Avatar className="size-14 rounded-full ring-1 ring-input">
                          <AvatarImage
                            src={item.image?.src}
                            alt={item.image?.alt || item.title}
                          />
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.label}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="size-5 fill-amber-500 text-amber-500"
                          />
                        ))}
                      </div>
                    </div>
                    <q className="leading-7 text-muted-foreground line-clamp-4 flex-1">
                      {item.description}
                    </q>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
