"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<any>(null);

  useEffect(() => {
    let phi = 0;
    let width = 0;
    let lastTime = Date.now();

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    if (!canvasRef.current) return;

    globeRef.current = createGlobe(canvasRef.current, {
      devicePixelRatio: Math.min(window.devicePixelRatio, 1.5), // 🔥 限制最大 1.5x，降低渲染开销
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.5,
      mapSamples: 8000, // 🔥 从 16000 降到 8000，减少 50% CPU 开销
      mapBrightness: 5,
      baseColor: [0.3, 0.3, 0.4], // 提亮的蓝灰色
      markerColor: [0.9, 0.6, 1], // 明亮的紫色标记
      glowColor: [0.5, 0.4, 0.7], // 明亮的紫色光晕
      markers: [
        // 主要占星城市标记
        { location: [51.5074, -0.1278], size: 0.05 }, // London
        { location: [40.7128, -74.006], size: 0.05 }, // New York
        { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
        { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
        { location: [48.8566, 2.3522], size: 0.05 }, // Paris
      ],
    });

    // 动画循环 - 基于时间的转速，确保移动端和PC端一致
    let animationFrameId: number;
    const animate = () => {
      if (globeRef.current && canvasRef.current) {
        const now = Date.now();
        const delta = now - lastTime;
        lastTime = now;
        
        // 基于时间的旋转速度：每秒旋转0.3弧度（约17度/秒）
        // 这样无论帧率如何，转速都保持一致
        phi += (delta / 1000) * 0.3;
        
        globeRef.current.update({
          phi,
          width: width * 2,
          height: width * 2,
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    }, 0);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (globeRef.current) {
        globeRef.current.destroy();
      }
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 mx-auto aspect-square w-full max-w-[600px] opacity-50 top-[45%] -translate-y-1/2">
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
      />
    </div>
  );
}
