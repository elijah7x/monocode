// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EffortMeter,
  orderEffortOptions,
  type EffortTier,
} from "./EffortMeter";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const GROK_OPTIONS = [
  { value: "xhigh", label: "Extra High" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const TIERS = orderEffortOptions(GROK_OPTIONS);

function renderMeter(props: {
  value: string;
  onChange?: (value: string) => void;
  onClose?: () => void;
  tiers?: EffortTier[];
  defaultValue?: string;
}) {
  act(() =>
    root.render(
      createElement(EffortMeter, {
        tiers: props.tiers ?? TIERS,
        value: props.value,
        defaultValue: props.defaultValue ?? "high",
        modelName: "Grok 4.6",
        onChange: props.onChange ?? vi.fn(),
        onClose: props.onClose ?? vi.fn(),
      }),
    ),
  );
  return container.querySelector<HTMLElement>('[role="slider"]')!;
}

function keyDown(target: EventTarget, key: string) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

describe("orderEffortOptions", () => {
  it("sorts catalog order into ascending effort", () => {
    expect(TIERS.map((tier) => tier.value)).toEqual([
      "low",
      "medium",
      "high",
      "xhigh",
    ]);
  });

  it("puts auto first and unknown values last", () => {
    const tiers = orderEffortOptions([
      { value: "high", label: "High" },
      { value: "turbo", label: "Turbo" },
      { value: "auto", label: "Auto" },
      { value: "low", label: "Low" },
    ]);
    expect(tiers.map((tier) => tier.value)).toEqual([
      "auto",
      "low",
      "high",
      "turbo",
    ]);
    expect(tiers[0].kind).toBe("auto");
  });
});

describe("EffortMeter", () => {
  it("commits on End and steps with the wheel", () => {
    const onChange = vi.fn();
    const slider = renderMeter({ value: "low", onChange });
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("3");
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    expect(slider.getAttribute("aria-valuetext")).toBe("Low");

    keyDown(slider, "End");
    expect(onChange).toHaveBeenLastCalledWith("xhigh");

    // The committed value comes back through props; without a re-render the
    // slider still sits on "low", so a wheel-up steps to "medium".
    act(() => {
      slider.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -40,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(onChange).toHaveBeenLastCalledWith("medium");
  });

  it("only offers reset away from the default", () => {
    const onChange = vi.fn();
    renderMeter({ value: "high", onChange });
    expect(
      container.querySelector('button[aria-label="Reset to default"]'),
    ).toBeNull();

    renderMeter({ value: "xhigh", onChange });
    const reset = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Reset to default"]',
    )!;
    expect(reset).not.toBeNull();
    act(() => reset.click());
    expect(onChange).toHaveBeenCalledWith("high");
  });

  it("marks the fill as top tier only at the last tier", () => {
    renderMeter({ value: "xhigh" });
    expect(
      container.querySelector(".effort-rail-fill[data-top-tier]"),
    ).not.toBeNull();

    renderMeter({ value: "medium" });
    expect(
      container.querySelector(".effort-rail-fill[data-top-tier]"),
    ).toBeNull();
  });

  it("sizes the fill to the selected tier's fraction of the rail", () => {
    renderMeter({ value: "medium" });
    const fill = container.querySelector<HTMLElement>(".effort-rail-fill")!;
    // "medium" is index 1 of 4 tiers → one third of the rail.
    expect(fill.style.width).toContain("%");
    expect(Number.parseFloat(fill.style.width)).toBeCloseTo(33.3, 1);
  });

  it("closes on Enter", () => {
    const onClose = vi.fn();
    const slider = renderMeter({ value: "high", onClose });
    keyDown(slider, "Enter");
    expect(onClose).toHaveBeenCalled();
  });
});
