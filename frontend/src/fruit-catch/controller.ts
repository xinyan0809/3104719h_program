import type { PoseLandmarker } from "@mediapipe/tasks-vision";

import { renderStarRating } from "../game-shell/rating";
import { CameraController } from "../pose-test/camera";
import {
  closePoseLandmarker,
  loadPoseLandmarker,
} from "../pose-test/pose-landmarker";
import { PoseDetectionLoop } from "../pose-test/pose-loop";
import { PoseRenderer } from "../pose-test/pose-renderer";
import { EasyFruitCatchGame, type GameState } from "./game";
import { WristBasketController } from "./wrist-baskets";

interface FruitCatchElements {
  root: HTMLElement;
  stage: HTMLElement;
  startCameraButton: HTMLButtonElement;
  stopCameraButton: HTMLButtonElement;
  startGameButton: HTMLButtonElement;
  restartGameButton: HTMLButtonElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  poseStatus: HTMLElement;
  gameStatus: HTMLElement;
  error: HTMLElement;
  leftBasket: HTMLElement;
  rightBasket: HTMLElement;
  fruitLayer: HTMLElement;
  score: HTMLElement;
  time: HTMLElement;
  countdown: HTMLElement;
  finishedPanel: HTMLElement;
  finalScore: HTMLElement;
  rating: HTMLElement;
}

export function mountFruitCatch(): void {
  const elements = getElements();
  if (!elements) {
    return;
  }

  const camera = new CameraController();
  const renderer = new PoseRenderer(elements.canvas);
  const baskets = new WristBasketController(
    elements.stage,
    elements.leftBasket,
    elements.rightBasket,
  );

  let landmarker: PoseLandmarker | null = null;
  let detectionLoop: PoseDetectionLoop | null = null;
  let isStarting = false;
  let modelReady = false;
  let operationVersion = 0;
  let game: EasyFruitCatchGame;

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
      error instanceof Error ? error.message : "An unexpected camera error occurred.";
    elements.error.hidden = false;
  };

  const updateControls = (_state?: GameState): void => {
    const state = game?.state ?? "IDLE";
    const ready = isGameReady();
    elements.root.dataset.gameState = state.toLowerCase();
    elements.startCameraButton.textContent = isStarting
      ? "Starting..."
      : "Start Game";
    elements.startCameraButton.disabled = isStarting || camera.isRunning;
    elements.stopCameraButton.disabled = !camera.isRunning;
    elements.startGameButton.disabled = !ready || state !== "IDLE";
    elements.restartGameButton.disabled = !ready || state !== "FINISHED";
    elements.root.dataset.modelReady = String(ready);
    if (state === "FINISHED" || state === "IDLE") {
      const score = state === "FINISHED" ? Number(elements.finalScore.textContent) : 0;
      renderStarRating(elements.rating, score, [5, 12, 20]);
    }
  };

  game = new EasyFruitCatchGame(
    {
      stage: elements.stage,
      fruitLayer: elements.fruitLayer,
      score: elements.score,
      time: elements.time,
      countdown: elements.countdown,
      status: elements.gameStatus,
      finishedPanel: elements.finishedPanel,
      finalScore: elements.finalScore,
    },
    baskets,
    isGameReady,
    updateControls,
  );

  const releaseCameraAndPose = (): void => {
    detectionLoop?.stop();
    detectionLoop = null;
    camera.stop(elements.video);
    renderer.clear();
    baskets.reset();
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
      showError(new Error("Start the camera and wait for the pose model before playing."));
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
      baskets.syncStageToVideo(elements.video);
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
          const poseDetected = renderer.draw(result, elements.video);
          baskets.update(result.landmarks[0]);
          setPoseStatus(
            poseDetected ? "Pose detected" : "No pose detected",
            poseDetected ? "detected" : "ready",
          );
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
      beginGame();
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

function getElements(): FruitCatchElements | null {
  const root = document.querySelector<HTMLElement>("#fruit-catch-root");
  if (!root) {
    return null;
  }

  const requireFromRoot = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Fruit Catch element is missing: ${selector}`);
    }
    return element;
  };

  return {
    root,
    stage: requireFromRoot<HTMLElement>("#fruit-stage"),
    startCameraButton: requireFromRoot<HTMLButtonElement>("#start-camera"),
    stopCameraButton: requireFromRoot<HTMLButtonElement>("#stop-camera"),
    startGameButton: requireFromRoot<HTMLButtonElement>("#start-game"),
    restartGameButton: requireFromRoot<HTMLButtonElement>("#restart-game"),
    video: requireFromRoot<HTMLVideoElement>("#camera-preview"),
    canvas: requireFromRoot<HTMLCanvasElement>("#pose-overlay"),
    poseStatus: requireFromRoot<HTMLElement>("#pose-status"),
    gameStatus: requireFromRoot<HTMLElement>("#game-status"),
    error: requireFromRoot<HTMLElement>("#game-error"),
    leftBasket: requireFromRoot<HTMLElement>("#left-basket"),
    rightBasket: requireFromRoot<HTMLElement>("#right-basket"),
    fruitLayer: requireFromRoot<HTMLElement>("#fruit-layer"),
    score: requireFromRoot<HTMLElement>("#game-score"),
    time: requireFromRoot<HTMLElement>("#game-time"),
    countdown: requireFromRoot<HTMLElement>("#game-countdown"),
    finishedPanel: requireFromRoot<HTMLElement>("#game-finished"),
    finalScore: requireFromRoot<HTMLElement>("#final-score"),
    rating: requireFromRoot<HTMLElement>("#fruit-star-rating"),
  };
}
