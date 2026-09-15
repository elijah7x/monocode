import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RotateCcw } from "./icons";

export type EffortTier = {
  value: string;
  label: string;
  kind: "auto" | "level" | "beyond";
};

// Option order varies by harness (Grok lists xhigh first), so the meter
// ranks by name rather than trusting catalog order. Unknown values keep
// their catalog order after the named ones.
const EFFORT_RANK: Record<string, number> = {
  auto: 0,
  off: 1,
  none: 1,
  minimal: 2,
  low: 3,
  medium: 4,
  high: 5,
  xhigh: 6,
  max: 7,
  ultracode: 8,
  ultrathink: 9,
};

const BEYOND_VALUES = new Set(["ultracode", "ultrathink"]);

export function orderEffortOptions(
  options: { value: string; label: string }[],
): EffortTier[] {
  return options
    .map((option, index) => ({ option, index }))
    .sort(
      (a, b) =>
        (EFFORT_RANK[a.option.value] ?? Number.MAX_SAFE_INTEGER) -
          (EFFORT_RANK[b.option.value] ?? Number.MAX_SAFE_INTEGER) ||
        a.index - b.index,
    )
    .map(({ option }) => ({
      value: option.value,
      label: option.label,
      kind:
        option.value === "auto"
          ? "auto"
          : BEYOND_VALUES.has(option.value)
            ? "beyond"
            : "level",
    }));
}

type SpeckSite = {
  left: string;
  top: string;
  size: number;
  baseOpacity: number;
  peakOpacity?: number;
  echoOpacity?: number;
  duration?: number;
  delay?: number;
  twinkle?: "echo" | "no-echo";
  drift?: 1 | 2;
  driftDuration?: number;
  glow?: boolean;
};

// Deterministic 26-site particle layout:
// 5 in first third, 8 in middle third, 13 in final third.
// 15 × 1px, 8 × 1.5px, 3 × 2px.
// 16 steady sites (opacity 0.16 → 0.34), 10 twinkling (peak 0.42 → 0.78, echo 45%).
// 4 small particles drift alternating over 4300, 5100, 5900, 6700ms.
const FULL_SPECKS: SpeckSite[] = [
  // First third (5 sites)
  { left: "7%", top: "35%", size: 1, baseOpacity: 0.17 },
  {
    left: "14%",
    top: "68%",
    size: 1,
    baseOpacity: 0.18,
    peakOpacity: 0.47,
    echoOpacity: 0.21,
    twinkle: "echo",
    duration: 2710,
    delay: -950,
  },
  {
    left: "19%",
    top: "28%",
    size: 1.5,
    baseOpacity: 0.19,
    drift: 1,
    driftDuration: 4300,
  },
  { left: "23%", top: "72%", size: 1, baseOpacity: 0.2 },
  {
    left: "29%",
    top: "42%",
    size: 1,
    baseOpacity: 0.21,
    peakOpacity: 0.52,
    echoOpacity: 0.23,
    twinkle: "no-echo",
    duration: 3670,
    delay: -1420,
  },

  // Middle third (8 sites)
  { left: "37%", top: "24%", size: 1.5, baseOpacity: 0.23 },
  {
    left: "41%",
    top: "76%",
    size: 1,
    baseOpacity: 0.23,
    peakOpacity: 0.57,
    echoOpacity: 0.26,
    twinkle: "echo",
    duration: 2300,
    delay: -820,
  },
  {
    left: "45%",
    top: "38%",
    size: 1,
    baseOpacity: 0.24,
    drift: 2,
    driftDuration: 5100,
  },
  { left: "48%", top: "65%", size: 1.5, baseOpacity: 0.25 },
  {
    left: "53%",
    top: "26%",
    size: 1,
    baseOpacity: 0.26,
    peakOpacity: 0.61,
    echoOpacity: 0.27,
    twinkle: "no-echo",
    duration: 4190,
    delay: -1980,
  },
  { left: "57%", top: "78%", size: 1.5, baseOpacity: 0.26 },
  {
    left: "61%",
    top: "34%",
    size: 1,
    baseOpacity: 0.27,
    peakOpacity: 0.64,
    echoOpacity: 0.29,
    twinkle: "echo",
    duration: 3130,
    delay: -1120,
  },
  { left: "64%", top: "62%", size: 1, baseOpacity: 0.28 },

  // Final third (13 sites)
  {
    left: "69%",
    top: "22%",
    size: 1.5,
    baseOpacity: 0.28,
    drift: 1,
    driftDuration: 5900,
  },
  {
    left: "71%",
    top: "74%",
    size: 1,
    baseOpacity: 0.29,
    peakOpacity: 0.68,
    echoOpacity: 0.31,
    twinkle: "no-echo",
    duration: 2710,
    delay: -1640,
  },
  { left: "74%", top: "44%", size: 2, baseOpacity: 0.29, glow: true },
  { left: "77%", top: "26%", size: 1, baseOpacity: 0.3 },
  {
    left: "80%",
    top: "68%",
    size: 1.5,
    baseOpacity: 0.3,
    peakOpacity: 0.71,
    echoOpacity: 0.32,
    twinkle: "echo",
    duration: 3670,
    delay: -890,
  },
  {
    left: "82%",
    top: "32%",
    size: 1,
    baseOpacity: 0.31,
    drift: 2,
    driftDuration: 6700,
  },
  {
    left: "85%",
    top: "76%",
    size: 2,
    baseOpacity: 0.31,
    peakOpacity: 0.73,
    echoOpacity: 0.33,
    twinkle: "no-echo",
    duration: 2300,
    delay: -1350,
    glow: true,
  },
  { left: "87%", top: "24%", size: 1, baseOpacity: 0.32 },
  { left: "89%", top: "56%", size: 1.5, baseOpacity: 0.32 },
  {
    left: "91%",
    top: "36%",
    size: 1,
    baseOpacity: 0.32,
    peakOpacity: 0.75,
    echoOpacity: 0.34,
    twinkle: "echo",
    duration: 4190,
    delay: -2410,
  },
  { left: "93%", top: "72%", size: 2, baseOpacity: 0.33, glow: true },
  {
    left: "94%",
    top: "28%",
    size: 1.5,
    baseOpacity: 0.33,
    peakOpacity: 0.76,
    echoOpacity: 0.34,
    twinkle: "no-echo",
    duration: 3130,
    delay: -1790,
  },
  { left: "95%", top: "52%", size: 1, baseOpacity: 0.33 },
];

function renderSpeck(site: SpeckSite, key: number) {
  const outerStyle: CSSProperties = {
    left: site.left,
    top: site.top,
    width: `${site.size}px`,
    height: `${site.size}px`,
    ...(site.driftDuration
      ? ({ "--drift-duration": `${site.driftDuration}ms` } as CSSProperties)
      : {}),
  };

  const innerStyle = {
    "--speck-base": site.baseOpacity,
    ...(site.peakOpacity != null ? { "--speck-peak": site.peakOpacity } : {}),
    ...(site.echoOpacity != null ? { "--speck-echo": site.echoOpacity } : {}),
    ...(site.duration != null
      ? { "--speck-duration": `${site.duration}ms` }
      : {}),
    ...(site.delay != null ? { "--speck-delay": `${site.delay}ms` } : {}),
  } as CSSProperties;

  return (
    <i
      key={key}
      className="effort-speck"
      data-glow={site.glow ? "" : undefined}
      data-twinkle={site.twinkle}
      data-drift={site.drift}
      style={outerStyle}
    >
      <i className="effort-speck-inner" style={innerStyle} />
    </i>
  );
}

/**
 * The rail only: a continuous track that fills to the selected tier, with a
 * tick mark per tier, stationary speck field, separate thumb, and top-tier accent halo.
 */
export function EffortMeterSpark({
  tiers,
  selectedIndex,
  size,
  className,
  dragFrac,
}: {
  tiers: EffortTier[];
  selectedIndex: number;
  size: "mini" | "full";
  className?: string;
  dragFrac?: number | null;
}) {
  const n = tiers.length;
  if (n === 0) return null;
  const tierFrac = n > 1 ? selectedIndex / (n - 1) : 0;
  const frac = dragFrac != null ? dragFrac : tierFrac;
  const topTier = selectedIndex === n - 1;

  if (size === "mini") {
    return (
      <div
        aria-hidden="true"
        data-effort-rail="mini"
        className={`effort-rail effort-rail-mini${className ? ` ${className}` : ""}`}
        style={{ "--effort-frac": `${frac * 100}%` } as CSSProperties}
      >
        <div
          className="effort-rail-fill"
          data-top-tier={topTier ? "" : undefined}
          style={{ width: `${frac * 100}%` }}
        />
        <div className="effort-specks">
          <i
            className="effort-speck"
            style={{ left: "45%", top: "50%", opacity: 0.28 }}
          />
          <i
            className="effort-speck"
            style={{ left: "70%", top: "35%", opacity: 0.38 }}
          />
          <i
            className="effort-speck"
            style={{ left: "88%", top: "60%", opacity: 0.48 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full${className ? ` ${className}` : ""}`}>
      <div
        className="effort-top-halo"
        data-active={topTier ? "" : undefined}
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        data-effort-rail="full"
        className="effort-rail"
        style={
          {
            "--effort-frac": `calc(12px + ${frac} * (100% - 24px))`,
          } as CSSProperties
        }
      >
        <div
          className="effort-rail-fill"
          style={{ width: "calc(var(--effort-frac) - 1px)" }}
        >
          <div
            className="effort-top-tint"
            data-top-tier={topTier ? "" : undefined}
          />
        </div>
        <div className="effort-specks">
          {FULL_SPECKS.map((site, i) => renderSpeck(site, i))}
        </div>
        {tiers.map((tier, index) => (
          <i
            key={tier.value}
            className="effort-rail-tick"
            data-passed={index < selectedIndex ? "" : undefined}
            data-auto={tier.kind === "auto" ? "" : undefined}
            style={{
              left: `calc(12px + ${n > 1 ? index / (n - 1) : 0.5} * (100% - 24px))`,
            }}
          />
        ))}
        <div className="effort-thumb">
          <div className="effort-thumb-inner" />
        </div>
      </div>
    </div>
  );
}

/**
 * Discrete effort control: a glowing rail that acts as a slider. The thumb
 * tracks continuous drag and snaps between tier ticks, stationary specks
 * twinkle inside the fill, and the top tier takes the accent halo and tint.
 */
export function EffortMeter({
  tiers,
  value,
  defaultValue,
  modelName,
  onChange,
  onClose,
}: {
  tiers: EffortTier[];
  value: string;
  defaultValue: string;
  modelName: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragFrac, setDragFrac] = useState<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const releaseTimer = useRef<number | null>(null);

  const selectedIndex = Math.max(
    0,
    tiers.findIndex((tier) => tier.value === value),
  );

  const nearestDragIndex =
    dragFrac != null ? Math.round(dragFrac * (tiers.length - 1)) : null;
  const shownIndex = nearestDragIndex ?? selectedIndex;
  const shownTier = tiers[shownIndex];
  const isDefault = value === defaultValue;
  const defaultLabel =
    tiers.find((tier) => tier.value === defaultValue)?.label ?? defaultValue;

  useEffect(() => {
    sliderRef.current?.focus();
    return () => {
      if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
    };
  }, []);

  const fracAt = (clientX: number) => {
    const el = sliderRef.current;
    if (!el) return 0;
    const rail = el.querySelector<HTMLElement>(".effort-rail") ?? el;
    const rect = rail.getBoundingClientRect();
    const travel = rect.width - 24;
    if (travel <= 0) return 0;
    const x = clientX - rect.left;
    return Math.min(1, Math.max(0, (x - 12) / travel));
  };

  const commit = (index: number) => {
    const clamped = Math.min(tiers.length - 1, Math.max(0, index));
    const tier = tiers[clamped];
    if (tier && clamped !== selectedIndex) onChange(tier.value);
  };

  // React attaches wheel listeners passively, so the step-on-scroll handler
  // has to be native for preventDefault to stick.
  const stepRef = useRef((_delta: number) => {});
  stepRef.current = (delta) => commit(selectedIndex + delta);
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY !== 0) stepRef.current(event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  if (!shownTier) return null;

  return (
    <div className="px-3.5 pt-3 pb-3">
      <div className="flex h-6 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium leading-[18px] text-content/92">
          {shownTier.label}
        </span>
        <button
          type="button"
          aria-label="Reset to default"
          title={`Reset to ${defaultLabel}`}
          onClick={() => onChange(defaultValue)}
          tabIndex={isDefault ? -1 : 0}
          style={{ visibility: isDefault ? "hidden" : "visible" }}
          className="grid size-6 shrink-0 place-items-center rounded-[7px] text-content/48 transition-colors duration-100 hover:bg-content/6 hover:text-content/82"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="mt-0.5 truncate text-[11px] font-normal leading-4 text-content/54">
        {modelName}
      </div>
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={0}
        aria-label="Effort"
        aria-valuemin={0}
        aria-valuemax={tiers.length - 1}
        aria-valuenow={shownIndex}
        aria-valuetext={shownTier.label}
        aria-orientation="horizontal"
        onKeyDown={(event) => {
          const last = tiers.length - 1;
          let next: number | null = null;
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            next = selectedIndex + 1;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            next = selectedIndex - 1;
          } else if (event.key === "Home") {
            next = 0;
          } else if (event.key === "End") {
            next = last;
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClose();
            return;
          }
          if (next == null) return;
          event.preventDefault();
          commit(next);
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          sliderRef.current?.setPointerCapture(event.pointerId);
          sliderRef.current?.focus();
          dragging.current = true;
          setIsPressed(true);
          setIsReleasing(false);
          if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
          setDragFrac(fracAt(event.clientX));
        }}
        onPointerMove={(event) => {
          if (dragging.current) {
            setDragFrac(fracAt(event.clientX));
          }
        }}
        onPointerUp={(event) => {
          if (!dragging.current) return;
          dragging.current = false;
          setIsPressed(false);
          setIsReleasing(true);
          const frac = fracAt(event.clientX);
          const nearestIndex = Math.round(frac * (tiers.length - 1));
          setDragFrac(null);
          commit(nearestIndex);
          if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
          releaseTimer.current = window.setTimeout(() => {
            setIsReleasing(false);
          }, 220);
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setIsPressed(false);
          setIsReleasing(false);
          setDragFrac(null);
        }}
        data-dragging={dragFrac != null ? "" : undefined}
        data-pressed={isPressed ? "" : undefined}
        data-releasing={isReleasing ? "" : undefined}
        className="effort-slider relative mt-px flex h-10 w-full cursor-ew-resize items-center outline-none select-none"
        style={{ touchAction: "none" }}
      >
        <EffortMeterSpark
          tiers={tiers}
          selectedIndex={shownIndex}
          size="full"
          dragFrac={dragFrac}
        />
      </div>
      <div className="-mt-px flex items-center justify-between font-sans text-[10px] font-normal leading-[14px] text-content/48">
        <span>{tiers[0]?.label}</span>
        <span>{tiers[tiers.length - 1]?.label}</span>
      </div>
    </div>
  );
}
