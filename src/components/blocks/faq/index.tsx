import { Badge } from "@/components/ui/badge";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Section as SectionType } from "@/types/blocks/section";

export default function FAQ({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="py-16">
      <div className="container">
        <div className="text-center mb-16">
          {section.label && (
            <Badge variant="outline" className="mb-4 text-sm font-medium">
              {section.label}
            </Badge>
          )}
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl mb-2">
            {section.title}
          </h2>
          <p className="mx-auto max-w-4xl text-center text-sm text-muted-foreground md:text-base lg:text-lg">
            {section.description}
          </p>
        </div>
        
        <div className="mx-auto max-w-4xl">
          <Accordion type="multiple" className="w-full">
            {section.items?.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-b border-border/40"
              >
                <AccordionTrigger className="text-left hover:no-underline group">
                  <div className="flex items-center gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 font-mono text-sm font-semibold text-primary group-hover:bg-primary/20 transition-colors">
                      {index + 1}
                    </span>
                    <span className="text-base font-semibold group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 pl-12">
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
