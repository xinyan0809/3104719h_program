import type { PoseLandmarker } from "@mediapipe/tasks-vision";

import { CameraController } from "../pose-test/camera";
import { HorizontalMovementTracker } from "../pose-test/movement";
import {
  closePoseLandmarker,
  loadPoseLandmarker,
} from "../pose-test/pose-landmarker";
import { PoseDetectionLoop } from "../pose-test/pose-loop";
import { BodyDodgeGame, type BodyDodgeGameState } from "./game";
import { LanePlayerController } from "./lane-player";

interface BodyDodgeElements {
  root: HTMLElement;
  stage: HTMLElement;
  startCameraButton: HTMLButtonElement;
  stopCameraButton: HTMLButtonElement;
  startGameButton: HTMLButtonElement;
  restartGameButton: HTMLButtonElement;
  video: HTMLVideoElement;
  poseStatus: HTMLElement;
  gameStatus: HTMLElement;
  movement: HTMLElement;
  error: HTMLElement;
  player: HTMLElement;
  obstacleLayer: HTMLElement;
  score: HTMLElement;
  time: HTMLElement;
  countdown: HTMLElement;
  finishedPanel: HTMLElement;
  finalScore: HTMLElement;
}

export function mountBodyDodge(): void {
  const elements = getElements();
  if (!elements) {
    return;
  }

  const camera = new CameraController();
  const movementTracker = new HorizontalMovementTracker();
  const player = new LanePlayerController(elements.stage, elements.player);
  let landmarker: PoseLandmarker | null = null;
  let detectionLoop: PoseDetectionLoop | null = null;
  let isStarting = false;
  let modelReady = false;
  let operationVersion = 0;
  let game: BodyDodgeGame;

  const isGameReady = (): boolean => modelReady && camera.isRunning;

  const setPoseStatus = (message: string, state: string): void => {
    elements.poseStatus.textContent = message;
    elements.poseStatus.dataset.status = state;
  };

  const clearError = (): void => {
    elements.error.textContent = "";
    elements.error.hidden = true;
  };

  const showError = (error: unknown): void => {
    elements.error.textContent =
      error instanceof Error
        ? error.message
        : "An unexpected camera error occurred.";
    elements.error.hidden = false;
  };

  const updateControls = (_state?: BodyDodgeGameState): void => {
    const state = game?.state ?? "IDLE";
    const ready = isGameReady();
    elements.startCameraButton.disabled = isStarting || camera.isRunning;
    elements.stopCameraButton.disabled = !camera.isRunning;
    elements.startGameButton.disabled = !ready || state !== "IDLE";
    elements.restartGameButton.disabled = !ready || state !== "FINISHED";
    elements.root.dataset.modelReady = String(ready);
  };

  game = new BodyDodgeGame(
    {
      stage: elements.stage,
      obstacleLayer: elements.obstacleLayer,
      score: elements.score,
      time: elements.time,
      countdown: elements.countdown,
      status: elements.gameStatus,
      movement: elements.movement,
      finishedPanel: elements.finishedPanel,
      finalScore: elements.finalScore,
    },
    player,
    isGameReady,
    updateControls,
  );

  const releaseCameraAndPose = (): void => {
    detectionLoop?.stop();
    detectionLoop = null;
    camera.stop(elements.video);
    movementTracker.reset();
    player.reset();
    game.updateMovement(null);
    modelReady = false;
    game.cancel();
  };

  const stopCamera = (): void => {
    operationVersion += 1;
    isStarting = false;
    releaseCameraAndPose();
    clearError();
    setPoseStatus("Camera not started", "idle");
    updateControls();
  };

  const beginGame = (): void => {
    clearError();
    if (!isGameReady()) {
      showError(
        new Error("Start the camera and wait for the pose model before playing."),
      );
      updateControls();
      return;
    }
    game.start();
    updateControls();
  };

  elements.startCameraButton.addEventListener("click", async () => {
    if (isStarting || camera.isRunning) {
      return;
    }

    const currentOperation = ++operationVersion;
    isStarting = true;
    clearError();
    setPoseStatus("Loading pose model", "loading");
    updateControls();

    try {
      await camera.start(elements.video);
      if (currentOperation !== operationVersion || !camera.isRunning) {
        return;
      }
      player.syncStageToVideo(elements.video);
      updateControls();

      const loadedLandmarker = await loadPoseLandmarker();
      if (currentOperation !== operationVersion || !camera.isRunning) {
        return;
      }
      landmarker = loadedLandmarker;
      modelReady = true;

      detectionLoop = new PoseDetectionLoop(
        elements.video,
        landmarker,
        (result) => {
          const landmarks = result.landmarks[0];
          const movement = movementTracker.update(
            landmarks,
            performance.now(),
          );
          game.updateMovement(movement);

          if (!landmarks) {
            setPoseStatus("No pose detected", "ready");
          } else if (movement) {
            setPoseStatus("Body position detected", "detected");
          } else {
            setPoseStatus("Body position unavailable", "ready");
          }
        },
        (error) => {
          releaseCameraAndPose();
          showError(error);
          setPoseStatus("Camera or model error", "error");
          updateControls();
        },
      );
      detectionLoop.start();
      setPoseStatus("No pose detected", "ready");
      elements.gameStatus.textContent = "Ready to start";
      updateControls();
    } catch (error) {
      if (currentOperation === operationVersion) {
        releaseCameraAndPose();
        showError(error);
        setPoseStatus("Camera or model error", "error");
      }
    } finally {
      if (currentOperation === operationVersion) {
        isStarting = false;
      }
      updateControls();
    }
  });

  elements.stopCameraButton.addEventListener("click", stopCamera);
  elements.startGameButton.addEventListener("click", beginGame);
  elements.restartGameButton.addEventListener("click", beginGame);
  window.addEventListener("pagehide", () => {
    operationVersion += 1;
    releaseCameraAndPose();
    closePoseLandmarker(landmarker);
    landmarker = null;
  });

  elements.root.dataset.moduleReady = "true";
  setPoseStatus("Camera not started", "idle");
  updateControls();
}

function getElements(): BodyDodgeElements | null {
  const root = document.querySelector<HTMLElement>("#body-dodge-root");
  if (!root) {
    return null;
  }

  const requireFromRoot = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Body Dodge element is missing: ${selector}`);
    }
    return element;
  };

  return {
    root,
    stage: requireFromRoot<HTMLElement>("#dodge-stage"),
    startCameraButton:
      requireFromRoot<HTMLButtonElement>("#dodge-start-camera"),
    stopCameraButton:
      requireFromRoot<HTMLButtonElement>("#dodge-stop-camera"),
    startGameButton:
      requireFromRoot<HTMLButtonElement>("#dodge-start-game"),
    restartGameButton:
      requireFromRoot<HTMLButtonElement>("#dodge-restart-game"),
    video: requireFromRoot<HTMLVideoElement>("#dodge-camera-preview"),
    poseStatus: requireFromRoot<HTMLElement>("#dodge-pose-status"),
    gameStatus: requireFromRoot<HTMLElement>("#dodge-game-status"),
    movement: requireFromRoot<HTMLElement>("#dodge-movement-state"),
    error: requireFromRoot<HTMLElement>("#dodge-game-error"),
    player: requireFromRoot<HTMLElement>("#dodge-player"),
    obstacleLayer: requireFromRoot<HTMLElement>("#dodge-obstacle-layer"),
    score: requireFromRoot<HTMLElement>("#dodge-game-score"),
    time: requireFromRoot<HTMLElement>("#dodge-game-time"),
    countdown: requireFromRoot<HTMLElement>("#dodge-countdown"),
    finishedPanel: requireFromRoot<HTMLElement>("#dodge-game-finished"),
    finalScore: requireFromRoot<HTMLElement>("#dodge-final-score"),
  };
}
