"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * 桌面端导航菜单组件
 * 这个组件使用 dynamic import 设置 ssr: false，避免 hydration 错误
 */
export default function DesktopNav({ header }: { header: HeaderType }) {
  if (!header.nav?.items || header.nav.items.length === 0) {
    return null;
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {header.nav.items.map((item, i) => {
          if (item.children && item.children.length > 0) {
            return (
              <NavigationMenuItem
                key={i}
                className="text-muted-foreground"
              >
                <NavigationMenuTrigger
                  className={cn(
                    "text-muted-foreground",
                    buttonVariants({
                      variant: "ghost",
                    })
                  )}
                >
                  {item.icon && (
                    <Icon
                      name={item.icon}
                      className="size-3 shrink-0 mr-2"
                    />
                  )}
                  <span>{item.title}</span>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="w-80 p-3">
                    <NavigationMenuLink>
                      {item.children.map((iitem, ii) => (
                        <li key={ii}>
                          <Link
                            className={cn(
                              "flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            )}
                            href={iitem.url as any}
                            target={iitem.target}
                          >
                            {iitem.icon && (
                              <Icon
                                name={iitem.icon}
                                className="size-5 shrink-0"
                              />
                            )}
                            <div>
                              <div className="text-sm font-semibold">
                                {iitem.title}
                              </div>
                              <p className="text-sm leading-snug text-muted-foreground">
                                {iitem.description}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </NavigationMenuLink>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          }

          return (
            <NavigationMenuItem key={i}>
              <Link
                className={cn(
                  "text-muted-foreground",
                  navigationMenuTriggerStyle,
                  buttonVariants({
                    variant: "ghost",
                  })
                )}
                href={item.url as any}
                target={item.target}
              >
                {item.icon && (
                  <Icon
                    name={item.icon}
                    className="size-3 shrink-0 mr-0"
                  />
                )}
                {item.title}
              </Link>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

