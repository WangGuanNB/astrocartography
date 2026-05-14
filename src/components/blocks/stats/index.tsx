import React from "react";
import { Heart, Zap } from "lucide-react";

import Icon from "@/components/icon";
import { Section as SectionType } from "@/types/blocks/section";

export default function Stats({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

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
        <div className="w-full grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 mt-8">
          {section.items?.map((item, index) => {
            return (
              <div key={index} className="text-center">
                <p className="text-sm font-semibold text-muted-foreground md:text-base">
                  {item.title}
                </p>
                <p className="pt-2 text-5xl font-semibold lg:pt-4 text-primary md:text-6xl">
                  {item.label}
                </p>
                <p className="text-sm mt-2 font-normal text-muted-foreground md:text-base">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
