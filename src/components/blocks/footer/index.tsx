import { Footer as FooterType } from "@/types/blocks/footer";
import Icon from "@/components/icon";
import ToplistBadge from "./toplist-badge";

export default function Footer({
  footer,
  locale,
}: {
  footer: FooterType;
  locale?: string;
}) {
  if (footer.disabled) {
    return null;
  }

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
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center">
              {footer.copyright && (
                <p>
                  {footer.copyright}
                </p>
              )}
              
              {/* 新的badges数组（英文版本使用） */}
              {footer.badges && footer.badges.length > 0 && (
                <div className="flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity">
                  {footer.badges.map((badge, i) => (
                    <a
                      key={i}
                      href={badge.url}
                      target={badge.target || "_blank"}
                      rel="noopener noreferrer"
                      title={badge.title}
                      className="inline-block hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={badge.image.src}
                        alt={badge.image.alt || badge.title}
                        width={Math.round((badge.image.width || 171) * 0.8)} 
                        height={Math.round((badge.image.height || 54) * 0.8)}
                        className="h-auto max-h-10"
                      />
                    </a>
                  ))}
                </div>
              )}
              {/* TOPlist.cz 流量统计（仅英文站） */}
              {locale === "en" && (
                <div className="flex items-center gap-3">
                  <ToplistBadge />
                </div>
              )}
              
              {/* 旧的单个badge字段（其他语言版本使用） */}
              {!footer.badges && footer.badge && (
                <div className="flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity">
                  <a
                    href={footer.badge.url}
                    target={footer.badge.target || "_blank"}
                    rel="noopener noreferrer"
                    title={footer.badge.title}
                    className="inline-block hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={footer.badge.image.src}
                      alt={footer.badge.image.alt || footer.badge.title}
                      width={Math.round((footer.badge.image.width || 200) * 0.8)} 
                      height={Math.round((footer.badge.image.height || 54) * 0.8)}
                      className="h-auto max-h-10"
                    />
                  </a>
                </div>
              )}
            </div>

            {footer.agreement && (
              <ul className="flex justify-center gap-4 lg:justify-start">
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
