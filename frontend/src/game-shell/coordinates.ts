import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface StagePoint {
  x: number;
  y: number;
}

export function syncStageAspectRatio(
  stage: HTMLElement,
  video: HTMLVideoElement,
): void {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    stage.style.setProperty(
      "--game-stage-aspect-ratio",
      `${video.videoWidth} / ${video.videoHeight}`,
    );
  }
}

// MediaPipe keeps anatomical landmark identities; only X is mirrored for display.
export function normalizedToDisplayedStage(
  landmark: NormalizedLandmark,
  stageWidth: number,
  stageHeight: number,
): StagePoint {
  return {
    x: (1 - clamp(landmark.x, 0, 1)) * stageWidth,
    y: clamp(landmark.y, 0, 1) * stageHeight,
  };
}

export function smoothPoint(
  previous: StagePoint,
  target: StagePoint,
  factor: number,
): StagePoint {
  return {
    x: previous.x + factor * (target.x - previous.x),
    y: previous.y + factor * (target.y - previous.y),
  };
}

export function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(Math.max(value, minimum), maximum);
}
