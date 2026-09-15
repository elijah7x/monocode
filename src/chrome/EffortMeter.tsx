import { useEffect, useRef, useState } from "react";
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

const MINI = { barWidth: 2, gap: 1.5, height: 10, radius: 0.5 };
// preserveAspectRatio="none" stretches the full meter, so rx is mini-only —
// a corner radius there would distort with the non-uniform scale.
const FULL = { barWidth: 24, gap: 8, height: 22, radius: 1 };

/** The bars only: an SVG sparkline of effort tiers, bottom-aligned. */
export function EffortMeterBars({
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
  const { barWidth, gap, height, radius } = size === "mini" ? MINI : FULL;
  const n = tiers.length;
  if (n === 0) return null;
  const width = n * barWidth + (n - 1) * gap;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      height={height}
      preserveAspectRatio={size === "full" ? "none" : undefined}
      aria-hidden="true"
      className={
        size === "full" ? `block w-full ${className ?? ""}` : className
      }
    >
      {tiers.map((tier, index) => {
        const lit = index <= selectedIndex;
        const peak = index === selectedIndex;
        const topTier =
          peak && (index === n - 1 || TOP_TIER_VALUES.has(tier.value));
        const barHeight =
          tier.kind === "auto"
            ? height * 0.3
            : n > 1
              ? height * (0.35 + (0.65 * index) / (n - 1))
              : height;
        const hollow = tier.kind === "auto" || (tier.kind === "beyond" && !lit);
        return (
          <rect
            key={tier.value}
            className={`effort-meter-bar${peak && size === "full" ? " effort-meter-peak" : ""}`}
            x={index * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={size === "mini" ? radius : 0}
            fill={hollow ? "none" : "currentColor"}
            stroke={hollow ? "currentColor" : undefined}
            strokeWidth={hollow ? 1 : undefined}
            strokeDasharray={
              tier.kind === "beyond" && !lit ? "2 1.5" : undefined
            }
            vectorEffect="non-scaling-stroke"
            opacity={lit ? 0.85 : 0.18}
            data-top-tier={topTier ? "" : undefined}
          />
        );
      })}
    </svg>
  );
}

/**
 * Discrete effort control: a segmented meter that acts as a slider. Bars
 * fill up to the selected tier, the peak bar breathes, and the top tier
 * takes the accent color.
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
        className="mt-2 cursor-ew-resize rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <EffortMeterBars
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
