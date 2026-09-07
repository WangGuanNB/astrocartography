"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { HouseGuidePlanetsSection } from "@/types/pages/house-guide";

export default function GuidePlanetList({
  section,
}: {
  section: HouseGuidePlanetsSection;
}) {
  if (!section?.items?.length) return null;

  return (
    <section id={section.id} className="scroll-mt-28 py-10 lg:py-14">
      {section.label && (
        <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {section.label}
        </span>
      )}
      <h2 className="mb-4 text-[1.7rem] font-bold leading-tight text-white md:text-3xl lg:text-[2.35rem]">
        {section.title}
      </h2>
      {section.intro && (
        <p className="mb-8 max-w-3xl text-base leading-8 text-muted-foreground">
          {section.intro}
        </p>
      )}

      <div className="rounded-2xl border border-border/70 bg-card/50 px-4 shadow-sm md:px-6">
        <Accordion type="multiple" defaultValue={[`planet-0`]} className="w-full">
          {section.items.map((item, index) => (
            <AccordionItem
              key={item.planet}
              value={`planet-${index}`}
              className="border-b border-border/40 last:border-0"
            >
              <AccordionTrigger className="py-5 text-left hover:no-underline group">
                <div className="flex items-center gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-sm font-semibold text-primary transition-colors group-hover:bg-primary/20">
                    {index + 1}
                  </span>
                  <span className="text-base font-semibold text-white transition-colors group-hover:text-primary">
                    {item.title}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-5 pl-[3.25rem] pr-2">
                <p className="leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
