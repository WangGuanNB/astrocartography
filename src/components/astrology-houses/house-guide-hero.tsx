import Image from "next/image";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import type { HouseGuideHero as HouseGuideHeroData } from "@/types/pages/house-guide";
import type { Image as ImageType } from "@/types/blocks/base";

export default function HouseGuideHero({
  hero,
  title,
  image,
}: {
  hero: HouseGuideHeroData;
  title: string;
  image?: ImageType;
}) {
  return (
    <section className="border-b border-white/10">
      <div className="container max-w-6xl px-4 pb-10 pt-4 lg:pb-14 lg:pt-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
          <div className="max-w-3xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
              <Icon name={hero.badgeIcon || "RiGroupLine"} className="size-4" />
              {hero.badge}
            </span>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/78 lg:text-xl">
              {hero.description}
            </p>

            {hero.actions && hero.actions.length > 0 && (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {hero.actions.map((action) => (
                  <Link
                    key={`${action.title}-${action.url}`}
                    href={action.url as any}
                    className={
                      action.variant === "primary"
                        ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                        : "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-primary/40 hover:bg-white/10"
                    }
                  >
                    {action.title}
                    {action.icon && <Icon name={action.icon} className="size-4" />}
                  </Link>
                ))}
              </div>
            )}

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              {hero.overviewItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3"
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold leading-6 text-white">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 lg:block">
            <div className="relative aspect-[4/3] min-h-[280px]">
              <Image
                src={image?.src || "/imgs/features/hero-web.webp"}
                alt={image?.alt || title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-background/85 p-4 backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {hero.overviewEyebrow || "Guide overview"}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {hero.overviewTitle}
                </p>
              </div>
            </div>
          </div>
        </div>

        {hero.links && hero.links.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {hero.links.map((item, index) => (
              <Link
                key={`${item.url}-${index}`}
                href={item.url as any}
                className="group flex min-h-[4.5rem] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-primary/35 hover:bg-white/[0.06]"
              >
                <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.text}
                </span>
                <span className="mt-3 text-sm font-semibold text-primary group-hover:underline">
                  {item.linkText} →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
