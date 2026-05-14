"use client";

import Image from "next/image";
import Icon from "@/components/icon";
import { cn } from "@/lib/utils";
import { Section as SectionType } from "@/types/blocks/section";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FeatureWhatTwo({
  section,
}: {
  section: SectionType;
}) {
  if (section.disabled) {
    return null;
  }

  return (
    <section id={section.name} className="py-20 lg:py-24">
      <div className="container max-w-6xl space-y-16">
        <header className="flex flex-col items-center text-center gap-4">
          {section.label && (
            <span className="mb-4 inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {section.label}
            </span>
          )}
          {section.title && (
            <h2 className="mb-4 max-w-3xl text-balance text-3xl font-bold lg:text-4xl">
              {section.title}
            </h2>
          )}
          {section.description && (
            <p className="max-w-4xl text-muted-foreground lg:text-lg">
              {section.description}
            </p>
          )}
        </header>

        <div className="space-y-20 lg:space-y-24">
          {section.items?.map((item, index) => {
            const hasImage = Boolean(item.image?.src);
            const isReversed = index % 2 === 1;
            
            // 判断描述是否过长（超过300字符）
            const isLongDescription = (item.description?.length || 0) > 300;
            const shortDescription = isLongDescription 
              ? item.description?.slice(0, 300) + "..."
              : item.description;

            return (
              <FeatureItem
                key={index}
                item={item}
                hasImage={hasImage}
                isReversed={isReversed}
                isLongDescription={isLongDescription}
                shortDescription={shortDescription}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureItem({
  item,
  hasImage,
  isReversed,
  isLongDescription,
  shortDescription,
}: {
  item: any;
  hasImage: boolean;
  isReversed: boolean;
  isLongDescription: boolean;
  shortDescription?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      className={cn(
        "grid grid-cols-1 items-center gap-12 lg:gap-16",
        hasImage ? "lg:grid-cols-2" : "lg:grid-cols-[1fr]"
      )}
    >
      {hasImage && (
        <div
          className={cn(
            "order-1 overflow-hidden rounded-3xl",
            isReversed && "lg:order-2"
          )}
        >
          <div className="relative aspect-[4/3] w-full bg-muted">
            {item.image?.src ? (
              <Image
                src={item.image.src}
                alt={item.image.alt || item.title || ""}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                loading="lazy"
                quality={85}
              />
            ) : null}
          </div>
        </div>
      )}

      <div
        className={cn(
          "order-2 flex flex-col gap-6 lg:gap-8",
          isReversed && hasImage && "lg:order-1"
        )}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {item.icon && (
              <Icon
                name={item.icon}
                className="mt-1 size-7 shrink-0 text-primary"
              />
            )}
            <h3 className="text-3xl font-semibold leading-tight lg:text-4xl">
              {item.title}
            </h3>
          </div>
          
          {item.description && (
            <div className="max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
              {isLongDescription ? (
                <>
                  <p className={cn(!isExpanded && "line-clamp-4")}>
                    {isExpanded ? item.description : shortDescription}
                  </p>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Show Less" : "Read More"}
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </>
              ) : (
                <p>{item.description}</p>
              )}
            </div>
          )}
        </div>

        {item.list && item.list.length > 0 && (
          <ul className="grid gap-3 text-sm text-muted-foreground lg:grid-cols-2 lg:text-base">
            {item.list.map((point: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-2 inline-block size-1.5 rounded-full bg-primary"></span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
