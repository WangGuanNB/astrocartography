"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Badge, Footer as FooterType } from "@/types/blocks/footer";
import Icon from "@/components/icon";

function badgeRel(badge: Badge): string {
  return badge.dofollow
    ? "noopener noreferrer"
    : "noopener noreferrer nofollow";
}

function BadgeTextLink({
  badge,
  tabIndex,
}: {
  badge: Badge;
  tabIndex?: number;
}) {
  return (
    <a
      href={badge.url}
      target={badge.target || "_blank"}
      rel={badgeRel(badge)}
      title={badge.title}
      data-footer-badge=""
      {...(badge.dofollow ? { "data-dofollow": "" } : {})}
      tabIndex={tabIndex}
      className="block h-5 truncate text-sm leading-5 hover:text-primary"
    >
      {badge.title}
    </a>
  );
}

function BadgeImageLink({
  badge,
  tabIndex,
}: {
  badge: Badge;
  tabIndex?: number;
}) {
  if (!badge.image?.src) {
    return <BadgeTextLink badge={badge} tabIndex={tabIndex} />;
  }

  return (
    <a
      href={badge.url}
      target={badge.target || "_blank"}
      rel={badgeRel(badge)}
      title={badge.title}
      data-footer-badge=""
      {...(badge.dofollow ? { "data-dofollow": "" } : {})}
      tabIndex={tabIndex}
      className="inline-block hover:opacity-90 transition-opacity"
    >
      <img
        src={badge.image.src}
        alt={badge.image.alt || badge.title}
        width={Math.round((badge.image.width || 171) * 0.8)}
        height={Math.round((badge.image.height || 54) * 0.8)}
        loading="lazy"
        className="h-auto max-h-10"
      />
    </a>
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
  const scrollSeconds = Math.max(14, badges.length * 2.5);

  return (
    <section id={footer.name} className="py-16">
      <div className="max-w-7xl mx-auto px-8">
        <footer>
          <div className="flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:text-left">
            <div className="flex w-full max-w-96 shrink flex-col items-center justify-between gap-6 lg:items-start">
              {footer.brand && (
                <div>
                  <div className="flex items-center justify-center gap-2 lg:justify-start">
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
                  </div>
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
            <div className="flex min-w-0 flex-col items-center gap-4 lg:flex-row lg:items-center">
              {footer.copyright && <p className="shrink-0">{footer.copyright}</p>}

              {showBadgeMarquee && (
                <div
                  className="footer-badge-marquee h-11 w-full max-w-xs shrink-0 overflow-hidden opacity-70 hover:opacity-100"
                  style={
                    {
                      ["--footer-badge-duration"]: `${scrollSeconds}s`,
                    } as CSSProperties
                  }
                >
                  <div className="footer-badge-track">
                    <ul className="space-y-1">
                      {badges.map((badge, i) => (
                        <li key={`badge-a-${i}`}>
                          {badge.image?.src ? (
                            <BadgeImageLink badge={badge} />
                          ) : (
                            <BadgeTextLink badge={badge} />
                          )}
                        </li>
                      ))}
                    </ul>
                    {/* Duplicate for seamless loop; hidden from a11y / tab order */}
                    <ul className="space-y-1" aria-hidden="true">
                      {badges.map((badge, i) => (
                        <li key={`badge-b-${i}`}>
                          {badge.image?.src ? (
                            <BadgeImageLink badge={badge} tabIndex={-1} />
                          ) : (
                            <BadgeTextLink badge={badge} tabIndex={-1} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Legacy single badge (image) when badges array absent */}
              {!footer.badges && footer.badge?.url && (
                <div className="flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity">
                  <BadgeImageLink badge={footer.badge} />
                </div>
              )}
            </div>

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
        </footer>
      </div>
    </section>
  );
}
