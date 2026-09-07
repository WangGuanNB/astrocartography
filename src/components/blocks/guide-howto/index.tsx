import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import type { HouseGuideHowtoSection } from "@/types/pages/house-guide";

export default function GuideHowto({ section }: { section: HouseGuideHowtoSection }) {
  if (!section?.steps?.length) return null;

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
        <p className="mb-10 max-w-3xl text-base leading-8 text-muted-foreground">
          {section.intro}
        </p>
      )}

      <ol className="relative space-y-0">
        {section.steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
            {index < section.steps.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[17px] top-10 bottom-0 w-px bg-gradient-to-b from-primary/40 to-white/10"
              />
            )}
            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-sm font-bold text-primary shadow-sm shadow-primary/10">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white md:text-lg">
                {step.icon && <Icon name={step.icon} className="size-4 text-primary" />}
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {section.primary_cta && (
        <div className="mt-8">
          <Link
            href={section.primary_cta.url as any}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            {section.primary_cta.title}
            {section.primary_cta.icon && (
              <Icon name={section.primary_cta.icon} className="size-4" />
            )}
          </Link>
        </div>
      )}
    </section>
  );
}
