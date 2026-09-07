import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";

type HeroLink = {
  text: string;
  linkText: string;
  url: string;
};

type OverviewItem = {
  label: string;
  value: string;
};

type HeroAction = {
  title: string;
  url: string;
  icon?: string;
  variant?: "primary" | "secondary";
};

export type GuideHeroProps = {
  badge: string;
  badgeIcon?: string;
  title: string;
  description?: string;
  overviewTitle: string;
  overviewEyebrow?: string;
  overviewIcon?: string;
  overviewItems: OverviewItem[];
  actions?: HeroAction[];
  links?: HeroLink[];
  /** Tighten top spacing when a breadcrumb sits above the hero */
  compactTop?: boolean;
};

export default function GuideHero({
  badge,
  badgeIcon = "RiSparklingLine",
  title,
  description,
  overviewTitle,
  overviewEyebrow = "Guide overview",
  overviewIcon = badgeIcon,
  overviewItems,
  actions = [],
  links,
  compactTop = false,
}: GuideHeroProps) {
  return (
    <section className="border-b border-white/10 bg-background">
      <div
        className={`container max-w-6xl px-4 pb-16 lg:pb-20 ${
          compactTop ? "pt-6 lg:pt-8" : "pt-16 lg:pt-28"
        }`}
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Icon name={badgeIcon} className="size-4" />
              {badge}
            </div>

            <h1 className="text-balance text-[2.55rem] font-bold leading-[1.06] text-white sm:text-5xl lg:text-[3.75rem]">
              {title}
            </h1>

            {description && (
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
                {description}
              </p>
            )}

            {actions.length > 0 && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {actions.map((action) => (
                  <Link
                    key={`${action.title}-${action.url}`}
                    href={action.url as any}
                    className={
                      action.variant === "secondary"
                        ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-primary/40 hover:bg-white/10"
                        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    }
                  >
                    {action.title}
                    {action.icon && <Icon name={action.icon} className="size-4" />}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {overviewEyebrow}
                </p>
                <p className="mt-1 text-lg font-bold text-white">{overviewTitle}</p>
              </div>
              <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
                <Icon name={overviewIcon} className="size-5" />
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {overviewItems.map((item) => (
                <div key={item.label} className="grid grid-cols-[96px_1fr] gap-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold leading-6 text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {links && links.length > 0 && (
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.map((item, index) => (
              <Link
                key={`${item.url}-${index}`}
                href={item.url as any}
                className="group flex min-h-24 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all hover:border-primary/40 hover:bg-white/[0.055]"
              >
                <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.text}
                </span>
                <span className="mt-4 text-sm font-semibold text-primary group-hover:underline">
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
