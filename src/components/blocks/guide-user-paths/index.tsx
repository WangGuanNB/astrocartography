import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { Section as SectionType } from "@/types/blocks/section";

export default function GuideUserPaths({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section
      id={section.name || "user-paths"}
      className="border-b border-white/10 bg-background"
    >
      <div className="container max-w-6xl px-4 py-12 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          {section.label && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {section.label}
            </p>
          )}
          {section.title && (
            <h2 className="mt-3 text-balance text-2xl font-bold text-white sm:text-3xl">
              {section.title}
            </h2>
          )}
          {section.description && (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {section.description}
            </p>
          )}
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
          {section.items?.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex items-start gap-3">
                {item.icon && (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name={item.icon} className="size-5" />
                  </span>
                )}
                <div>
                  {item.title && (
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  )}
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {item.buttons && item.buttons.length > 0 && (
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {item.buttons.map((button) => (
                    <Link
                      key={`${button.title}-${button.url}`}
                      href={button.url as any}
                      className={
                        button.variant === "outline"
                          ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-primary/40 hover:bg-white/10"
                          : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      }
                    >
                      {button.title}
                      {button.icon && <Icon name={button.icon} className="size-4" />}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
