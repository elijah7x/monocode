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
const TOP_TIER_VALUES = new Set(["max", "ultracode", "ultrathink"]);

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

const SPECK_COUNT: Record<"mini" | "full", number> = { mini: 6, full: 18 };

// Deterministic speck layout — stable across renders so the twinkle field
// does not jump when the selection moves.
function speckStyle(index: number): CSSProperties {
  return {
    left: `${(index * 37 + 11) % 90}%`,
    top: `${((index * 53 + 7) % 60) + 20}%`,
    animationDuration: `${1.2 + (index % 5) * 0.3}s`,
    animationDelay: `${-index * 0.17}s`,
  };
}

/**
 * The rail only: a continuous track that fills to the selected tier, with a
 * tick mark per tier and twinkling specks inside the fill.
 */
export function EffortMeterSpark({
  tiers,
  selectedIndex,
  size,
  className,
}: {
  tiers: EffortTier[];
  selectedIndex: number;
  size: "mini" | "full";
  className?: string;
}) {
  const n = tiers.length;
  if (n === 0) return null;
  const frac = n > 1 ? selectedIndex / (n - 1) : 1;
  // A floor keeps a sliver visible at the lowest tier.
  const widthPct = Math.max(frac * 100, 10);
  const topTier =
    selectedIndex === n - 1 ||
    TOP_TIER_VALUES.has(tiers[selectedIndex]?.value ?? "");
  return (
    <div
      aria-hidden="true"
      data-effort-rail={size}
      className={`effort-rail${size === "mini" ? " effort-rail-mini" : ""}${className ? ` ${className}` : ""}`}
    >
      <div
        className="effort-rail-fill"
        data-top-tier={topTier ? "" : undefined}
        style={{ width: `${widthPct}%`, opacity: 0.6 + 0.4 * frac }}
      >
        {/* Specks sit on a layer stretched to track width inside the clipped
            fill, so the fill edge reveals more of them as it moves right. */}
        <div
          className="effort-specks"
          style={{
            width: `${10000 / widthPct}%`,
            opacity: 0.45 + 0.55 * frac,
          }}
        >
          {Array.from({ length: SPECK_COUNT[size] }, (_, index) => (
            <i key={index} className="effort-speck" style={speckStyle(index)} />
          ))}
        </div>
      </div>
      {tiers.map((tier, index) => (
        <i
          key={tier.value}
          className="effort-rail-tick"
          data-auto={tier.kind === "auto" ? "" : undefined}
          style={{ left: `${n > 1 ? (index / (n - 1)) * 100 : 50}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Discrete effort control: a glowing rail that acts as a slider. The fill
 * edge snaps between tier ticks, specks twinkle harder toward the top, and
 * the top tier takes the accent color.
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
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const selectedIndex = Math.max(
    0,
    tiers.findIndex((tier) => tier.value === value),
  );
  const shownIndex = dragIndex ?? selectedIndex;
  const shownTier = tiers[shownIndex];
  const defaultLabel =
    tiers.find((tier) => tier.value === defaultValue)?.label ?? defaultValue;

  useEffect(() => {
    track.current?.focus();
  }, []);

  const indexAt = (clientX: number) => {
    const el = track.current;
    const rect = el?.getBoundingClientRect();
    const ratio =
      el && rect && rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    return Math.min(
      tiers.length - 1,
      Math.max(0, Math.floor(ratio * tiers.length)),
    );
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
    const el = track.current;
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
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium leading-4 text-content">
          {shownTier.label}
        </span>
        {value !== defaultValue ? (
          <button
            type="button"
            aria-label="Reset to default"
            title={`Reset to ${defaultLabel}`}
            onClick={() => onChange(defaultValue)}
            className="grid size-5 shrink-0 place-items-center rounded text-content/50 hover:text-content"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      <div className="truncate text-[11px] leading-4 text-content/55">
        {modelName}
      </div>
      <div
        ref={track}
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
          track.current?.setPointerCapture(event.pointerId);
          track.current?.focus();
          dragging.current = true;
          setDragIndex(indexAt(event.clientX));
        }}
        onPointerMove={(event) => {
          if (dragging.current) setDragIndex(indexAt(event.clientX));
        }}
        onPointerUp={(event) => {
          if (!dragging.current) return;
          dragging.current = false;
          const index = indexAt(event.clientX);
          setDragIndex(null);
          commit(index);
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setDragIndex(null);
        }}
        data-dragging={dragIndex != null ? "" : undefined}
        className="mt-2 cursor-ew-resize rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <EffortMeterSpark
          tiers={tiers}
          selectedIndex={shownIndex}
          size="full"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] leading-4 text-content/45">
        <span>{tiers[0]?.label}</span>
        <span>{tiers[tiers.length - 1]?.label}</span>
      </div>
    </div>
  );
}
