"use client";

import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { NavItem } from "@/types/blocks/base";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function ({
  className,
  items,
  ...props
}: {
  className?: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "grid w-full grid-cols-3 gap-2 rounded-xl border border-border/50 bg-background/70 p-2 shadow-sm backdrop-blur-sm lg:flex lg:flex-col lg:gap-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
        className
      )}
      aria-label="Account navigation"
      {...props}
    >
      {items.map((item, index) => (
        <Link
          key={index}
          href={item.url as any}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            item.is_active || pathname.includes(item.url as any)
              ? "bg-muted/50 text-primary hover:bg-muted hover:text-primary"
              : "hover:bg-transparent hover:underline",
            "min-h-12 min-w-0 justify-center gap-2 px-2 text-center text-xs leading-tight focus-visible:ring-2 focus-visible:ring-primary/60 sm:text-sm lg:min-h-11 lg:justify-start lg:px-4 lg:text-left"
          )}
        >
          {item.icon && <Icon name={item.icon} className="size-4 shrink-0" />}
          <span className="min-w-0 break-words lg:truncate">{item.title}</span>
        </Link>
      ))}
    </nav>
  );
}
