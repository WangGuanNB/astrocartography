'use client';

import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HappyUsers from "./happy-users";
import { Hero as HeroType } from "@/types/blocks/hero";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const DEFAULT_HERO_BACKGROUND = "/imgs/features/hero-web.webp";

export default function Hero({ hero }: { hero: HeroType }) {
  if (hero.disabled) {
    return null;
  }

  const highlightText = hero.highlight_text;
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }

  const backgroundImage =
    hero.image?.src || hero.images?.[0]?.src || DEFAULT_HERO_BACKGROUND;
  return (
    <div
      className={cn(
        "relative flex min-h-[860px] w-full items-center justify-center overflow-hidden text-foreground py-20"
      )}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* Full-bleed faded product map */}
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-[1.03] object-cover object-center opacity-[0.42] saturate-[0.9] brightness-[0.72]"
        />
        {/* Base wash so the map reads soft, not busy */}
        <div className="absolute inset-0 bg-background/45" />
        {/* Vertical fade: readable headline zone, map still visible at edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/88 via-background/30 to-background/95" />
        {/* Center vignette keeps text on a calm field */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_42%,transparent_0%,hsl(var(--background)/0.5)_55%,hsl(var(--background)/0.88)_100%)]"
        />
        {/* Subtle brand tint */}
        <div className="absolute inset-0 bg-primary/[0.06] mix-blend-soft-light" />
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

          {hero.stats && hero.stats.length > 0 && (
            <div className="hero-text-up mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              {hero.stats.map((stat, index) => (
                <div key={`${stat.label}-${index}`} className="flex items-center gap-2">
                  {stat.icon && <Icon name={stat.icon} className="h-4 w-4 text-primary" />}
                  <span className="font-semibold text-foreground">{stat.value}</span>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
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
