"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffectSettings } from "@/hooks/useEffectSettings";
import { ClientOnly } from "@/components/utils/ClientOnly";

// WebGL Support Detection
const detectWebGLSupport = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!(gl && gl instanceof WebGLRenderingContext);
  } catch (e) {
    return false;
  }
};

// Performance Level Detection
const detectPerformanceLevel = (): "low" | "medium" | "high" => {
  if (typeof navigator === "undefined") return "medium";

  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;

  if (hardwareConcurrency >= 8 && memory >= 8) return "high";
  if (hardwareConcurrency >= 4 && memory >= 4) return "medium";
  return "low";
};

class Particle {
  x: number;
  y: number;
  z: number; // 3D coordinates
  originX: number;
  originY: number;
  originZ: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
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
    this.originZ = Math.random() * 100 - 50; // Random depth
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.z = this.originZ;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.color = color;
    this.size = Math.random() * 3 + 1;
    this.opacity = 1;
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(animationSpeed: number, time: number = 0) {
    const dx = this.originX - this.x;
    const dy = this.originY - this.y;
    const dz = this.originZ - this.z;

    this.vx += dx * 0.01 * animationSpeed;
    this.vy += dy * 0.01 * animationSpeed;
    this.vz += dz * 0.005 * animationSpeed;

    this.vx *= 0.95;
    this.vy *= 0.95;
    this.vz *= 0.95;

    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;

    // Add some floating animation
    this.y += Math.sin(time * 0.001 + this.originX * 0.01) * 0.5;
    this.rotation += this.rotationSpeed;

    // Update opacity based on depth
    this.opacity = Math.max(0.1, 1 - Math.abs(this.z) / 100);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const scale = 1 + this.z / 100; // Perspective scaling
    const scaledSize = this.size * scale;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Apply 3D transformation
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(scale, scale);

    // Create gradient for 3D effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, scaledSize);
    gradient.addColorStop(0, this.color);

    // Parse rgba color and reconstruct with correct alpha value
    const rgbaMatch = this.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)?/);
    let colorWithAlpha = this.color;
    if (rgbaMatch) {
      const [, r, g, b] = rgbaMatch;
      colorWithAlpha = `rgba(${r}, ${g}, ${b}, 0.6)`;
    }
    gradient.addColorStop(0.7, colorWithAlpha);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, scaledSize, 0, Math.PI * 2);
    ctx.fill();

    // Add glow effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10 * scale;
    ctx.fill();

    ctx.restore();
  }

  explode(animationSpeed: number) {
    this.vx = (Math.random() - 0.5) * 20 * animationSpeed;
    this.vy = (Math.random() - 0.5) * 20 * animationSpeed;
    this.vz = (Math.random() - 0.5) * 10 * animationSpeed;
    this.rotationSpeed *= 3;
  }
}

/**
 * 3Dホログラムメッセージ
 * WebGLまたはCanvas 2Dを使用した立体的なメッセージ表示
 */
export const HologramMessage: React.FC<{ text: string }> = ({ text }) => {
  const { settings } = useEffectSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [webglSupported, setWebglSupported] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState<
    "low" | "medium" | "high"
  >("medium");
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);

  // Check WebGL support and performance level
  useEffect(() => {
    setWebglSupported(detectWebGLSupport());
    setPerformanceLevel(detectPerformanceLevel());
  }, []);

  // Initialize 3D hologram effect
  useEffect(() => {
    // Early return if conditions not met
    if (
      !settings.threeDEffects?.hologram.enabled ||
      !settings.threeDEffects?.enabled ||
      (settings.effectQuality === "low" && performanceLevel === "low") ||
      (!settings.webglEnabled &&
        !webglSupported &&
        settings.adaptivePerformance)
    ) {
      return;
    }
    if (!canvasRef.current || !text) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    // Generate hologram particles from text
    ctx.font = "32px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(text, rect.width / 2, rect.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const particles: Particle[] = [];

    // Create particles from text pixels with performance and settings consideration
    const baseStep =
      performanceLevel === "high" ? 4 : performanceLevel === "medium" ? 6 : 8;
    const qualityMultiplier =
      settings.effectQuality === "high"
        ? 0.8
        : settings.effectQuality === "medium"
        ? 1
        : 1.5;
    const step = Math.max(3, Math.floor(baseStep * qualityMultiplier));
    const maxParticleCount = settings.maxParticles || 2000;
    let particleCount = 0;
    for (let y = 0; y < imageData.height; y += step) {
      for (let x = 0; x < imageData.width; x += step) {
        const index = (y * imageData.width + x) * 4;
        const alpha = imageData.data[index + 3];

        if (alpha > 128 && particleCount < maxParticleCount) {
          const hologramColor = `rgba(0, 255, 136, ${alpha / 255})`;
          particles.push(
            new Particle(
              x / dpr,
              y / dpr,
              hologramColor,
              rect.width,
              rect.height
            )
          );
          particleCount++;
        }
      }
    }

    particlesRef.current = particles;
    timeRef.current = 0;

    // 3D Animation loop
    const animate = () => {
      timeRef.current += 16; // Assume 60fps
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Dark background with holographic grid
      ctx.fillStyle = "rgba(15, 15, 35, 0.95)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw holographic grid lines
      ctx.strokeStyle = "rgba(0, 255, 136, 0.1)";
      ctx.lineWidth = 1;
      const gridSize = 20;

      for (let x = 0; x < rect.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }

      for (let y = 0; y < rect.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }

      // Draw 3D particles
      particles.forEach((particle) => {
        particle.update(settings.animationSpeed, timeRef.current);
        particle.draw(ctx);
      });

      // Hologram scan line effect
      const scanY =
        ((timeRef.current * 0.1 * settings.animationSpeed) %
          (rect.height + 100)) -
        50;
      const gradient = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.5, "rgba(0, 255, 136, 0.3)");
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 50, rect.width, 100);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    text,
    settings.threeDEffects?.hologram.enabled,
    settings.animationSpeed,
    settings.effectQuality,
    performanceLevel,
    settings.threeDEffects?.enabled,
    settings.webglEnabled,
    settings.adaptivePerformance,
    settings.maxParticles,
    webglSupported,
  ]);

  // 3D機能が無効または低パフォーマンス環境の場合は軽量版を表示
  if (
    !settings.threeDEffects?.hologram.enabled ||
    !settings.threeDEffects?.enabled ||
    (settings.effectQuality === "low" && performanceLevel === "low") ||
    (!settings.webglEnabled && !webglSupported && settings.adaptivePerformance)
  ) {
    return null;
  }

  return (
    <ClientOnly
      fallback={
        <div className="w-full h-48 bg-slate-800/20 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-green-400">Initializing Hologram...</div>
        </div>
      }>
      <div className="w-full h-48 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-lg"
          style={{ background: "transparent" }}
        />

        {/* Performance indicator */}
        {settings.effectQuality === "high" && (
          <div className="absolute top-2 right-2 text-xs text-green-400/60">
            {webglSupported && settings.webglEnabled ? "3D WebGL" : "3D Canvas"}{" "}
            • {performanceLevel.toUpperCase()}
            <br />
            <span className="text-green-400/40">
              {particlesRef.current.length}/{settings.maxParticles} particles
            </span>
          </div>
        )}

        {/* Hologram border effects */}
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            boxShadow: `
                 inset 0 0 20px rgba(0, 255, 136, 0.2),
                 0 0 40px rgba(0, 255, 136, 0.1),
                 0 0 80px rgba(0, 255, 136, 0.05)
               `,
            border: "1px solid rgba(0, 255, 136, 0.3)",
          }}
        />
      </div>
    </ClientOnly>
  );
};

/**
 * パーティクルテキストエフェクト
 * 文字が粒子となって集合・分散するエフェクト
 */
export const ParticleText: React.FC<{ text: string; trigger: boolean }> = ({
  text,
  trigger,
}) => {
  const { settings } = useEffectSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !settings.threeDEffects?.particleText.enabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();

    // High DPI support with performance consideration
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      settings.effectQuality === "high" ? 2 : 1
    );
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    // テキストを描画して粒子化
    ctx.font = "32px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 4, canvas.height / 4);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const particles: Particle[] = [];

    // ピクセルデータから粒子を生成（パフォーマンスに応じた密度調整）
    const step =
      settings.effectQuality === "high"
        ? 4
        : settings.effectQuality === "medium"
        ? 6
        : 8;
    const maxParticleCount = Math.min(
      settings.maxParticles || 2000,
      detectPerformanceLevel() === "low" ? 500 : 2000
    );
    let particleCount = 0;

    for (let y = 0; y < imageData.height; y += step) {
      for (let x = 0; x < imageData.width; x += step) {
        const index = (y * imageData.width + x) * 4;
        const alpha = imageData.data[index + 3];

        if (alpha > 128 && particleCount < maxParticleCount) {
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          // Enhanced 3D coloring with depth variation
          const should3DEffects =
            settings.threeDEffects?.enabled &&
            (settings.webglEnabled ||
              detectWebGLSupport() ||
              !settings.adaptivePerformance);
          const depth = should3DEffects ? Math.random() * 0.5 + 0.5 : 1;
          const color = `rgba(${Math.floor(r * depth)}, ${Math.floor(
            g * depth
          )}, ${Math.floor(b * depth)}, ${depth})`;
          particles.push(
            new Particle(
              x / 2,
              y / 2,
              color,
              canvas.width / 2,
              canvas.height / 2
            )
          );
          particleCount++;
        }
      }
    }

    particlesRef.current = particles;

    // Enhanced 3D Animation loop
    let time = 0;
    const animate = () => {
      time += 16; // Assume 60fps
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Add background depth effect
      const should3DEffects =
        settings.threeDEffects?.enabled &&
        (settings.webglEnabled ||
          detectWebGLSupport() ||
          !settings.adaptivePerformance);
      if (
        settings.effectQuality !== "low" &&
        should3DEffects &&
        settings.threeDEffects?.depth.enabled
      ) {
        const gradient = ctx.createRadialGradient(
          rect.width / 2,
          rect.height / 2,
          0,
          rect.width / 2,
          rect.height / 2,
          rect.width
        );
        gradient.addColorStop(0, "rgba(139, 92, 246, 0.05)");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }

      particles.forEach((particle) => {
        particle.update(settings.animationSpeed, time);
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
  }, [
    text,
    settings.threeDEffects?.particleText.enabled,
    settings.animationSpeed,
    settings.threeDEffects?.enabled,
    settings.webglEnabled,
    settings.adaptivePerformance,
    settings.maxParticles,
    settings.threeDEffects?.depth.enabled,
    settings.effectQuality,
  ]);

  useEffect(() => {
    if (trigger && settings.threeDEffects?.particleText.enabled) {
      particlesRef.current.forEach((particle) =>
        particle.explode(settings.animationSpeed)
      );
    }
  }, [trigger, settings.threeDEffects?.particleText.enabled, settings.animationSpeed]);

  // Performance monitoring and 3D capability check
  const performanceLevel = detectPerformanceLevel();
  const webglSupported = detectWebGLSupport();
  const shouldRenderHighQuality =
    settings.effectQuality === "high" &&
    performanceLevel !== "low" &&
    settings.threeDEffects?.enabled;
  const should3DEffects =
    settings.threeDEffects?.enabled &&
    (settings.webglEnabled || webglSupported || !settings.adaptivePerformance);

  if (
    !settings.threeDEffects?.particleText.enabled ||
    (!settings.threeDEffects?.enabled && settings.adaptivePerformance)
  )
    return null;

  return (
    <ClientOnly fallback={<div className="w-full h-32 opacity-50" />}>
      <div className="relative w-full h-32">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none w-full h-32"
          style={{ background: "transparent" }}
        />

        {/* 3D depth indicators for high quality mode */}
        {shouldRenderHighQuality && settings.threeDEffects?.particleText.enabled && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                   radial-gradient(ellipse at 30% 40%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
                   radial-gradient(ellipse at 70% 60%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)
                 `,
              filter: "blur(20px)",
            }}
          />
        )}
      </div>
    </ClientOnly>
  );
};

/**
 * ニューモーフィックリップルエフェクト
 * タッチ位置から波紋が広がるエフェクト
 */
export const NeumorphicRipple: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { settings } = useEffectSettings();
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const handleClick = (e: React.MouseEvent) => {
    if (!settings.threeDEffects?.ripple.enabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { x, y, id: Math.random() };
    setRipples((prev) => [...prev, newRipple]);

    const timeoutId = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      timeoutsRef.current.delete(timeoutId);
    }, 1000 / settings.animationSpeed);

    timeoutsRef.current.add(timeoutId);
  };

  // コンポーネントアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      const timeouts = timeoutsRef.current;
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  return (
    <div className="relative overflow-hidden" onClick={handleClick}>
      {children}
      {settings.threeDEffects?.ripple.enabled && (
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              className="absolute pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                x: "-50%",
                y: "-50%",
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1 / settings.animationSpeed,
                ease: "easeOut",
              }}>
              <div
                className="w-20 h-20 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
                  boxShadow: `
                    inset 0 0 20px rgba(139, 92, 246, 0.2),
                    0 0 40px rgba(139, 92, 246, 0.3)
                  `,
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};

/**
 * 背景パーティクルエフェクト
 * 背景に漂う光の粒子
 */
export const BackgroundParticles: React.FC = () => {
  const { settings } = useEffectSettings();
  if (!settings.threeDEffects?.backgroundParticles.enabled) return null;

  const particleIntensity = settings.threeDEffects?.backgroundParticles.intensity || 25;
  const opacity = Math.min(particleIntensity / 100, 0.6); // Cap at 60% opacity

  return (
    <ClientOnly
      fallback={
        <div
          className="absolute inset-0 z-0"
          style={{ opacity: opacity / 2 }}
        />
      }>
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          opacity,
          background: `radial-gradient(circle at 20% 50%, rgba(147, 51, 234, ${
            opacity * 0.3
          }) 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, rgba(59, 130, 246, ${
                         opacity * 0.2
                       }) 0%, transparent 50%),
                       radial-gradient(circle at 40% 80%, rgba(168, 85, 247, ${
                         opacity * 0.25
                       }) 0%, transparent 50%)`,
        }}
      />
    </ClientOnly>
  );
};

/**
 * タイプライターエフェクト
 */
const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const { settings } = useEffectSettings();
  const [displayedText, setDisplayedText] = useState("");
  const [isActive, setIsActive] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!settings.typewriterEffect || !text) return;

    const speed = Math.max(10, 100 - settings.typewriterIntensity);
    setIsActive(true);
    setDisplayedText("");

    const typeText = async () => {
      const characters = text.split("");
      let currentText = "";

      for (let i = 0; i < characters.length; i++) {
        currentText += characters[i];
        setDisplayedText(currentText);
        await new Promise((resolve) => setTimeout(resolve, speed));
      }
      setIsActive(false);
    };

    typeText();
  }, [text, settings.typewriterEffect, settings.typewriterIntensity]);

  if (!settings.typewriterEffect) {
    return <span>{text}</span>;
  }

  return (
    <span ref={elementRef}>
      {displayedText}
      {isActive && (
        <span className="animate-pulse ml-1 text-purple-400">|</span>
      )}
    </span>
  );
};

/**
 * フォントエフェクト
 */
const FontEffects: React.FC<{ text: string }> = ({ text }) => {
  const { settings } = useEffectSettings();

  if (!settings.fontEffects) {
    return <span>{text}</span>;
  }

  const intensity = settings.fontEffectsIntensity;

  const effectStyles = {
    textShadow: `
      0 0 ${intensity * 0.1}px rgb(139, 92, 246),
      0 0 ${intensity * 0.2}px rgb(139, 92, 246),
      0 0 ${intensity * 0.3}px rgb(139, 92, 246)
    `,
    background: `linear-gradient(45deg, 
      hsl(${intensity * 3.6}, 70%, 60%), 
      hsl(${(intensity * 3.6 + 60) % 360}, 70%, 60%), 
      hsl(${(intensity * 3.6 + 120) % 360}, 70%, 60%)
    )`,
    backgroundSize: "200% 200%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    animation: `rainbow ${3 - intensity * 0.02}s ease-in-out infinite`,
  };

  return (
    <>
      <style jsx>{`
        @keyframes rainbow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      <span style={effectStyles}>{text}</span>
    </>
  );
};

/**
 * 統合エフェクトコンポーネント
 * タイプライター、フォントエフェクト、パーティクルなどを統合
 */
export const AdvancedEffects: React.FC<{ text: string }> = ({ text }) => {
  const { settings } = useEffectSettings();

  if (!text) return null;

  const displayText = text;

  return (
    <ClientOnly>
      <div className="relative">
        {/* フォントエフェクト + タイプライター効果の組み合わせ */}
        {settings.fontEffects ? (
          <FontEffects text={displayText} />
        ) : settings.typewriterEffect ? (
          <TypewriterText text={displayText} />
        ) : (
          <span>{displayText}</span>
        )}

        {/* ホログラムエフェクト */}
        {settings.threeDEffects?.hologram.enabled && (
          <div className="absolute inset-0 pointer-events-none">
            <HologramMessage text={text} />
          </div>
        )}

        {/* パーティクルテキストエフェクト */}
        {settings.threeDEffects?.particleText.enabled && (
          <div className="absolute inset-0 pointer-events-none">
            <ParticleText text={text} trigger={true} />
          </div>
        )}
      </div>
    </ClientOnly>
  );
};
