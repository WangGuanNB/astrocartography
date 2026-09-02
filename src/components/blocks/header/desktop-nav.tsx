"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * 桌面端导航菜单组件
 * 🔥 SSR 优化：延迟挂载 DropdownMenu，避免 hydration 错误
 * Cloudflare Workers 兼容：不依赖 Node.js 特定 API
 */
export default function DesktopNav({ header }: { header: HeaderType }) {
  const [isMounted, setIsMounted] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname();

  // 🔥 关键优化：等待客户端挂载后再渲染交互式组件
  // 这样 SSR 时只渲染静态链接，客户端 hydration 后再启用下拉菜单
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  if (!header.nav?.items || header.nav.items.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-0.5 xl:gap-1">
      {header.nav.items.map((item, i) => {
        const menuKey = item.title || String(i);
        const navButtonClass = cn(
          "h-9 whitespace-nowrap px-2 text-sm text-muted-foreground xl:h-10 xl:px-3",
          buttonVariants({ variant: "ghost" })
        );

        if (item.children && item.children.length > 0) {
          // 🔥 SSR 时渲染静态按钮，客户端挂载后渲染完整的 DropdownMenu
          if (!isMounted) {
            return (
              <button
                key={i}
                className={cn(navButtonClass, "flex items-center gap-1")}
                disabled
              >
                {item.icon && (
                  <Icon name={item.icon} className="mr-1 size-3 shrink-0" />
                )}
                <span>{item.title}</span>
                <Icon name="RiArrowDownSLine" className="ml-1 size-3 opacity-60" />
              </button>
            );
          }

          return (
            <DropdownMenu
              key={i}
              open={openMenu === menuKey}
              onOpenChange={(open) => setOpenMenu(open ? menuKey : null)}
            >
              <DropdownMenuTrigger className={cn(navButtonClass, "flex items-center gap-1")}>
                {item.icon && (
                  <Icon name={item.icon} className="mr-1 size-3 shrink-0" />
                )}
                <span>{item.title}</span>
                <Icon name="RiArrowDownSLine" className="ml-1 size-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-3">
                {item.children.map((iitem, ii) => (
                  <Link
                    key={ii}
                    className={cn(
                      "flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    )}
                    href={iitem.url as any}
                    target={iitem.target}
                    onClick={() => setOpenMenu(null)}
                  >
                    {iitem.icon && (
                      <Icon name={iitem.icon} className="size-5 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-semibold">{iitem.title}</div>
                      <p className="text-sm leading-snug text-muted-foreground">
                        {iitem.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Link
            key={i}
            className={navButtonClass}
            href={item.url as any}
            target={item.target}
            onClick={() => setOpenMenu(null)}
          >
            {item.icon && (
              <Icon name={item.icon} className="mr-1 size-3 shrink-0" />
            )}
            {item.title}
          </Link>
        );
      })}
    </div>
  );
}
