"use client";

import React, { useEffect, useRef } from "react";
import { useMessageEffects } from "@/hooks/useMessageEffects";
import { ClientOnly } from "@/components/utils/ClientOnly";

class Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  canvasWidth: number;
  canvasHeight: number;

  constructor(
    x: number,
    y: number,
    color: string,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.originX = x;
    this.originY = y;
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.size = Math.random() * 3 + 1;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(animationSpeed: number) {
    const dx = this.originX - this.x;
    const dy = this.originY - this.y;
    this.vx += dx * 0.01 * animationSpeed;
    this.vy += dy * 0.01 * animationSpeed;

    this.vx *= 0.95;
    this.vy *= 0.95;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  explode(animationSpeed: number) {
    this.vx = (Math.random() - 0.5) * 20 * animationSpeed;
    this.vy = (Math.random() - 0.5) * 20 * animationSpeed;
  }
}

export interface ParticleEffectProps {
  text: string;
  trigger?: boolean;
  className?: string;
}

/**
 * パーティクルテキストエフェクト
 * 文字が粒子となって集合・分散するエフェクト
 */
export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  text,
  trigger = false,
  className = "",
}) => {
  const { isEffectEnabled, animationSpeed, getQualityMultiplier } = useMessageEffects();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !isEffectEnabled('particles')) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();

    // 品質に基づく解像度調整
    const qualityMultiplier = getQualityMultiplier();
    const dpiScale = qualityMultiplier * window.devicePixelRatio;

    canvas.width = rect.width * dpiScale;
    canvas.height = rect.height * dpiScale;
    ctx.scale(dpiScale, dpiScale);

    // テキストを描画して粒子化
    const fontSize = Math.max(16, 32 * qualityMultiplier);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / (2 * dpiScale), canvas.height / (2 * dpiScale));

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const particles: Particle[] = [];

    // ピクセルデータから粒子を生成（品質に基づく密度調整）
    const step = Math.max(4, Math.floor(8 / qualityMultiplier));
    for (let y = 0; y < imageData.height; y += step) {
      for (let x = 0; x < imageData.width; x += step) {
        const index = (y * imageData.width + x) * 4;
        const alpha = imageData.data[index + 3];

        if (alpha > 128) {
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const color = `rgba(${r}, ${g}, ${b}, 1)`;
          particles.push(
            new Particle(x / dpiScale, y / dpiScale, color, canvas.width, canvas.height)
          );
        }
      }
    }

    particlesRef.current = particles;

    // アニメーションループ
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width / dpiScale, canvas.height / dpiScale);

      particles.forEach((particle) => {
        particle.update(animationSpeed);
        particle.draw(ctx);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [text, isEffectEnabled, animationSpeed, getQualityMultiplier]);

  useEffect(() => {
    if (trigger && isEffectEnabled('particles')) {
      particlesRef.current.forEach((particle) =>
        particle.explode(animationSpeed)
      );
    }
  }, [trigger, isEffectEnabled, animationSpeed]);

  if (!isEffectEnabled('particles')) return null;

  return (
    <ClientOnly>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none w-full h-32 ${className}`}
        style={{ background: "transparent" }}
      />
    </ClientOnly>
  );
};