import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import { normalizedToDisplayedStage } from "../fruit-catch/wrist-baskets";
import {
  GUN_SIZE,
  HAND_VISIBILITY_THRESHOLD,
  SMOOTHING_FACTOR,
} from "./config";

const RIGHT_WRIST = 16;
const RIGHT_PINKY = 18;
const RIGHT_INDEX = 20;

export interface StagePoint {
  x: number;
  y: number;
}

export class RightHandGunController {
  private position: StagePoint | null = null;

  constructor(
    private readonly stage: HTMLElement,
    private readonly gun: HTMLElement,
  ) {
    this.gun.style.width = `${GUN_SIZE}px`;
    this.gun.style.height = `${GUN_SIZE}px`;
  }

  syncStageToVideo(video: HTMLVideoElement): void {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      this.stage.style.setProperty(
        "--target-stage-aspect-ratio",
        `${video.videoWidth} / ${video.videoHeight}`,
      );
    }
  }

  update(landmarks: NormalizedLandmark[] | undefined): boolean {
    const stageWidth = this.stage.clientWidth;
    const stageHeight = this.stage.clientHeight;
    if (!landmarks || stageWidth <= 0 || stageHeight <= 0) {
      this.reset();
      return false;
    }

    const reliableLandmarks = [RIGHT_WRIST, RIGHT_INDEX, RIGHT_PINKY]
      .map((index) => landmarks[index])
      .filter(isReliableHandLandmark);

    if (reliableLandmarks.length === 0) {
      this.reset();
      return false;
    }

    const averagedLandmark = reliableLandmarks.reduce(
      (average, landmark) => ({
        ...average,
        x: average.x + landmark.x / reliableLandmarks.length,
        y: average.y + landmark.y / reliableLandmarks.length,
      }),
      { ...reliableLandmarks[0], x: 0, y: 0 },
    );
    const displayed = normalizedToDisplayedStage(
      averagedLandmark,
      stageWidth,
      stageHeight,
    );
    const halfGun = GUN_SIZE / 2;
    const target = {
      x: clamp(displayed.x, halfGun, stageWidth - halfGun),
      y: clamp(displayed.y, halfGun, stageHeight - halfGun),
    };

    // Tracking that returns starts at the new hand location, not stale history.
    this.position = this.position
      ? smoothPoint(this.position, target)
      : target;
    this.gun.style.left = `${this.position.x}px`;
    this.gun.style.top = `${this.position.y}px`;
    this.gun.hidden = false;
    return true;
  }

  getHitPoint(): StagePoint | null {
    return this.position ? { ...this.position } : null;
  }

  reset(): void {
    this.position = null;
    this.gun.hidden = true;
  }
}

function isReliableHandLandmark(
  landmark: NormalizedLandmark | undefined,
): landmark is NormalizedLandmark {
  return Boolean(
    landmark &&
      Number.isFinite(landmark.x) &&
      Number.isFinite(landmark.y) &&
      (landmark.visibility ?? 0) >= HAND_VISIBILITY_THRESHOLD,
  );
}

function smoothPoint(previous: StagePoint, target: StagePoint): StagePoint {
  return {
    x: previous.x + SMOOTHING_FACTOR * (target.x - previous.x),
    y: previous.y + SMOOTHING_FACTOR * (target.y - previous.y),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
