import "vite/modulepreload-polyfill";

import { CameraController } from "./camera";
import { getPoseTestElements } from "./dom";
import { HorizontalMovementTracker } from "./movement";
import {
  closePoseLandmarker,
  loadPoseLandmarker,
} from "./pose-landmarker";
import { PoseDetectionLoop } from "./pose-loop";
import { PoseRenderer } from "./pose-renderer";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const elements = getPoseTestElements();

if (elements) {
  const camera = new CameraController();
  const renderer = new PoseRenderer(elements.canvas);
  const movementTracker = new HorizontalMovementTracker();
  let landmarker: PoseLandmarker | null = null;
  let detectionLoop: PoseDetectionLoop | null = null;
  let isStarting = false;
  let operationVersion = 0;

  const setStatus = (message: string, state: string): void => {
    elements.status.textContent = message;
    elements.status.dataset.status = state;
  };

  const setMovement = (state: string | null): void => {
    elements.movement.textContent = state ?? "—";
    elements.movement.dataset.movement = state?.toLowerCase() ?? "unknown";
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
    elements.startButton.disabled = isStarting || camera.isRunning;
    elements.stopButton.disabled = !camera.isRunning;
  };

  const releaseCameraAndLoop = (): void => {
    detectionLoop?.stop();
    detectionLoop = null;
    camera.stop(elements.video);
    renderer.clear();
    movementTracker.reset();
    setMovement(null);
  };

  const stopPrototype = (): void => {
    operationVersion += 1;
    isStarting = false;
    releaseCameraAndLoop();
    clearError();
    setStatus("Camera not started", "idle");
    updateControls();
  };

  elements.startButton.addEventListener("click", async () => {
    if (isStarting || camera.isRunning) {
      return;
    }

    const currentOperation = ++operationVersion;
    isStarting = true;
    clearError();
    setStatus("Loading pose model", "loading");
    updateControls();

    try {
      await camera.start(elements.video);
      if (currentOperation !== operationVersion || !camera.isRunning) {
        return;
      }
      updateControls();

      landmarker = await loadPoseLandmarker();
      if (currentOperation !== operationVersion || !camera.isRunning) {
        return;
      }

      detectionLoop = new PoseDetectionLoop(
        elements.video,
        landmarker,
        (result) => {
          const poseDetected = renderer.draw(result, elements.video);
          const movementState = movementTracker.update(
            result.landmarks[0],
            performance.now(),
          );
          setMovement(movementState);
          setStatus(
            poseDetected ? "Pose detected" : "No pose detected",
            poseDetected ? "detected" : "ready",
          );
        },
        (error) => {
          releaseCameraAndLoop();
          showError(error);
          setStatus("Camera or model error", "error");
          updateControls();
        },
      );
      detectionLoop.start();
      setMovement(null);
      setStatus("No pose detected", "ready");
    } catch (error) {
      if (currentOperation === operationVersion) {
        releaseCameraAndLoop();
        showError(error);
        setStatus("Camera or model error", "error");
      }
    } finally {
      if (currentOperation === operationVersion) {
        isStarting = false;
      }
      updateControls();
    }
  });

  elements.stopButton.addEventListener("click", stopPrototype);
  window.addEventListener("pagehide", () => {
    operationVersion += 1;
    releaseCameraAndLoop();
    closePoseLandmarker(landmarker);
    landmarker = null;
  });
  updateControls();
}
