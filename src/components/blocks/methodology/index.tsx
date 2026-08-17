import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type MethodologySection = {
  label?: string;
  title: string;
  description?: string;
  highlights?: Array<{ label: string; url?: string }>;
  items: Array<{ title: string; description: string }>;
  disclaimer: string;
  lastUpdated?: string;
  lastUpdatedLabel?: string;
};

export default function MethodologyBlock({ section }: { section: MethodologySection }) {
  return (
    <section id="methodology" aria-labelledby="methodology-heading" className="py-12 md:py-16">
      <div className="container">
        <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
          {section.label && (
            <Badge variant="outline" className="mb-4 text-sm font-medium">
              {section.label}
            </Badge>
          )}
          <h2
            id="methodology-heading"
            className="text-2xl font-bold tracking-tight md:text-3xl"
          >
            {section.title}
          </h2>
          {section.description && (
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base lg:text-lg">
              {section.description}
            </p>
          )}
        </div>

        {section.highlights && section.highlights.length > 0 && (
          <ul className="mx-auto mb-8 flex max-w-3xl flex-wrap justify-center gap-2 md:mb-10">
            {section.highlights.map((pill, index) => (
              <li key={index}>
                {pill.url ? (
                  <a
                    href={pill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1",
                      "text-xs font-medium text-primary transition-colors hover:bg-primary/20 md:text-sm"
                    )}
                  >
                    {pill.label}
                  </a>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground/90 md:text-sm">
                    {pill.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mx-auto max-w-3xl">
          <Accordion type="multiple" defaultValue={["item-0"]} className="w-full">
            {section.items.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-border/40"
              >
                <AccordionTrigger className="text-left hover:no-underline group">
                  <div className="flex items-center gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-sm font-semibold text-primary transition-colors group-hover:bg-primary/20">
                      {index + 1}
                    </span>
                    <span className="text-base font-semibold transition-colors group-hover:text-primary">
                      {item.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pl-12 pt-2">
                  <p className="leading-relaxed text-muted-foreground">{item.description}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {section.disclaimer && (
            <div className="mt-8 rounded-lg border border-border/40 border-l-4 border-l-primary/50 bg-muted/30 px-4 py-3 md:px-5 md:py-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{section.disclaimer}</p>
            </div>
          )}

          {section.lastUpdated && (
            <p className="mt-4 text-center text-xs text-muted-foreground/80">
              {section.lastUpdatedLabel ?? "Last updated"}: {section.lastUpdated}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
