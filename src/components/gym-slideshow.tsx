"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GymSlide } from "@/lib/gym-slides";

type Props = {
  slides: GymSlide[];
  /** `hero` = tall portrait frame for the hero column; `wide` = cinematic
   *  16/9 frame with a thumbnail strip, for the gallery section. */
  variant?: "hero" | "wide";
  /** Autoplay interval in ms. */
  intervalMs?: number;
  ariaLabel?: string;
};

/**
 * Accessible auto-playing gym-photo slideshow.
 *
 * - Crossfade + slow Ken Burns zoom on the active photo
 * - Autoplays, but pauses on hover / focus / touch, has a play-pause
 *   button, and never autoplays for `prefers-reduced-motion` users
 * - Prev/next arrows, clickable progress segments, thumbnail strip
 *   (wide variant), swipe on touch devices and ←/→ keyboard support
 * - Captions come from the slide data, so photos sell the coaching
 */
export function GymSlideshow({
  slides,
  variant = "wide",
  intervalMs = 5600,
  ariaLabel = "Kings Body Empire gym photos",
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchX = useRef<number | null>(null);

  const count = slides.length;
  const go = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(t);
  }, [paused, reducedMotion, count, intervalMs]);

  if (count === 0) return null;
  const slide = slides[index];

  return (
    <div
      className={`slideshow slideshow-${variant}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 42) (dx < 0 ? next : prev)();
        touchX.current = null;
        setPaused(false);
      }}
    >
      <div className="slideshow-frame">
        {slides.map((s, i) => (
          <div
            key={s.src}
            className={`slideshow-slide${i === index ? " is-active" : ""}`}
            aria-hidden={i !== index}
          >
            <Image
              src={s.src}
              alt={i === index ? s.alt : ""}
              fill
              sizes={
                variant === "hero"
                  ? "(min-width: 900px) 44vw, 92vw"
                  : "(min-width: 1180px) 1180px, 94vw"
              }
              style={{ objectPosition: s.position }}
              priority={variant === "hero" && i === 0}
              loading={variant === "hero" && i === 0 ? undefined : "lazy"}
            />
          </div>
        ))}

        <div className="slideshow-shade" aria-hidden="true" />

        {/* progress segments */}
        <div className="slideshow-segments" aria-hidden="true">
          {slides.map((s, i) => (
            <span
              key={s.src}
              className={`slideshow-seg${i === index ? " is-active" : ""}${i < index ? " is-done" : ""}`}
            >
              <i
                style={
                  i === index && !paused && !reducedMotion
                    ? { animationDuration: `${intervalMs}ms` }
                    : undefined
                }
              />
            </span>
          ))}
        </div>

        <div className="slideshow-topbar">
          <span className="slideshow-tag">{slide.tag}</span>
          <span className="slideshow-count">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </div>

        <div className="slideshow-caption" key={index} aria-live="polite">
          <h3>{slide.title}</h3>
          <p>{slide.caption}</p>
        </div>

        <div className="slideshow-controls">
          <button type="button" onClick={prev} aria-label="Previous photo">
            &#8249;
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
          >
            {paused ? "\u25B6" : "\u275A\u275A"}
          </button>
          <button type="button" onClick={next} aria-label="Next photo">
            &#8250;
          </button>
        </div>
      </div>

      {variant === "wide" && (
        <div className="slideshow-thumbs" role="tablist" aria-label="Choose photo">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}: ${s.title}`}
              className={`slideshow-thumb${i === index ? " is-active" : ""}`}
              onClick={() => go(i)}
            >
              <Image
                src={s.src}
                alt=""
                fill
                sizes="120px"
                style={{ objectPosition: s.position }}
                loading="lazy"
              />
              <span>{s.tag}</span>
            </button>
          ))}
        </div>
      )}

      {variant === "hero" && (
        <div className="slideshow-dots" aria-hidden="true">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              tabIndex={-1}
              aria-label={`Go to photo ${i + 1}: ${s.title}`}
              className={i === index ? "is-active" : ""}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
