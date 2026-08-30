import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import {
  clamp,
  normalizedToDisplayedStage,
  smoothPoint,
  type StagePoint,
  syncStageAspectRatio,
} from "../game-shell/coordinates";
import {
  BASKET_HEIGHT,
  BASKET_OFFSET_Y,
  BASKET_SIZE,
  SMOOTHING_FACTOR,
  WRIST_VISIBILITY_THRESHOLD,
} from "./config";

const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

export interface BasketCollisionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface BasketState {
  element: HTMLElement;
  position: StagePoint | null;
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
    syncStageAspectRatio(this.stage, video);
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
      .filter(
        (state): state is BasketState & { position: StagePoint } =>
          state.position !== null,
      )
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
    state.position = state.position
      ? smoothPoint(state.position, target, SMOOTHING_FACTOR)
      : target;
    state.element.style.left = `${state.position.x}px`;
    state.element.style.top = `${state.position.y}px`;
    state.element.hidden = false;
  }

  private deactivate(state: BasketState): void {
    state.position = null;
    state.element.hidden = true;
  }
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
