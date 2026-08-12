import {
  COUNTDOWN_DURATION,
  DWELL_TIME,
  FRAGMENT_FALL_DURATION,
  GAME_DURATION,
  GOLD_TARGET_PROBABILITY,
  GOLD_TARGET_SCORE,
  MAX_ACTIVE_TARGETS,
  MIN_TARGET_GUN_DISTANCE,
  NORMAL_TARGET_SCORE,
  TARGET_EDGE_PADDING,
  TARGET_LIFETIME,
  TARGET_SHAKE_DURATION,
  TARGET_SIZE,
  TARGET_SPAWN_INTERVAL,
} from "./config";
import type { RightHandGunController, StagePoint } from "./hand-gun";

export type TargetShotGameState =
  | "IDLE"
  | "COUNTDOWN"
  | "PLAYING"
  | "FINISHED";

type TargetType = "normal" | "gold";
type TargetLifecycle = "ACTIVE" | "AIMING" | "HIT_ANIMATING";

interface TargetEntity {
  id: number;
  element: HTMLElement;
  x: number;
  y: number;
  createdAt: number;
  hitAt: number | null;
  broken: boolean;
  type: TargetType;
  state: TargetLifecycle;
}

interface TargetShotElements {
  stage: HTMLElement;
  targetLayer: HTMLElement;
  score: HTMLElement;
  time: HTMLElement;
  countdown: HTMLElement;
  status: HTMLElement;
  finishedPanel: HTMLElement;
  finalScore: HTMLElement;
}

export class TargetShotGame {
  private animationFrameId: number | null = null;
  private targets: TargetEntity[] = [];
  private score = 0;
  private stateStartedAt = 0;
  private playingStartedAt = 0;
  private lastFrameAt = 0;
  private spawnAccumulator = 0;
  private dwellTargetId: number | null = null;
  private dwellElapsed = 0;
  private nextTargetId = 1;
  private currentState: TargetShotGameState = "IDLE";

  constructor(
    private readonly elements: TargetShotElements,
    private readonly gun: RightHandGunController,
    private readonly isReady: () => boolean,
    private readonly onStateChange: (state: TargetShotGameState) => void,
  ) {
    this.resetDisplay();
  }

  get state(): TargetShotGameState {
    return this.currentState;
  }

  start(): boolean {
    if (!this.isReady() || this.isActive()) {
      return false;
    }

    this.stopLoop();
    this.clearTargets();
    this.score = 0;
    this.spawnAccumulator = 0;
    this.nextTargetId = 1;
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
    this.clearTargets();
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

  handleTrackingLoss(): void {
    this.cancelDwell();
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
      this.spawnAccumulator = TARGET_SPAWN_INTERVAL;
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

    // Time is checked before any dwell scoring, so the final score locks at zero.
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

    this.updateTargetLifecycles(timestamp);

    if (
      this.spawnAccumulator >= TARGET_SPAWN_INTERVAL &&
      this.targets.length < MAX_ACTIVE_TARGETS
    ) {
      this.spawnTarget(timestamp);
      this.spawnAccumulator = 0;
    }

    this.updateDwell(timestamp, deltaMilliseconds);
  }

  private spawnTarget(timestamp: number): void {
    const stageWidth = this.elements.stage.clientWidth;
    const stageHeight = this.elements.stage.clientHeight;
    const halfTarget = TARGET_SIZE / 2;
    const minimumX = TARGET_EDGE_PADDING + halfTarget;
    const maximumX = stageWidth - TARGET_EDGE_PADDING - halfTarget;
    const minimumY = TARGET_EDGE_PADDING + halfTarget;
    const maximumY = stageHeight - TARGET_EDGE_PADDING - halfTarget;

    if (maximumX <= minimumX || maximumY <= minimumY) {
      return;
    }

    const gunPoint = this.gun.getHitPoint();
    let position: StagePoint | null = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = {
        x: randomBetween(minimumX, maximumX),
        y: randomBetween(minimumY, maximumY),
      };
      if (
        !gunPoint ||
        distanceSquared(candidate, gunPoint) >=
          MIN_TARGET_GUN_DISTANCE * MIN_TARGET_GUN_DISTANCE
      ) {
        position = candidate;
        break;
      }
    }

    if (!position) {
      return;
    }

    const type: TargetType =
      Math.random() < GOLD_TARGET_PROBABILITY ? "gold" : "normal";
    const element = document.createElement("div");
    element.className = "target-shot__target";
    element.dataset.kind = type;
    element.dataset.state = "active";
    element.style.width = `${TARGET_SIZE}px`;
    element.style.height = `${TARGET_SIZE}px`;
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.setProperty("--dwell-progress", "0deg");
    element.setAttribute("aria-hidden", "true");

    const face = document.createElement("span");
    face.className = "target-shot__target-face";
    element.append(face);
    this.elements.targetLayer.append(element);
    this.targets.push({
      id: this.nextTargetId,
      element,
      x: position.x,
      y: position.y,
      createdAt: timestamp,
      hitAt: null,
      broken: false,
      type,
      state: "ACTIVE",
    });
    this.nextTargetId += 1;
  }

  private updateTargetLifecycles(timestamp: number): void {
    for (let index = this.targets.length - 1; index >= 0; index -= 1) {
      const target = this.targets[index];
      if (target.state === "HIT_ANIMATING" && target.hitAt !== null) {
        const hitElapsed = timestamp - target.hitAt;
        if (!target.broken && hitElapsed >= TARGET_SHAKE_DURATION) {
          this.breakTarget(target);
        }
        if (
          hitElapsed >= TARGET_SHAKE_DURATION + FRAGMENT_FALL_DURATION
        ) {
          this.removeTarget(index);
        }
        continue;
      }

      if (timestamp - target.createdAt >= TARGET_LIFETIME) {
        this.removeTarget(index);
      }
    }
  }

  private updateDwell(timestamp: number, deltaMilliseconds: number): void {
    const gunPoint = this.gun.getHitPoint();
    if (!gunPoint) {
      this.cancelDwell();
      return;
    }

    const target = this.findClosestTarget(gunPoint);
    if (!target) {
      this.cancelDwell();
      return;
    }

    if (this.dwellTargetId !== target.id) {
      this.cancelDwell();
      this.dwellTargetId = target.id;
      this.dwellElapsed = 0;
      target.state = "AIMING";
      target.element.dataset.state = "aiming";
    }

    this.dwellElapsed += deltaMilliseconds;
    const progress = Math.min(1, this.dwellElapsed / DWELL_TIME);
    target.element.style.setProperty(
      "--dwell-progress",
      `${progress * 360}deg`,
    );

    if (this.dwellElapsed >= DWELL_TIME) {
      this.hitTarget(target, timestamp);
    }
  }

  private findClosestTarget(gunPoint: StagePoint): TargetEntity | null {
    const hitRadiusSquared = (TARGET_SIZE / 2) ** 2;
    let closest: TargetEntity | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      if (target.state === "HIT_ANIMATING") {
        continue;
      }
      const candidateDistance = distanceSquared(target, gunPoint);
      if (
        candidateDistance <= hitRadiusSquared &&
        candidateDistance < closestDistance
      ) {
        closest = target;
        closestDistance = candidateDistance;
      }
    }
    return closest;
  }

  private hitTarget(target: TargetEntity, timestamp: number): void {
    if (target.state === "HIT_ANIMATING") {
      return;
    }

    target.state = "HIT_ANIMATING";
    target.hitAt = timestamp;
    target.element.dataset.state = "hit";
    target.element.classList.add("is-hit");
    target.element.style.setProperty("--dwell-progress", "0deg");
    this.dwellTargetId = null;
    this.dwellElapsed = 0;

    this.score +=
      target.type === "gold" ? GOLD_TARGET_SCORE : NORMAL_TARGET_SCORE;
    this.elements.score.textContent = String(this.score);
  }

  private breakTarget(target: TargetEntity): void {
    target.broken = true;
    target.element.classList.add("is-broken");
    for (let index = 1; index <= 4; index += 1) {
      const fragment = document.createElement("span");
      fragment.className = `target-shot__fragment target-shot__fragment--${index}`;
      target.element.append(fragment);
    }
  }

  private cancelDwell(): void {
    if (this.dwellTargetId !== null) {
      const target = this.targets.find(
        (candidate) => candidate.id === this.dwellTargetId,
      );
      if (target?.state === "AIMING") {
        target.state = "ACTIVE";
        target.element.dataset.state = "active";
        target.element.style.setProperty("--dwell-progress", "0deg");
      }
    }
    this.dwellTargetId = null;
    this.dwellElapsed = 0;
  }

  private removeTarget(index: number): void {
    const target = this.targets[index];
    if (target?.id === this.dwellTargetId) {
      this.dwellTargetId = null;
      this.dwellElapsed = 0;
    }
    this.targets.splice(index, 1);
    target?.element.remove();
  }

  private finish(): void {
    this.stopLoop();
    this.clearTargets();
    this.elements.countdown.hidden = true;
    this.elements.time.textContent = "0";
    this.elements.finalScore.textContent = String(this.score);
    this.elements.finishedPanel.hidden = false;
    this.setState("FINISHED", "Finished");
  }

  private clearTargets(): void {
    this.cancelDwell();
    this.targets = [];
    this.elements.targetLayer.replaceChildren();
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

  private setState(state: TargetShotGameState, message: string): void {
    this.currentState = state;
    this.elements.status.textContent = message;
    this.elements.status.dataset.state = state.toLowerCase();
    this.onStateChange(state);
  }
}

function distanceSquared(first: StagePoint, second: StagePoint): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}
