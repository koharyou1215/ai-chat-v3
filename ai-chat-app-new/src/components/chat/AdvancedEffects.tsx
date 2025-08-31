'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffectSettings } from '@/contexts/EffectSettingsContext';
import { ClientOnly } from '@/components/utils/ClientOnly';

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

  constructor(x: number, y: number, color: string, canvasWidth: number, canvasHeight: number) {
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

/**
 * 3Dホログラムメッセージ
 * WebGLを使用した立体的なメッセージ表示
 */
export const HologramMessage: React.FC<{ text: string }> = ({ text: _text }) => {
  const { settings } = useEffectSettings();
  
  // 3D機能は無効化されているため、軽量版を表示
  if (!settings.hologramMessages) return null;

  return (
    <ClientOnly fallback={<div className="w-full h-48 bg-slate-800/20 rounded-lg animate-pulse" />}>
      <div className="w-full h-48 relative">
        <div className="w-full h-full bg-slate-800/20 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-2">Hologram Effect</div>
            <div className="text-sm text-gray-400">3D機能は現在無効化されています</div>
          </div>
        </div>
        
        {/* ホログラム効果のオーバーレイ */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="w-full h-full opacity-20"
            style={{
              background: 'linear-gradient(45deg, transparent 40%, #00ff88 50%, transparent 60%)',
              animation: `hologram-scan ${3 / settings.animationSpeed}s infinite linear`
            }}
          />
        </div>
        
        <style jsx>{`
          @keyframes hologram-scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}</style>
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
  trigger 
}) => {
  const { settings } = useEffectSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !settings.particleEffects) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // High DPI support
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // テキストを描画して粒子化
    ctx.font = '32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 4, canvas.height / 4);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const particles: Particle[] = [];

    // ピクセルデータから粒子を生成
    for (let y = 0; y < imageData.height; y += 6) {
      for (let x = 0; x < imageData.width; x += 6) {
        const index = (y * imageData.width + x) * 4;
        const alpha = imageData.data[index + 3];
        
        if (alpha > 128) {
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const color = `rgba(${r}, ${g}, ${b}, 1)`;
          particles.push(new Particle(x / 2, y / 2, color, canvas.width, canvas.height));
        }
      }
    }

    particlesRef.current = particles;

    // アニメーションループ
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
      
      particles.forEach(particle => {
        particle.update(settings.animationSpeed);
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
  }, [text, settings.particleEffects, settings.animationSpeed]);

  useEffect(() => {
    if (trigger && settings.particleEffects) {
      particlesRef.current.forEach(particle => particle.explode(settings.animationSpeed));
    }
  }, [trigger, settings.particleEffects, settings.animationSpeed]);

  if (!settings.particleEffects) return null;

  return (
    <ClientOnly>
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none w-full h-32"
        style={{ background: 'transparent' }}
      />
    </ClientOnly>
  );
};

/**
 * ニューモーフィックリップルエフェクト
 * タッチ位置から波紋が広がるエフェクト
 */
export const NeumorphicRipple: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { settings } = useEffectSettings();
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const handleClick = (e: React.MouseEvent) => {
    if (!settings.rippleEffects) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Math.random() };
    setRipples(prev => [...prev, newRipple]);
    
    const timeoutId = setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      timeoutsRef.current.delete(timeoutId);
    }, 1000 / settings.animationSpeed);
    
    timeoutsRef.current.add(timeoutId);
  };

  // コンポーネントアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  return (
    <div className="relative overflow-hidden" onClick={handleClick}>
      {children}
      {settings.rippleEffects && (
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.div
              key={ripple.id}
              className="absolute pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                x: '-50%',
                y: '-50%',
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 / settings.animationSpeed, ease: 'easeOut' }}
            >
              <div 
                className="w-20 h-20 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
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
  if (!settings.backgroundParticles) return null;

  return (
    <ClientOnly fallback={<div className="absolute inset-0 z-0 opacity-50" />}>
      <div className="absolute inset-0 z-0 opacity-50">
        <div className="absolute inset-0 z-0 opacity-50 bg-transparent" />
      </div>
    </ClientOnly>
  );
};