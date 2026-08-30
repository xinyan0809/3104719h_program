import type { PoseFrameTiming } from "./pose-loop";

const SAMPLE_SIZE = 300;

interface PerformanceElements {
  panel: HTMLElement;
  status: HTMLElement;
  output: HTMLElement;
  copyButton: HTMLButtonElement;
  copyStatus: HTMLElement;
}

interface TimingSummary {
  mean: number;
  median: number;
  p95: number;
}

export function createPosePerformanceMonitor(): PosePerformanceMonitor | null {
  const parameters = new URLSearchParams(window.location.search);
  if (parameters.get("performance") !== "1") {
    return null;
  }

  const run = parameters.get("run")?.toLowerCase();
  const runLabel = run === "cold" ? "Cold cache" : run === "warm" ? "Warm cache" : "Unlabelled";
  const elements: PerformanceElements = {
    panel: requireElement<HTMLElement>("#pose-performance"),
    status: requireElement<HTMLElement>("#pose-performance-status"),
    output: requireElement<HTMLElement>("#pose-performance-output"),
    copyButton: requireElement<HTMLButtonElement>("#copy-pose-performance"),
    copyStatus: requireElement<HTMLElement>("#pose-performance-copy-status"),
  };
  elements.panel.hidden = false;
  return new PosePerformanceMonitor(elements, runLabel);
}

export class PosePerformanceMonitor {
  private runStartedAt: number | null = null;
  private readinessMilliseconds: number | null = null;
  private samples: PoseFrameTiming[] = [];

  constructor(
    private readonly elements: PerformanceElements,
    private readonly runLabel: string,
  ) {
    this.elements.copyButton.addEventListener("click", () => {
      void this.copyResults();
    });
    this.renderWaiting();
  }

  startRun(startedAt: number): void {
    this.runStartedAt = startedAt;
    this.readinessMilliseconds = null;
    this.samples = [];
    this.elements.copyButton.disabled = true;
    this.elements.copyStatus.textContent = "";
    this.elements.status.textContent = "Waiting for the first usable pose...";
    this.elements.output.textContent = `Run: ${this.runLabel}\nSample target: ${SAMPLE_SIZE} processed frames`;
  }

  markFirstUsablePose(detectedAt: number): void {
    if (this.runStartedAt === null || this.readinessMilliseconds !== null) {
      return;
    }
    this.readinessMilliseconds = detectedAt - this.runStartedAt;
    this.elements.status.textContent = `Collecting frame timings: 0 / ${SAMPLE_SIZE}`;
    this.renderResults();
  }

  recordFrame(timing: PoseFrameTiming): void {
    if (
      this.readinessMilliseconds === null ||
      this.samples.length >= SAMPLE_SIZE
    ) {
      return;
    }

    this.samples.push(timing);
    const count = this.samples.length;
    if (count === 1 || count % 30 === 0 || count === SAMPLE_SIZE) {
      this.elements.status.textContent =
        count === SAMPLE_SIZE
          ? `Complete: ${SAMPLE_SIZE} frames measured`
          : `Collecting frame timings: ${count} / ${SAMPLE_SIZE}`;
      this.renderResults();
    }
    if (count === SAMPLE_SIZE) {
      this.elements.copyButton.disabled = false;
    }
  }

  stopRun(): void {
    if (this.runStartedAt !== null && this.samples.length < SAMPLE_SIZE) {
      this.elements.status.textContent = `Stopped: ${this.samples.length} / ${SAMPLE_SIZE} frames measured`;
    }
    this.runStartedAt = null;
  }

  private renderWaiting(): void {
    this.elements.status.textContent = "Press Start Camera to begin measuring.";
    this.elements.output.textContent = `Run: ${this.runLabel}\nSample target: ${SAMPLE_SIZE} processed frames`;
    this.elements.copyButton.disabled = true;
  }

  private renderResults(): void {
    if (this.readinessMilliseconds === null) {
      return;
    }

    const lines = [
      `Run: ${this.runLabel}`,
      `First usable pose readiness: ${formatMilliseconds(this.readinessMilliseconds)}`,
      `Measured frames: ${this.samples.length} / ${SAMPLE_SIZE}`,
    ];

    if (this.samples.length >= 2) {
      const inference = summarise(
        this.samples.map((sample) => sample.inferenceMilliseconds),
      );
      const movementToRender = summarise(
        this.samples.map((sample) => sample.movementToRenderMilliseconds),
      );
      const elapsed =
        this.samples[this.samples.length - 1].frameStartedAt -
        this.samples[0].frameStartedAt;
      const framesPerSecond =
        elapsed > 0 ? ((this.samples.length - 1) * 1_000) / elapsed : 0;

      lines.push(
        `detectForVideo: mean ${formatMilliseconds(inference.mean)}, median ${formatMilliseconds(inference.median)}, P95 ${formatMilliseconds(inference.p95)}`,
        `Effective processed FPS: ${framesPerSecond.toFixed(2)}`,
        `Movement-to-render estimate: mean ${formatMilliseconds(movementToRender.mean)}, median ${formatMilliseconds(movementToRender.median)}, P95 ${formatMilliseconds(movementToRender.p95)}`,
      );
    }

    this.elements.output.textContent = lines.join("\n");
  }

  private async copyResults(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.elements.output.textContent ?? "");
      this.elements.copyStatus.textContent = "Results copied.";
    } catch {
      this.elements.copyStatus.textContent = "Copy failed. Select the results manually.";
    }
  }
}

function summarise(values: number[]): TimingSummary {
  const sorted = [...values].sort((first, second) => first - second);
  return {
    mean: values.reduce((total, value) => total + value, 0) / values.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
  };
}

function percentile(sorted: number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[Math.max(0, index)];
}

function formatMilliseconds(value: number): string {
  return `${value.toFixed(2)} ms`;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Pose performance element is missing: ${selector}`);
  }
  return element;
}
