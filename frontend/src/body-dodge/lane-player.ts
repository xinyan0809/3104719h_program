import type { MovementState } from "../pose-test/movement";
import { syncStageAspectRatio } from "../game-shell/coordinates";
import {
  LANE_COUNT,
  PLAYER_BOTTOM_OFFSET,
  PLAYER_SIZE,
} from "./config";

const LANE_INDEX: Record<MovementState, number> = {
  LEFT: 0,
  CENTRE: 1,
  RIGHT: 2,
};

export interface CollisionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class LanePlayerController {
  private lane: MovementState = "CENTRE";
  private trackingAvailable = false;

  constructor(
    private readonly stage: HTMLElement,
    private readonly element: HTMLElement,
  ) {
    this.element.style.width = `${PLAYER_SIZE}px`;
    this.element.style.height = `${PLAYER_SIZE}px`;
    this.renderLane();
    this.renderTrackingState();
  }

  syncStageToVideo(video: HTMLVideoElement): void {
    syncStageAspectRatio(this.stage, video);
  }

  update(movement: MovementState | null): void {
    if (movement) {
      this.lane = movement;
      this.trackingAvailable = true;
      this.renderLane();
    } else {
      // Keep the last lane visible, but disable collision decisions while lost.
      this.trackingAvailable = false;
    }
    this.renderTrackingState();
  }

  reset(): void {
    this.lane = "CENTRE";
    this.trackingAvailable = false;
    this.renderLane();
    this.renderTrackingState();
  }

  get isTrackingAvailable(): boolean {
    return this.trackingAvailable;
  }

  getCollisionBox(): CollisionBox {
    const stageWidth = this.stage.clientWidth;
    const stageHeight = this.stage.clientHeight;
    const centreX = laneCentreX(LANE_INDEX[this.lane], stageWidth);
    const centreY =
      stageHeight - PLAYER_BOTTOM_OFFSET - PLAYER_SIZE / 2;

    return {
      left: centreX - PLAYER_SIZE / 2,
      top: centreY - PLAYER_SIZE / 2,
      right: centreX + PLAYER_SIZE / 2,
      bottom: centreY + PLAYER_SIZE / 2,
    };
  }

  private renderLane(): void {
    const laneIndex = LANE_INDEX[this.lane];
    this.element.style.left = `${((laneIndex + 0.5) / LANE_COUNT) * 100}%`;
    this.element.dataset.lane = this.lane.toLowerCase();
  }

  private renderTrackingState(): void {
    this.element.dataset.tracking = String(this.trackingAvailable);
  }
}

export function laneCentreX(laneIndex: number, stageWidth: number): number {
  return ((laneIndex + 0.5) / LANE_COUNT) * stageWidth;
}
