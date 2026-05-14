"use client";

import { Badge } from "@/components/ui/badge";
import { Section as SectionType } from "@/types/blocks/section";
import Icon from "@/components/icon";
import {
  Edit,
  Palette,
  Settings2,
  Download,
  Search,
  Layers,
  Zap,
} from "lucide-react";
import { ComponentType } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

// 图标映射：将 Ri 图标名称映射到 lucide-react 图标
const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  RiEditLine: Edit,
  RiPaletteLine: Palette,
  RiSettings3Line: Settings2,
  RiDownloadLine: Download,
  RiSearchLine: Search,
  RiLayersLine: Layers,
  RiZapLine: Zap,
};

interface StepCardProps {
  icon: string | undefined;
  title: string | undefined;
  description: string | undefined;
  index: number;
}

const StepCard: React.FC<StepCardProps> = ({ icon, title, description, index }) => {
  // 尝试使用 lucide-react 图标
  const LucideIcon = icon ? iconMap[icon] : null;
  const iconElement = LucideIcon ? (
    <LucideIcon className="size-4 shrink-0 text-primary" />
  ) : icon ? (
    <Icon name={icon} className="size-4 shrink-0 text-primary" />
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}  // 🔥 改为 once: true，只触发一次
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
        delay: index * 0.1,
      }}
      className={cn(
        "relative rounded-2xl border bg-card p-6 text-card-foreground transition-all duration-300 ease-in-out",
        "hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-muted"
      )}
    >
      {/* Icon - 简洁模式，无圆圈背景 */}
      {iconElement && (
        <div className="mb-4 flex items-center gap-2">
          {iconElement}
        </div>
      )}

      {/* Title and Description */}
      {title && <h3 className="mb-2 text-base font-semibold lg:text-lg">{title}</h3>}
      {description && <p className="text-muted-foreground lg:text-lg">{description}</p>}
    </motion.div>
  );
};

export default function Feature3({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, {
    once: false,
    margin: "-50px",
    amount: 0.3,
  });

  const stepsData = section.items || [];

  return (
    <section id={section.name} className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="relative z-10 mx-auto max-w-4xl space-y-8 pb-8 text-center md:space-y-10 md:pb-12"
        >
          {section.label && (
            <Badge variant="outline" className="mb-4">
              {section.label}
            </Badge>
          )}
          <h2 className="text-center text-2xl font-medium md:text-3xl lg:text-4xl xl:text-5xl">
            {section.title}
          </h2>
          {section.description && (
            <p className="mx-auto max-w-3xl text-center text-sm text-muted-foreground md:text-base lg:text-lg">
              {section.description}
            </p>
          )}
        </motion.div>

        {/* Step Indicators with Connecting Line - 4列布局 */}
        <div className="relative mx-auto mb-8 hidden w-full max-w-7xl md:block">
          {/* 连接线：连接4个圆圈，从12.5%到87.5% */}
          <div
            aria-hidden="true"
            className="absolute left-[12.5%] top-1/2 h-0.5 w-[75%] -translate-y-1/2 bg-border"
          ></div>
          {/* 4列网格对齐步骤编号 */}
          <div className="relative grid grid-cols-4">
            {stepsData.map((_, index) => (
              <div
                key={index}
                className="relative z-10 flex h-8 w-8 items-center justify-center justify-self-center rounded-full bg-muted font-semibold text-foreground ring-4 ring-background"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Steps Grid - 4列布局 */}
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {stepsData.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
