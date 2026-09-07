import type { HouseGuideTocItem } from "@/types/pages/house-guide";

export default function GuideToc({
  items,
  label = "On this page",
  variant = "bar",
}: {
  items: HouseGuideTocItem[];
  label?: string;
  variant?: "bar" | "sidebar";
}) {
  if (!items?.length) return null;

  if (variant === "sidebar") {
    return (
      <nav aria-label={label} className="sticky top-28">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <ul className="space-y-1 border-l border-white/10">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="block border-l-2 border-transparent py-1.5 pl-3 text-sm text-white/55 transition hover:border-primary hover:text-white"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label={label}
      className="rounded-2xl border border-white/10 bg-white/[0.035] p-2"
    >
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="inline-flex min-h-10 shrink-0 items-center rounded-xl px-3.5 text-sm font-semibold text-white/65 transition hover:bg-white/8 hover:text-white"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
