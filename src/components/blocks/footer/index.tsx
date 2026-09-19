"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Footer as FooterType } from "@/types/blocks/footer";
import Icon from "@/components/icon";

function badgeRel(badge: Badge): string {
  return badge.dofollow
    ? "noopener noreferrer"
    : "noopener noreferrer nofollow";
}

function isTaaftBadge(badge: Badge): boolean {
  return badge.url.includes("theresanaiforthat.com");
}

function BadgeItem({
  badge,
  tabIndex,
  withTaaftId,
}: {
  badge: Badge;
  tabIndex?: number;
  withTaaftId?: boolean;
}) {
  const showImage = Boolean(badge.image?.src);
  const common = {
    href: badge.url,
    target: badge.target || "_blank",
    rel: badgeRel(badge),
    title: badge.title,
    "data-footer-badge": "" as const,
    ...(badge.dofollow ? { "data-dofollow": "" as const } : {}),
    ...(withTaaftId && isTaaftBadge(badge) ? { id: "taaft-verify" } : {}),
    tabIndex,
  };

  if (showImage && badge.image) {
    const width = badge.image.width || 200;
    const height = badge.image.height || 54;
    return (
      <a
        {...common}
        className="inline-flex h-10 shrink-0 items-center px-3 opacity-80 transition-opacity hover:opacity-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- partner crawlers may require exact remote badge URLs */}
        <img
          src={badge.image.src}
          alt={badge.image.alt || badge.title}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="h-8 w-auto max-h-8 object-contain"
        />
      </a>
    );
  }

  return (
    <a
      {...common}
      className="inline-flex h-10 shrink-0 items-center whitespace-nowrap px-4 text-sm text-muted-foreground transition-colors hover:text-primary"
    >
      {badge.title}
    </a>
  );
}

function BadgeTrack({
  badges,
  ariaHidden,
}: {
  badges: Badge[];
  ariaHidden?: boolean;
}) {
  return (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden ? true : undefined}
    >
      {badges.map((badge, i) => (
        <li key={`${ariaHidden ? "b" : "a"}-${i}`} className="shrink-0">
          <BadgeItem
            badge={badge}
            tabIndex={ariaHidden ? -1 : undefined}
            withTaaftId={!ariaHidden}
          />
        </li>
      ))}
    </ul>
  );
}

export default function Footer({
  footer,
  locale,
}: {
  footer: FooterType;
  locale?: string;
}) {
  const pathname = usePathname();

  const isToolPage = pathname?.includes("/chart");

  if (isToolPage) {
    return null;
  }

  if (footer.disabled) {
    return null;
  }

  const badges = footer.badges?.filter((b) => b?.title && b?.url) ?? [];
  const showBadgeMarquee = badges.length > 0;
  const scrollSeconds = Math.max(28, badges.length * 6);
  const brandHomeHref =
    footer.brand?.url ||
    (locale && locale !== "en" ? `/${locale}` : "/");

  return (
    <section id={footer.name} className="py-16">
      <div className="max-w-7xl mx-auto px-8">
        <footer>
          <div className="flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:text-left">
            <div className="flex w-full max-w-96 shrink flex-col items-center justify-between gap-6 lg:items-start">
              {footer.brand && (
                <div>
                  <Link
                    href={brandHomeHref}
                    className="flex items-center justify-center gap-2 lg:justify-start hover:opacity-90 transition-opacity"
                    aria-label={
                      footer.brand.title
                        ? `${footer.brand.title} home`
                        : "Home"
                    }
                  >
                    {footer.brand.logo && (
                      <img
                        src={footer.brand.logo.src}
                        alt={footer.brand.logo.alt || footer.brand.title}
                        className="h-11"
                      />
                    )}
                    {footer.brand.title && (
                      <p className="text-3xl font-semibold">
                        {footer.brand.title}
                      </p>
                    )}
                  </Link>
                  {footer.brand.description && (
                    <p className="mt-6 text-md text-muted-foreground">
                      {footer.brand.description}
                    </p>
                  )}
                </div>
              )}
              {footer.social && (
                <ul className="flex items-center space-x-6 text-muted-foreground">
                  {footer.social.items?.map((item, i) => (
                    <li key={i} className="font-medium hover:text-primary">
                      <a href={item.url} target={item.target}>
                        {item.icon && (
                          <Icon name={item.icon} className="size-4" />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid grid-cols-3 gap-6 lg:gap-20">
              {footer.nav?.items?.map((item, i) => (
                <div key={i}>
                  <p className="mb-6 font-bold">{item.title}</p>
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    {item.children?.map((iitem, ii) => (
                      <li key={ii} className="font-medium hover:text-primary">
                        <a href={iitem.url} target={iitem.target}>
                          {iitem.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-4 border-t pt-8 text-center text-sm font-medium text-muted-foreground lg:flex-row lg:items-center lg:text-left">
            {footer.copyright && <p className="shrink-0">{footer.copyright}</p>}

            {footer.agreement && (
              <ul className="flex shrink-0 justify-center gap-4 lg:justify-start">
                {footer.agreement.items?.map((item, i) => (
                  <li key={i} className="hover:text-primary">
                    <a href={item.url} target={item.target}>
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {showBadgeMarquee && (
            <div
              className="footer-badge-marquee-x mt-6 overflow-hidden border-t pt-6"
              style={
                {
                  ["--footer-badge-duration"]: `${scrollSeconds}s`,
                } as CSSProperties
              }
            >
              <div className="footer-badge-track-x">
                <BadgeTrack badges={badges} />
                <BadgeTrack badges={badges} ariaHidden />
              </div>
            </div>
          )}

          {/* Legacy single badge when badges array absent */}
          {!footer.badges && footer.badge?.url && (
            <div className="mt-6 flex justify-center opacity-60 hover:opacity-80 transition-opacity">
              <BadgeItem badge={footer.badge} withTaaftId />
            </div>
          )}
        </footer>
      </div>
    </section>
  );
}
