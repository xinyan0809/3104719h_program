
import {
  COUNTDOWN_DURATION,
  FRUIT_EMOJIS,
  FRUIT_FALL_SPEED,
  FRUIT_SIZE,
  FRUIT_SPAWN_INTERVAL,
  GAME_DURATION,
  MAX_ACTIVE_FRUITS,
} from "./config";
import type {
  BasketCollisionBox,
  WristBasketController,
} from "./wrist-baskets";

// Four state
export type GameState = "IDLE" | "COUNTDOWN" | "PLAYING" | "FINISHED";

interface FruitEntity {
  element: HTMLElement;
  x: number;
  y: number;
  caught: boolean;
}

// Collect page elements updated by game logic
interface GameElements {
  stage: HTMLElement;
  fruitLayer: HTMLElement;
  score: HTMLElement;
  time: HTMLElement;
  countdown: HTMLElement;
  status: HTMLElement;
  finishedPanel: HTMLElement;
  finalScore: HTMLElement;
}


// Drive one round of the Fruit Catch game
export class EasyFruitCatchGame {
  private animationFrameId: number | null = null;
  private fruits: FruitEntity[] = [];
  private score = 0;
  private stateStartedAt = 0;
  private playingStartedAt = 0;
  private lastFrameAt = 0;
  private spawnAccumulator = 0;
  private currentState: GameState = "IDLE";

  constructor(
    private readonly elements: GameElements,
    private readonly baskets: WristBasketController,
    private readonly isReady: () => boolean,
    private readonly onStateChange: (state: GameState) => void,
  ) {
    this.resetDisplay();
  }

  get state(): GameState {
    return this.currentState;
  }

  start(): boolean {
    if (!this.isReady() || this.isActive()) {
      return false;
    }

    this.stopLoop();
    this.clearFruits();
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
    this.clearFruits();
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
      this.spawnAccumulator = FRUIT_SPAWN_INTERVAL;
      this.setState("PLAYING", "Playing");
      return;
    }

    const remaining = Math.max(
      1,
      Math.ceil((COUNTDOWN_DURATION - elapsed) / 1_000),
    );
    this.elements.countdown.textContent = String(remaining);
  }

  // Update time, spawn fruit, and advance active fruit
  private updatePlaying(timestamp: number): void {
    const elapsed = timestamp - this.playingStartedAt;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    this.elements.time.textContent = String(Math.ceil(remaining / 1_000));

    if (remaining <= 0) {
      this.finish();
      return;
    }

    const deltaMilliseconds = Math.min(timestamp - this.lastFrameAt, 250);
    const deltaSeconds = Math.max(0, deltaMilliseconds) / 1_000;
    this.lastFrameAt = timestamp;
    this.spawnAccumulator += deltaMilliseconds;

    // Spawn fruit when the interval is met and capacity is available
    if (
      this.spawnAccumulator >= FRUIT_SPAWN_INTERVAL &&
      this.fruits.length < MAX_ACTIVE_FRUITS
    ) {
      this.spawnFruit();
      this.spawnAccumulator = 0;
    }

    this.moveAndResolveFruit(deltaSeconds);
  }

  private spawnFruit(): void {
    const stageWidth = this.elements.stage.clientWidth;
    if (stageWidth <= 0) {
      return;
    }

    const element = document.createElement("span");
    element.className = "falling-fruit";
    element.textContent =
      FRUIT_EMOJIS[Math.floor(Math.random() * FRUIT_EMOJIS.length)];
    element.style.width = `${FRUIT_SIZE}px`;
    element.style.height = `${FRUIT_SIZE}px`;
    element.style.fontSize = `${FRUIT_SIZE * 0.82}px`;

    const fruit: FruitEntity = {
      element,
      x: Math.random() * Math.max(0, stageWidth - FRUIT_SIZE),
      y: -FRUIT_SIZE,
      caught: false,
    };
    this.elements.fruitLayer.append(element);
    this.renderFruit(fruit);
    this.fruits.push(fruit);
  }

  // Move fruit and resolve caught or missed outcomes
  private moveAndResolveFruit(deltaSeconds: number): void {
    const stageWidth = this.elements.stage.clientWidth;
    const stageHeight = this.elements.stage.clientHeight;
    const baskets = this.baskets.getCollisionBoxes();

    for (let index = this.fruits.length - 1; index >= 0; index -= 1) {
      const fruit = this.fruits[index];
      fruit.x = clamp(fruit.x, 0, Math.max(0, stageWidth - FRUIT_SIZE));
      fruit.y += FRUIT_FALL_SPEED * deltaSeconds;

      if (!fruit.caught && baskets.some((basket) => overlaps(fruit, basket))) {
        fruit.caught = true;
        this.removeFruit(index);
        this.score += 1;
        this.elements.score.textContent = String(this.score);
        continue;
      }

      if (fruit.y >= stageHeight) {
        this.removeFruit(index);
        continue;
      }

      this.renderFruit(fruit);
    }
  }

  private renderFruit(fruit: FruitEntity): void {
    fruit.element.style.transform = `translate3d(${fruit.x}px, ${fruit.y}px, 0)`;
  }

  private removeFruit(index: number): void {
    const [fruit] = this.fruits.splice(index, 1);
    fruit?.element.remove();
  }

  private finish(): void {
    this.stopLoop();
    this.clearFruits();
    this.elements.countdown.hidden = true;
    this.elements.time.textContent = "0";
    this.elements.finalScore.textContent = String(this.score);
    this.elements.finishedPanel.hidden = false;
    this.setState("FINISHED", "Finished");
  }

  private clearFruits(): void {
    this.fruits = [];
    this.elements.fruitLayer.replaceChildren();
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

  private setState(state: GameState, message: string): void {
    this.currentState = state;
    this.elements.status.textContent = message;
    this.elements.status.dataset.state = state.toLowerCase();
    this.onStateChange(state);
  }
}

// Test whether a fruit rectangle overlaps a basket rectangle
function overlaps(fruit: FruitEntity, basket: BasketCollisionBox): boolean {
  return (
    fruit.x < basket.right &&
    fruit.x + FRUIT_SIZE > basket.left &&
    fruit.y < basket.bottom &&
    fruit.y + FRUIT_SIZE > basket.top
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
