import type { PoseLandmarker } from "@mediapipe/tasks-vision";

import { renderStarRating } from "../game-shell/rating";
import { saveCompletedGame } from "../game-shell/records";
import { CameraController } from "../pose-test/camera";
import {
  closePoseLandmarker,
  loadPoseLandmarker,
} from "../pose-test/pose-landmarker";
import { PoseDetectionLoop } from "../pose-test/pose-loop";
import { GAME_DURATION } from "./config";
import { TargetShotGame, type TargetShotGameState } from "./game";
import { RightHandGunController } from "./hand-gun";

interface TargetShotElements {
  root: HTMLElement;
  stage: HTMLElement;
  startCameraButton: HTMLButtonElement;
  stopCameraButton: HTMLButtonElement;
  startGameButton: HTMLButtonElement;
  restartGameButton: HTMLButtonElement;
  video: HTMLVideoElement;
  poseStatus: HTMLElement;
  gameStatus: HTMLElement;
  error: HTMLElement;
  gun: HTMLElement;
  targetLayer: HTMLElement;
  score: HTMLElement;
  time: HTMLElement;
  countdown: HTMLElement;
  finishedPanel: HTMLElement;
  finalScore: HTMLElement;
  rating: HTMLElement;
}

export function mountTargetShot(): void {
  const elements = getElements();
  if (!elements) {
    return;
  }

  const camera = new CameraController();
  const gun = new RightHandGunController(elements.stage, elements.gun);
  let landmarker: PoseLandmarker | null = null;
  let detectionLoop: PoseDetectionLoop | null = null;
  let isStarting = false;
  let modelReady = false;
  let operationVersion = 0;
  let game: TargetShotGame;

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

  const releasePoseSession = (): void => {
    detectionLoop?.stop();
    detectionLoop = null;
    camera.stop(elements.video);
    gun.reset();
    modelReady = false;
  };

  const updateControls = (stateChange?: TargetShotGameState): void => {
    const state = game?.state ?? "IDLE";
    if (stateChange === "FINISHED") {
      operationVersion += 1;
      isStarting = false;
      releasePoseSession();
      setPoseStatus("Camera stopped", "idle");
    }
    const ready = isGameReady();
    elements.root.dataset.gameState = state.toLowerCase();
    elements.startCameraButton.textContent = isStarting
      ? "Starting..."
      : "Start Game";
    elements.startCameraButton.disabled = isStarting || camera.isRunning;
    elements.stopCameraButton.disabled = !camera.isRunning;
    elements.startGameButton.disabled = !ready || state !== "IDLE";
    elements.restartGameButton.textContent = isStarting
      ? "Starting..."
      : "Play Again";
    elements.restartGameButton.disabled = isStarting || state !== "FINISHED";
    elements.root.dataset.modelReady = String(ready);
    if (state === "FINISHED" || state === "IDLE") {
      const score = state === "FINISHED" ? Number(elements.finalScore.textContent) : 0;
      renderStarRating(elements.rating, score, [5, 12, 20]);
    }
    if (stateChange === "FINISHED") {
      const score = Number(elements.finalScore.textContent);
      void saveCompletedGame(elements.root, {
        gameId: "target-shot",
        score,
        durationSeconds: Math.round(GAME_DURATION / 1_000),
      })
        .then(() => {
          if (game.state === "FINISHED") {
            elements.gameStatus.textContent = "Finished — record saved";
          }
        })
        .catch(() => {
          if (game.state === "FINISHED") {
            elements.gameStatus.textContent = "Finished — record not saved";
          }
        });
    }
  };

  game = new TargetShotGame(
    {
      stage: elements.stage,
      targetLayer: elements.targetLayer,
      score: elements.score,
      time: elements.time,
      countdown: elements.countdown,
      status: elements.gameStatus,
      finishedPanel: elements.finishedPanel,
      finalScore: elements.finalScore,
    },
    gun,
    isGameReady,
    updateControls,
  );

  const releaseCameraAndPose = (): void => {
    releasePoseSession();
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
    gun.reset();
    game.start();
    updateControls();
  };

  const startCameraAndGame = async (): Promise<void> => {
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
      gun.syncStageToVideo(elements.video);
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
          const handDetected = gun.update(landmarks);
          if (!handDetected) {
            game.handleTrackingLoss();
          }

          if (!landmarks) {
            setPoseStatus("No pose detected", "ready");
          } else if (handDetected) {
            setPoseStatus("Right hand detected", "detected");
          } else {
            setPoseStatus("Right hand not visible", "ready");
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
  };

  elements.startCameraButton.addEventListener("click", startCameraAndGame);
  elements.stopCameraButton.addEventListener("click", stopCamera);
  elements.startGameButton.addEventListener("click", beginGame);
  elements.restartGameButton.addEventListener("click", startCameraAndGame);
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

function getElements(): TargetShotElements | null {
  const root = document.querySelector<HTMLElement>("#target-shot-root");
  if (!root) {
    return null;
  }

  const requireFromRoot = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Target Shot element is missing: ${selector}`);
    }
    return element;
  };

  return {
    root,
    stage: requireFromRoot<HTMLElement>("#target-stage"),
    startCameraButton:
      requireFromRoot<HTMLButtonElement>("#target-start-camera"),
    stopCameraButton:
      requireFromRoot<HTMLButtonElement>("#target-stop-camera"),
    startGameButton:
      requireFromRoot<HTMLButtonElement>("#target-start-game"),
    restartGameButton:
      requireFromRoot<HTMLButtonElement>("#target-restart-game"),
    video: requireFromRoot<HTMLVideoElement>("#target-camera-preview"),
    poseStatus: requireFromRoot<HTMLElement>("#target-pose-status"),
    gameStatus: requireFromRoot<HTMLElement>("#target-game-status"),
    error: requireFromRoot<HTMLElement>("#target-game-error"),
    gun: requireFromRoot<HTMLElement>("#target-gun"),
    targetLayer: requireFromRoot<HTMLElement>("#target-layer"),
    score: requireFromRoot<HTMLElement>("#target-game-score"),
    time: requireFromRoot<HTMLElement>("#target-game-time"),
    countdown: requireFromRoot<HTMLElement>("#target-countdown"),
    finishedPanel: requireFromRoot<HTMLElement>("#target-game-finished"),
    finalScore: requireFromRoot<HTMLElement>("#target-final-score"),
    rating: requireFromRoot<HTMLElement>("#target-star-rating"),
  };
}
