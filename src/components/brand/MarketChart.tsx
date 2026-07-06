"use client";

import { useEffect, useRef } from "react";

export function MarketChart({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const points: number[] = [];

    function seed() {
      points.length = 0;
      let value = 0.5;
      for (let i = 0; i < 60; i++) {
        value += (Math.random() - 0.48) * 0.09;
        value = Math.max(0.1, Math.min(0.9, value));
        points.push(value);
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      if (points.length < 2 || width === 0) return;

      const step = width / (points.length - 1);

      ctx!.beginPath();
      points.forEach((p, i) => {
        const x = i * step;
        const y = height - p * height;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      });

      const lineGradient = ctx!.createLinearGradient(0, 0, width, 0);
      lineGradient.addColorStop(0, "rgba(51,214,160,0.1)");
      lineGradient.addColorStop(1, "rgba(51,214,160,0.9)");
      ctx!.strokeStyle = lineGradient;
      ctx!.lineWidth = 2;
      ctx!.shadowColor = "rgba(51,214,160,0.55)";
      ctx!.shadowBlur = 10;
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      ctx!.lineTo(width, height);
      ctx!.lineTo(0, height);
      ctx!.closePath();
      const fillGradient = ctx!.createLinearGradient(0, 0, 0, height);
      fillGradient.addColorStop(0, "rgba(51,214,160,0.16)");
      fillGradient.addColorStop(1, "rgba(51,214,160,0)");
      ctx!.fillStyle = fillGradient;
      ctx!.fill();
    }

    let raf = 0;
    let last = 0;

    function loop(t: number) {
      if (t - last > 650) {
        last = t;
        let value = points[points.length - 1];
        value += (Math.random() - 0.49) * 0.06;
        value = Math.max(0.08, Math.min(0.92, value));
        points.shift();
        points.push(value);
        draw();
      }
      raf = requestAnimationFrame(loop);
    }

    seed();
    resize();
    draw();

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);

    if (!prefersReducedMotion) {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`h-full w-full ${className}`}
    />
  );
}
