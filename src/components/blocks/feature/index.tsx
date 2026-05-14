import Icon from "@/components/icon";
import { Section as SectionType } from "@/types/blocks/section";

export default function Feature({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="py-20 lg:py-24">
      <div className="container">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center mb-16">
          {section.label && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {section.label}
            </span>
          )}
          <h2 className="text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            {section.title}
          </h2>
          <p className="max-w-2xl text-center text-sm text-muted-foreground md:text-base lg:text-lg">
            {section.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {section.items?.map((item, i) => (
            <div
              key={i}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* 背景渐变效果 */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative flex flex-col h-full">
                {/* 图标 */}
                {item.icon && (
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                    <Icon name={item.icon} className="size-6 text-primary" />
                  </div>
                )}

                {/* 标题 */}
                <h3 className="mb-3 text-xl font-semibold leading-tight transition-colors duration-300 group-hover:text-primary">
                  {item.title}
                </h3>

                {/* 描述 */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
