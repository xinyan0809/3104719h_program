import type { PoseLandmarker } from "@mediapipe/tasks-vision";

import { CameraController } from "../pose-test/camera";
import {
  closePoseLandmarker,
  loadPoseLandmarker,
} from "../pose-test/pose-landmarker";
import { PoseDetectionLoop } from "../pose-test/pose-loop";
import { PoseRenderer } from "../pose-test/pose-renderer";
import { WristBasketController } from "./wrist-baskets";

interface FruitCatchElements {
  root: HTMLElement;
  stage: HTMLElement;
  startCameraButton: HTMLButtonElement;
  stopCameraButton: HTMLButtonElement;
  startGameButton: HTMLButtonElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  poseStatus: HTMLElement;
  gameStatus: HTMLElement;
  error: HTMLElement;
  leftBasket: HTMLElement;
  rightBasket: HTMLElement;
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

  const updateControls = (): void => {
    elements.startCameraButton.disabled = isStarting || camera.isRunning;
    elements.stopCameraButton.disabled = !camera.isRunning;
    // Gameplay is enabled in the next isolated increment.
    elements.startGameButton.disabled = true;
    elements.root.dataset.modelReady = String(modelReady && camera.isRunning);
  };

  const releaseCameraAndPose = (): void => {
    detectionLoop?.stop();
    detectionLoop = null;
    camera.stop(elements.video);
    renderer.clear();
    baskets.reset();
    modelReady = false;
  };

  const stopCamera = (): void => {
    operationVersion += 1;
    isStarting = false;
    releaseCameraAndPose();
    clearError();
    setPoseStatus("Camera not started", "idle");
    elements.gameStatus.textContent = "Idle";
    elements.gameStatus.dataset.state = "idle";
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
      elements.gameStatus.textContent = "Camera and model ready";
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
    video: requireFromRoot<HTMLVideoElement>("#camera-preview"),
    canvas: requireFromRoot<HTMLCanvasElement>("#pose-overlay"),
    poseStatus: requireFromRoot<HTMLElement>("#pose-status"),
    gameStatus: requireFromRoot<HTMLElement>("#game-status"),
    error: requireFromRoot<HTMLElement>("#game-error"),
    leftBasket: requireFromRoot<HTMLElement>("#left-basket"),
    rightBasket: requireFromRoot<HTMLElement>("#right-basket"),
  };
}
