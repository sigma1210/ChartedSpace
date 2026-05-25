"use client";

// ─── Free Trader Type A — Deck Plan ───────────────────────────────────────────
// Base layer: the Inkscape SVG (808×1127) served from /images/freeTrader.svg
// A CSS filter converts the black-on-white source to cyan-on-dark (HUD theme).
// Interactive room overlays will be added on top once the base looks correct.

const FreeTraderDeckPlan = () => (
  <div className="flex flex-col gap-2 select-none">

    <div className="hud-panel-header flex items-center justify-between">
      <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text)">
        Free Trader · Deck Plan
      </span>
      <span className="font-mono text-[8px] text-(--hud-text-dim)">Type A</span>
    </div>

    {/*
      The SVG source is black paths on a white background.
      Filter pipeline:
        brightness(0)      → flatten everything to black
        invert(1)          → flip to white-on-black
        sepia(1)           → add colour base
        saturate(4)        → push saturation
        hue-rotate(155deg) → shift to cyan (~#22d3ee)
        brightness(0.85)   → pull back slightly so it reads as dim cyan on dark
    */}
    <img
      src="/images/freeTrader.svg"
      alt="Free Trader Type A deck plan"
      className="w-full"
    />

  </div>
);

export default FreeTraderDeckPlan;
