'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export interface BackgroundLayerProps {
  enabled: boolean;
  opacity: number; // 0-100
  blur: number; // 0-40 px
  overlay: number; // 0-100, how dark the scrim over the image is
}

/**
 * A dedicated, configurable background layer.
 *
 * Drop-in replacement: swap /public/background.jpg (and background.webp,
 * background-tiny.jpg for the blurred placeholder) for a different image
 * and every setting below keeps working unchanged. The image is rendered
 * with object-fit: cover and a fixed position so it never distorts or
 * scrolls awkwardly on any screen size, from small phones to ultrawide
 * desktop monitors — and a scrim + blur are always available so the chat
 * on top stays readable no matter how bright the source image is.
 */
export function BackgroundLayer({ enabled, opacity, blur, overlay }: BackgroundLayerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          opacity: mounted ? opacity / 100 : 0,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          transform: blur > 0 ? 'scale(1.05)' : undefined, // avoid blurred edges showing base color
        }}
      >
        <Image
          src="/background.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[78%_58%] sm:object-[70%_50%] lg:object-center"
          placeholder="blur"
          blurDataURL="/background-tiny.jpg"
        />
      </div>
      {/* Scrim: keeps text/contrast readable regardless of image brightness */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgb(var(--maar-base) / ${0.35 + overlay / 200}) 0%, rgb(var(--maar-base) / ${overlay / 100}) 55%, rgb(var(--maar-base) / ${Math.min(1, overlay / 100 + 0.25)}) 100%)`,
        }}
      />
      {/* Subtle vignette so edges recede and content stays central */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 15%, transparent 40%, rgb(var(--maar-base) / 0.55) 100%)',
        }}
      />
    </div>
  );
}
