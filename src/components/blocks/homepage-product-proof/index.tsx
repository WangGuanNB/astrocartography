import Image from "next/image";
import Link from "next/link";

import Icon from "@/components/icon";
import { Section as SectionType } from "@/types/blocks/section";

export default function HomepageProductProof({
  section,
}: {
  section: SectionType;
}) {
  if (section.disabled) {
    return null;
  }

  return (
    <section
      id={section.name || "product-access"}
      className="border-y border-border/60 bg-muted/20 py-16 md:py-24"
    >
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          {section.label && (
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {section.label}
            </p>
          )}
          {section.title && (
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              {section.title}
            </h2>
          )}
          {section.description && (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              {section.description}
            </p>
          )}
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {section.items?.map((item, index) => (
              <article
                key={`${item.title}-${index}`}
                className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {item.icon && (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon name={item.icon} className="size-5" />
                    </span>
                  )}
                  <div>
                    {item.label && (
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {item.label}
                      </p>
                    )}
                    {item.title && (
                      <h3 className="mt-1 text-xl font-semibold">{item.title}</h3>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}

                {item.list && item.list.length > 0 && (
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                    {item.list.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Icon
                          name="RiCheckLine"
                          className="mt-0.5 size-4 shrink-0 text-primary"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          <figure className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
            {section.image?.src && (
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <Image
                  src={section.image.src}
                  alt={section.image.alt || section.title || ""}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              </div>
            )}

            <figcaption className="p-6 md:p-7">
              {section.cta?.title && (
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon name="RiInformationLine" className="size-4 text-primary" />
                  <span>{section.cta.title}</span>
                </div>
              )}
              {section.cta?.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {section.cta.description}
                </p>
              )}
              {section.cta?.button && (
                <Link
                  href={section.cta.button.url || "/#generator"}
                  className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {section.cta.button.icon && (
                    <Icon name={section.cta.button.icon} className="size-4" />
                  )}
                  {section.cta.button.title}
                </Link>
              )}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
