"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import LocaleToggle from "@/components/locale/toggle";
import { Menu, X } from "lucide-react";
import SignToggle from "@/components/sign/toggle";
import ThemeToggle from "@/components/theme/toggle";
import { cn } from "@/lib/utils";
import DesktopNav from "./desktop-nav";

export default function Header({ header }: { header: HeaderType }) {
  const pathname = usePathname();
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  
  // 检测是否是工具页面（chart页面）
  const isToolPage = pathname?.includes('/chart');

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (header.disabled) {
    return null;
  }

  return (
    <header>
      <nav
        data-state={menuState ? "active" : undefined}
        className="fixed z-20 w-full px-2 group"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-7xl px-6 transition-all duration-300 lg:px-12",
            (isScrolled || isToolPage) &&
              "bg-background/50 rounded-2xl border border-border/30 backdrop-blur-lg"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            {/* 左侧：Logo + 导航菜单 */}
            <div className="flex w-full items-center justify-between lg:w-auto lg:justify-start lg:gap-6">
              <Link
                href={(header.brand?.url as any) || "/"}
                className="flex items-center gap-2"
                aria-label="home"
                onClick={() => setMenuState(false)}
              >
                {header.brand?.logo?.src && (
                  <img
                    src={header.brand.logo.src}
                    alt={header.brand.logo.alt || header.brand.title}
                    className="w-6"
                  />
                )}
                {header.brand?.title && (
                  <span className="text-lg font-semibold text-foreground">
                    {header.brand?.title || ""}
                  </span>
                )}
              </Link>
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
              {/* 桌面端导航菜单 - 靠左，紧跟在 Logo 后面 */}
              <div className="hidden lg:block">
                <DesktopNav header={header} />
              </div>
            </div>

            {/* 右侧控制按钮 - 桌面端 */}
            <div className="hidden w-full flex-wrap items-center justify-end gap-2 lg:flex lg:w-fit">
              {header.show_locale && <LocaleToggle />}
              {header.show_theme && <ThemeToggle />}
              {header.buttons?.map((item, i) => {
                return (
                  <Button key={i} variant={item.variant} size="sm">
                    <Link
                      href={item.url as any}
                      target={item.target || ""}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      {item.title}
                      {item.icon && (
                        <Icon name={item.icon} className="size-3 shrink-0" />
                      )}
                    </Link>
                  </Button>
                );
              })}
              {header.show_sign && <SignToggle />}
            </div>
          </div>

          {/* 移动端展开菜单 - 下拉式 */}
          <div className="bg-background group-data-[state=active]:block mb-6 hidden w-full rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 dark:shadow-none">
            {/* 上半部分：导航菜单 */}
            <div className="w-full pb-4">
              <Accordion type="single" collapsible className="w-full">
                {header.nav?.items?.map((item, i) => {
                  if (item.children && item.children.length > 0) {
                    return (
                      <AccordionItem
                        key={i}
                        value={item.title || ""}
                        className="border-b-0"
                      >
                        <AccordionTrigger className="text-foreground/90 hover:text-foreground py-2 text-base font-medium hover:no-underline [&>svg]:ml-auto">
                          <div className="flex items-center gap-3">
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0"
                              />
                            )}
                            <span>{item.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
                          <div className="space-y-2 pl-7">
                            {item.children.map((iitem, ii) => (
                              <Link
                                key={ii}
                                href={iitem.url as any}
                                target={iitem.target}
                                className="text-foreground/80 hover:text-foreground flex items-center gap-2 py-2 text-sm font-medium transition-colors duration-150"
                                onClick={() => setMenuState(false)}
                              >
                                {iitem.icon && (
                                  <Icon
                                    name={iitem.icon}
                                    className="size-3 shrink-0"
                                  />
                                )}
                                <span>{iitem.title}</span>
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  }
                  return (
                    <Link
                      key={i}
                      href={item.url as any}
                      target={item.target}
                      className="text-foreground/90 hover:text-foreground flex items-center gap-3 py-3 text-base font-medium transition-colors duration-150"
                      onClick={() => setMenuState(false)}
                    >
                      {item.icon && (
                        <Icon
                          name={item.icon}
                          className="size-4 shrink-0"
                        />
                      )}
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </Accordion>
            </div>

            {/* 分隔线 */}
            {(header.show_locale || header.show_theme || header.show_sign || (header.buttons && header.buttons.length > 0)) && (
              <div className="border-t border-border/50 my-4"></div>
            )}

            {/* 下半部分：多语言、主题切换、按钮和登录 */}
            <div className="w-full pt-2 space-y-4">
              {/* 多语言和主题切换 - 水平排列 */}
              {(header.show_locale || header.show_theme) && (
                <div className="flex items-center justify-between gap-4 py-2">
                  {header.show_locale && (
                    <div className="flex-1">
                      <LocaleToggle />
                    </div>
                  )}
                  {header.show_theme && (
                    <div className="flex-1 flex justify-end">
                      <ThemeToggle />
                    </div>
                  )}
                </div>
              )}

              {/* 自定义按钮 */}
              {header.buttons && header.buttons.length > 0 && (
                <div className="flex flex-col gap-3">
                  {header.buttons.map((item, i) => {
                    return (
                      <Button
                        key={i}
                        variant={item.variant}
                        size="default"
                        className="w-full"
                        asChild
                      >
                        <Link
                          href={item.url as any}
                          target={item.target || ""}
                          className="flex items-center justify-center gap-2"
                          onClick={() => setMenuState(false)}
                        >
                          {item.icon && (
                            <Icon name={item.icon} className="size-4 shrink-0" />
                          )}
                          <span>{item.title}</span>
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* 登录/注册按钮 */}
              {header.show_sign && (
                <div className="pt-2 flex justify-start">
                  <SignToggle />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
