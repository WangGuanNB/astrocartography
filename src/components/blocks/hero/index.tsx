'use client';

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HappyUsers from "./happy-users";
import { Hero as HeroType } from "@/types/blocks/hero";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// 🔥 性能优化：懒加载 Starfield 组件，避免阻塞首屏渲染
// Cloudflare Workers 兼容：dynamic import 在 Edge Runtime 中完全支持
const Starfield = dynamic(() => import("@/components/ui/animated-shader-background"), {
  ssr: false,  // Starfield 依赖 Canvas API，只在客户端渲染
  loading: () => <div className="absolute inset-0" />,  // 占位符，避免布局偏移
});

export default function Hero({ hero }: { hero: HeroType }) {
  if (hero.disabled) {
    return null;
  }

  const highlightText = hero.highlight_text;
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[860px] w-full items-center justify-center overflow-hidden text-foreground py-20"
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <Starfield />
      </div>

      <section className="relative z-10 w-full">
        <div className="container max-w-5xl space-y-8 text-center">
          {hero.show_badge && (
            <div className="flex justify-center">
              <img
                src="/imgs/badges/phdaily.svg"
                alt="phdaily"
                className="h-10 object-cover"
              />
            </div>
          )}

          {hero.announcement && (
            <Link
              href={hero.announcement.url as any}
              className="hero-text-down mx-auto inline-flex items-center gap-3 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur"
            >
              {hero.announcement.label && (
                <Badge>{hero.announcement.label}</Badge>
              )}
              {hero.announcement.title}
            </Link>
          )}

          {texts && texts.length > 1 ? (
            <h1 className="hero-text-down mx-auto max-w-5xl text-balance text-4xl font-bold text-foreground leading-tight sm:text-5xl lg:text-6xl lg:leading-tight">
              {texts[0]?.split('\n').map((line, index, array) => (
                <React.Fragment key={index}>
                  {line}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              ))}
              <span className="bg-gradient-to-r from-primary via-primary/70 to-primary/50 bg-clip-text text-transparent">
                {highlightText}
              </span>
              <br />
              <span className="text-foreground/80">
                {texts[1]?.split('\n').map((line, index, array) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
            </h1>
          ) : (
            <h1 className="hero-text-down mx-auto max-w-5xl text-balance text-4xl font-bold text-foreground leading-tight sm:text-5xl lg:text-6xl lg:leading-tight">
              {hero.title?.split('\n').map((line, index, array) => (
                <React.Fragment key={index}>
                  {line}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              ))}
            </h1>
          )}

          <p
            className="hero-text-up mx-auto max-w-2xl text-base text-muted-foreground/90 sm:text-lg"
            dangerouslySetInnerHTML={{ __html: hero.description || "" }}
          />

          {hero.buttons && (
            <div className="hero-text-up flex flex-wrap justify-center gap-3">
              {hero.buttons.map((item, i) => {
                return (
                  <Link
                    key={i}
                    href={item.url as any}
                    target={item.target || ""}
                    className="flex"
                  >
                    <Button
                      className="min-w-[160px]"
                      size="lg"
                      variant={item.variant || "default"}
                    >
                      {item.icon && <Icon name={item.icon} className="mr-2" />}
                      {item.title}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}

          {hero.tip && (
            <p className="hero-text-up text-sm text-muted-foreground">{hero.tip}</p>
          )}

          {hero.show_happy_users && (
            <HappyUsers 
              rating={hero.happy_users?.rating}
              count={hero.happy_users?.count}
              label={hero.happy_users?.label}
              avatars={hero.happy_users?.avatars}
            />
          )}
        </div>
      </section>
    </div>
  );
}
