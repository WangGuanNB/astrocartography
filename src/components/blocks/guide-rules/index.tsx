import type { HouseGuideRulesSection } from "@/types/pages/house-guide";

export default function GuideRules({ section }: { section: HouseGuideRulesSection }) {
  if (!section) return null;

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
      {section.description && (
        <p className="mb-8 max-w-3xl text-base leading-8 text-muted-foreground">
          {section.description}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-primary">
            {section.doesLabel || "Rules"}
          </h3>
          <ul className="space-y-5">
            {section.does.map((item) => (
              <li key={item.title}>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-border/70 bg-card/40 p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {section.doesNotLabel || "Does not rule"}
          </h3>
          <ul className="space-y-5">
            {section.does_not.map((item) => (
              <li key={item.title}>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
