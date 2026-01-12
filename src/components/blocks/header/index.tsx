"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import dynamic from "next/dynamic";

import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import LocaleToggle from "@/components/locale/toggle";
import { Menu } from "lucide-react";
import SignToggle from "@/components/sign/toggle";
import ThemeToggle from "@/components/theme/toggle";

// 🔥 修复 hydration 错误：使用 dynamic import 设置 ssr: false
// 这样 NavigationMenu 只在客户端渲染，避免 SSR 和客户端 HTML 不匹配
const DesktopNav = dynamic(
  () => import("./desktop-nav"),
  {
    ssr: false,
    loading: () => (
      // SSR fallback：渲染一个简单的占位符，与客户端首次渲染一致
      <div className="flex items-center gap-1" />
    ),
  }
);

export default function Header({ header }: { header: HeaderType }) {
  if (header.disabled) {
    return null;
  }

  return (
    <section className="py-3" suppressHydrationWarning>
      <div className="container">
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link
              href={(header.brand?.url as any) || "/"}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <img
                  src={header.brand.logo.src}
                  alt={header.brand.logo.alt || header.brand.title}
                  className="w-6"
                />
              )}
              {header.brand?.title && (
                <span className="text-lg text-primary font-bold">
                  {header.brand?.title || ""}
                </span>
              )}
            </Link>
            {/* 🔥 修复 hydration 错误：使用 dynamic import，ssr: false */}
            {/* 这样 NavigationMenu 只在客户端渲染，完全避免 hydration 不匹配 */}
            <DesktopNav header={header} />
          </div>
          <div className="shrink-0 flex gap-2 items-center">
            {header.show_locale && <LocaleToggle />}
            {header.show_theme && <ThemeToggle />}

            {header.buttons?.map((item, i) => {
              return (
                <Button key={i} variant={item.variant}>
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
        </nav>

        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link
              href={(header.brand?.url || "/") as any}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <img
                  src={header.brand.logo.src}
                  alt={header.brand.logo.alt || header.brand.title}
                  className="w-6"
                />
              )}
              {header.brand?.title && (
                <span className="text-lg font-bold">
                  {header.brand?.title || ""}
                </span>
              )}
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="default" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link
                      href={(header.brand?.url || "/") as any}
                      className="flex items-center gap-2"
                    >
                      {header.brand?.logo?.src && (
                        <img
                          src={header.brand.logo.src}
                          alt={header.brand.logo.alt || header.brand.title}
                          className="w-8"
                        />
                      )}
                      {header.brand?.title && (
                        <span className="text-xl font-bold">
                          {header.brand?.title || ""}
                        </span>
                      )}
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="mb-8 mt-8 flex flex-col gap-4">
                  <Accordion type="single" collapsible className="w-full">
                    {header.nav?.items?.map((item, i) => {
                      if (item.children && item.children.length > 0) {
                        return (
                          <AccordionItem
                            key={i}
                            value={item.title || ""}
                            className="border-b-0"
                          >
                            <AccordionTrigger className="font-semibold my-4 flex items-center gap-2 px-4 hover:no-underline justify-start [&>svg:last-child]:ml-auto">
                              {item.icon && (
                                <Icon
                                  name={item.icon}
                                  className="size-3 shrink-0"
                                />
                              )}
                              {item.title}
                            </AccordionTrigger>
                            <AccordionContent className="pb-0">
                              {item.children.map((iitem, ii) => (
                                <Link
                                  key={ii}
                                  className="font-semibold my-2 flex items-center gap-2 px-4 pl-8 text-sm"
                                  href={iitem.url as any}
                                  target={iitem.target}
                                >
                                  {iitem.icon && (
                                    <Icon
                                      name={iitem.icon}
                                      className="size-3 shrink-0"
                                    />
                                  )}
                                  {iitem.title}
                                </Link>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      }
                      return (
                        <Link
                          key={i}
                          href={item.url as any}
                          target={item.target}
                          className="font-semibold my-4 flex items-center gap-2 px-4"
                        >
                          {item.icon && (
                            <Icon
                              name={item.icon}
                              className="size-3 shrink-0"
                            />
                          )}
                          {item.title}
                        </Link>
                      );
                    })}
                  </Accordion>
                </div>
                <div className="flex-1"></div>
                <div className="border-t pt-4">
                  <div className="mt-2 flex flex-col gap-3">
                    {header.buttons?.map((item, i) => {
                      return (
                        <Button key={i} variant={item.variant}>
                          <Link
                            href={item.url as any}
                            target={item.target || ""}
                            className="flex items-center gap-1"
                          >
                            {item.title}
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-3 shrink-0"
                              />
                            )}
                          </Link>
                        </Button>
                      );
                    })}

                    {header.show_sign && <SignToggle />}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {header.show_locale && <LocaleToggle />}
                    <div className="flex-1"></div>

                    {header.show_theme && <ThemeToggle />}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
}
