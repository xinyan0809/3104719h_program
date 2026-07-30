export interface PoseTestElements {
  root: HTMLElement;
  startButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  status: HTMLElement;
  movement: HTMLElement;
  error: HTMLElement;
}

export function getPoseTestElements(): PoseTestElements | null {
  const root = document.querySelector<HTMLElement>("#pose-test-root");
  if (!root) {
    return null;
  }

  return {
    root,
    startButton: requireElement<HTMLButtonElement>("#start-camera"),
    stopButton: requireElement<HTMLButtonElement>("#stop-camera"),
    video: requireElement<HTMLVideoElement>("#camera-preview"),
    canvas: requireElement<HTMLCanvasElement>("#pose-overlay"),
    status: requireElement<HTMLElement>("#pose-status"),
    movement: requireElement<HTMLElement>("#movement-state"),
    error: requireElement<HTMLElement>("#camera-error"),
  };
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Pose test element is missing: ${selector}`);
  }
  return element;
}
