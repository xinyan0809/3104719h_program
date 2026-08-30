import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import {
  clamp,
  normalizedToDisplayedStage,
  smoothPoint,
  type StagePoint,
  syncStageAspectRatio,
} from "../game-shell/coordinates";
import {
  GUN_SIZE,
  HAND_VISIBILITY_THRESHOLD,
  SMOOTHING_FACTOR,
} from "./config";

const RIGHT_WRIST = 16;
const RIGHT_PINKY = 18;
const RIGHT_INDEX = 20;

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
    syncStageAspectRatio(this.stage, video);
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
      ? smoothPoint(this.position, target, SMOOTHING_FACTOR)
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
