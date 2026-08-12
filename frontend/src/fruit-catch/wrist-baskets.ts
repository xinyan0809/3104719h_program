import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import {
  BASKET_HEIGHT,
  BASKET_OFFSET_Y,
  BASKET_SIZE,
  SMOOTHING_FACTOR,
  WRIST_VISIBILITY_THRESHOLD,
} from "./config";

const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

interface Point {
  x: number;
  y: number;
}

export interface BasketCollisionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface BasketState {
  element: HTMLElement;
  position: Point | null;
}

export class WristBasketController {
  private readonly left: BasketState;
  private readonly right: BasketState;

  constructor(
    private readonly stage: HTMLElement,
    leftElement: HTMLElement,
    rightElement: HTMLElement,
  ) {
    this.left = this.createState(leftElement);
    this.right = this.createState(rightElement);
  }

  syncStageToVideo(video: HTMLVideoElement): void {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      this.stage.style.setProperty(
        "--fruit-stage-aspect-ratio",
        `${video.videoWidth} / ${video.videoHeight}`,
      );
    }
  }

  update(landmarks: NormalizedLandmark[] | undefined): void {
    const stageWidth = this.stage.clientWidth;
    const stageHeight = this.stage.clientHeight;

    if (stageWidth <= 0 || stageHeight <= 0) {
      this.reset();
      return;
    }

    this.updateBasket(this.left, landmarks?.[LEFT_WRIST], stageWidth, stageHeight);
    this.updateBasket(
      this.right,
      landmarks?.[RIGHT_WRIST],
      stageWidth,
      stageHeight,
    );
  }

  reset(): void {
    this.deactivate(this.left);
    this.deactivate(this.right);
  }

  getCollisionBoxes(): BasketCollisionBox[] {
    return [this.left, this.right]
      .filter((state): state is BasketState & { position: Point } => state.position !== null)
      .map(({ position }) => ({
        left: position.x - BASKET_SIZE / 2,
        top: position.y - BASKET_HEIGHT / 2,
        right: position.x + BASKET_SIZE / 2,
        bottom: position.y + BASKET_HEIGHT / 2,
      }));
  }

  private createState(element: HTMLElement): BasketState {
    element.style.width = `${BASKET_SIZE}px`;
    element.style.height = `${BASKET_HEIGHT}px`;
    return { element, position: null };
  }

  private updateBasket(
    state: BasketState,
    wrist: NormalizedLandmark | undefined,
    stageWidth: number,
    stageHeight: number,
  ): void {
    if (!isReliableWrist(wrist)) {
      this.deactivate(state);
      return;
    }

    const displayed = normalizedToDisplayedStage(wrist, stageWidth, stageHeight);
    const target = {
      x: clamp(displayed.x, BASKET_SIZE / 2, stageWidth - BASKET_SIZE / 2),
      y: clamp(
        displayed.y + BASKET_OFFSET_Y,
        BASKET_HEIGHT / 2,
        stageHeight - BASKET_HEIGHT / 2,
      ),
    };

    // A returning wrist starts at its current location instead of stale coordinates.
    state.position = state.position ? smoothPoint(state.position, target) : target;
    state.element.style.left = `${state.position.x}px`;
    state.element.style.top = `${state.position.y}px`;
    state.element.hidden = false;
  }

  private deactivate(state: BasketState): void {
    state.position = null;
    state.element.hidden = true;
  }
}

// The anatomical wrist identity is unchanged; only camera X is mirrored for display.
export function normalizedToDisplayedStage(
  landmark: NormalizedLandmark,
  stageWidth: number,
  stageHeight: number,
): Point {
  return {
    x: (1 - clamp(landmark.x, 0, 1)) * stageWidth,
    y: clamp(landmark.y, 0, 1) * stageHeight,
  };
}

function isReliableWrist(
  wrist: NormalizedLandmark | undefined,
): wrist is NormalizedLandmark {
  return Boolean(
    wrist &&
      Number.isFinite(wrist.x) &&
      Number.isFinite(wrist.y) &&
      (wrist.visibility ?? 0) >= WRIST_VISIBILITY_THRESHOLD,
  );
}

function smoothPoint(previous: Point, target: Point): Point {
  return {
    x: previous.x + SMOOTHING_FACTOR * (target.x - previous.x),
    y: previous.y + SMOOTHING_FACTOR * (target.y - previous.y),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
