import type { MovementState } from "../pose-test/movement";
import {
  COUNTDOWN_DURATION,
  GAME_DURATION,
  MAX_ACTIVE_OBSTACLES,
  OBSTACLE_EMOJIS,
  OBSTACLE_FALL_SPEED,
  OBSTACLE_SIZE,
  OBSTACLE_SPAWN_INTERVAL,
  PLAYER_BOTTOM_OFFSET,
  PLAYER_SIZE,
} from "./config";
import {
  type CollisionBox,
  LanePlayerController,
  laneCentreX,
} from "./lane-player";

export type BodyDodgeGameState =
  | "IDLE"
  | "COUNTDOWN"
  | "PLAYING"
  | "FINISHED";

interface ObstacleEntity {
  element: HTMLElement;
  laneIndex: number;
  y: number;
  resolved: boolean;
}

interface BodyDodgeElements {
  stage: HTMLElement;
  obstacleLayer: HTMLElement;
  score: HTMLElement;
  time: HTMLElement;
  countdown: HTMLElement;
  status: HTMLElement;
  movement: HTMLElement;
  finishedPanel: HTMLElement;
  finalScore: HTMLElement;
}

export class BodyDodgeGame {
  private animationFrameId: number | null = null;
  private obstacles: ObstacleEntity[] = [];
  private score = 0;
  private stateStartedAt = 0;
  private playingStartedAt = 0;
  private lastFrameAt = 0;
  private spawnAccumulator = 0;
  private currentState: BodyDodgeGameState = "IDLE";

  constructor(
    private readonly elements: BodyDodgeElements,
    private readonly player: LanePlayerController,
    private readonly isReady: () => boolean,
    private readonly onStateChange: (state: BodyDodgeGameState) => void,
  ) {
    this.resetDisplay();
    this.setMovementDisplay(null);
  }

  get state(): BodyDodgeGameState {
    return this.currentState;
  }

  updateMovement(movement: MovementState | null): void {
    this.player.update(movement);
    this.setMovementDisplay(movement);
  }

  start(): boolean {
    if (!this.isReady() || this.isActive()) {
      return false;
    }

    this.stopLoop();
    this.clearObstacles();
    this.score = 0;
    this.spawnAccumulator = 0;
    this.elements.score.textContent = "0";
    this.elements.time.textContent = String(Math.ceil(GAME_DURATION / 1_000));
    this.elements.finalScore.textContent = "0";
    this.elements.finishedPanel.hidden = true;
    this.elements.countdown.hidden = false;
    this.elements.countdown.textContent = String(
      Math.ceil(COUNTDOWN_DURATION / 1_000),
    );
    this.stateStartedAt = performance.now();
    this.setState("COUNTDOWN", "Get ready");
    this.requestFrame();
    return true;
  }

  cancel(): void {
    this.stopLoop();
    this.clearObstacles();
    this.score = 0;
    this.spawnAccumulator = 0;
    this.stateStartedAt = 0;
    this.playingStartedAt = 0;
    this.lastFrameAt = 0;
    this.elements.countdown.hidden = true;
    this.elements.finishedPanel.hidden = true;
    this.resetDisplay();
    this.setState("IDLE", "Idle");
  }

  private readonly frame = (timestamp: number): void => {
    this.animationFrameId = null;

    if (this.currentState === "COUNTDOWN") {
      this.updateCountdown(timestamp);
    } else if (this.currentState === "PLAYING") {
      this.updatePlaying(timestamp);
    }

    if (this.isActive()) {
      this.requestFrame();
    }
  };

  private updateCountdown(timestamp: number): void {
    const elapsed = timestamp - this.stateStartedAt;
    if (elapsed >= COUNTDOWN_DURATION) {
      this.elements.countdown.hidden = true;
      this.playingStartedAt = timestamp;
      this.lastFrameAt = timestamp;
      this.spawnAccumulator = OBSTACLE_SPAWN_INTERVAL;
      this.setState("PLAYING", "Playing");
      return;
    }

    this.elements.countdown.textContent = String(
      Math.max(1, Math.ceil((COUNTDOWN_DURATION - elapsed) / 1_000)),
    );
  }

  private updatePlaying(timestamp: number): void {
    const elapsed = timestamp - this.playingStartedAt;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    this.elements.time.textContent = String(Math.ceil(remaining / 1_000));

    if (remaining <= 0) {
      this.finish();
      return;
    }

    const deltaMilliseconds = Math.max(
      0,
      Math.min(timestamp - this.lastFrameAt, 250),
    );
    this.lastFrameAt = timestamp;
    this.spawnAccumulator += deltaMilliseconds;

    if (
      this.spawnAccumulator >= OBSTACLE_SPAWN_INTERVAL &&
      this.obstacles.length < MAX_ACTIVE_OBSTACLES
    ) {
      this.spawnObstacle();
      this.spawnAccumulator = 0;
    }

    this.moveAndResolveObstacles(deltaMilliseconds / 1_000);
  }

  private spawnObstacle(): void {
    const stageWidth = this.elements.stage.clientWidth;
    if (stageWidth <= 0) {
      return;
    }

    const laneIndex = Math.floor(Math.random() * 3);
    const element = document.createElement("span");
    element.className = "body-dodge__obstacle";
    element.textContent =
      OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)];
    element.style.width = `${OBSTACLE_SIZE}px`;
    element.style.height = `${OBSTACLE_SIZE}px`;
    element.style.fontSize = `${OBSTACLE_SIZE * 0.78}px`;
    element.style.left = `${laneCentreX(laneIndex, stageWidth)}px`;

    const obstacle: ObstacleEntity = {
      element,
      laneIndex,
      y: -OBSTACLE_SIZE / 2,
      resolved: false,
    };
    this.elements.obstacleLayer.append(element);
    this.renderObstacle(obstacle);
    this.obstacles.push(obstacle);
  }

  private moveAndResolveObstacles(deltaSeconds: number): void {
    const stageWidth = this.elements.stage.clientWidth;
    const stageHeight = this.elements.stage.clientHeight;
    const playerBox = this.player.getCollisionBox();
    const playerTop =
      stageHeight - PLAYER_BOTTOM_OFFSET - PLAYER_SIZE;

    for (let index = this.obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = this.obstacles[index];
      obstacle.y += OBSTACLE_FALL_SPEED * deltaSeconds;
      const obstacleBox = getObstacleBox(obstacle, stageWidth);

      if (
        !obstacle.resolved &&
        obstacleBox.bottom >= playerTop
      ) {
        obstacle.resolved = true;
        const collision =
          this.player.isTrackingAvailable && overlaps(obstacleBox, playerBox);

        if (this.player.isTrackingAvailable && !collision) {
          this.score += 1;
          this.elements.score.textContent = String(this.score);
        }

        this.removeObstacle(index);
        continue;
      }

      if (obstacle.y - OBSTACLE_SIZE / 2 > stageHeight) {
        this.removeObstacle(index);
        continue;
      }

      this.renderObstacle(obstacle);
    }
  }

  private renderObstacle(obstacle: ObstacleEntity): void {
    obstacle.element.style.transform =
      `translate(-50%, -50%) translateY(${obstacle.y}px)`;
  }

  private removeObstacle(index: number): void {
    const [obstacle] = this.obstacles.splice(index, 1);
    obstacle?.element.remove();
  }

  private finish(): void {
    this.stopLoop();
    this.clearObstacles();
    this.elements.countdown.hidden = true;
    this.elements.time.textContent = "0";
    this.elements.finalScore.textContent = String(this.score);
    this.elements.finishedPanel.hidden = false;
    this.setState("FINISHED", "Finished");
  }

  private clearObstacles(): void {
    this.obstacles = [];
    this.elements.obstacleLayer.replaceChildren();
  }

  private requestFrame(): void {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.frame);
    }
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private isActive(): boolean {
    return this.currentState === "COUNTDOWN" || this.currentState === "PLAYING";
  }

  private resetDisplay(): void {
    this.elements.score.textContent = "0";
    this.elements.time.textContent = String(Math.ceil(GAME_DURATION / 1_000));
    this.elements.finalScore.textContent = "0";
  }

  private setMovementDisplay(movement: MovementState | null): void {
    this.elements.movement.textContent = movement ?? "—";
    this.elements.movement.dataset.movement =
      movement?.toLowerCase() ?? "unknown";
  }

  private setState(state: BodyDodgeGameState, message: string): void {
    this.currentState = state;
    this.elements.status.textContent = message;
    this.elements.status.dataset.state = state.toLowerCase();
    this.onStateChange(state);
  }
}

function getObstacleBox(
  obstacle: ObstacleEntity,
  stageWidth: number,
): CollisionBox {
  const centreX = laneCentreX(obstacle.laneIndex, stageWidth);
  return {
    left: centreX - OBSTACLE_SIZE / 2,
    top: obstacle.y - OBSTACLE_SIZE / 2,
    right: centreX + OBSTACLE_SIZE / 2,
    bottom: obstacle.y + OBSTACLE_SIZE / 2,
  };
}

function overlaps(first: CollisionBox, second: CollisionBox): boolean {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}
