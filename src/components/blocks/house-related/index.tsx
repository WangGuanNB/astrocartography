import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import type { HouseGuideRelatedSection } from "@/types/pages/house-guide";

export default function HouseRelated({
  section,
}: {
  section: HouseGuideRelatedSection;
}) {
  if (!section?.items?.length) return null;

  return (
    <section id={section.id} className="scroll-mt-28 py-10 lg:py-14">
      <h2 className="mb-3 text-[1.7rem] font-bold leading-tight text-white md:text-3xl">
        {section.title}
      </h2>
      {section.description && (
        <p className="mb-8 max-w-3xl text-base leading-8 text-muted-foreground">
          {section.description}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {section.items.map((item) => (
          <Link
            key={item.href}
            href={item.href as any}
            className="group rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm transition hover:border-primary/35 hover:bg-card"
          >
            <div className="mb-3 flex items-center gap-3">
              {item.icon && (
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon name={item.icon} className="size-5" />
                </span>
              )}
              <span className="font-semibold text-white group-hover:text-primary">
                {item.title}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
