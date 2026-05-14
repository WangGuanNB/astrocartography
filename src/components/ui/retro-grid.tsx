import { cn } from "@/lib/utils";
import React from "react";

type RetroGridProps = {
  className?: string;
  angle?: number;
};

export function RetroGrid({ className, angle = 65 }: RetroGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        className,
      )}
      style={{ "--grid-angle": `${angle}deg` } as React.CSSProperties}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          className={cn(
            "animate-grid",
            "[background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:600vw]",
            "[background-image:linear-gradient(to_right,rgba(0,0,0,0.18)_1px,transparent_0),linear-gradient(to_bottom,rgba(0,0,0,0.18)_1px,transparent_0)]",
            "dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.55)_1px,transparent_0),linear-gradient(to_bottom,rgba(255,255,255,0.55)_1px,transparent_0)]",
          )}
        />
      </div>
      {/* 左右渐变遮罩，让两边的格子逐渐淡出 */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent via-transparent to-background opacity-80 dark:opacity-60" />
    </div>
  );
}
