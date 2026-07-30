import "vite/modulepreload-polyfill";

import { CameraController } from "./camera";
import { getPoseTestElements } from "./dom";

const elements = getPoseTestElements();

if (elements) {
  const camera = new CameraController();
  let isStarting = false;

  const setStatus = (message: string, state: string): void => {
    elements.status.textContent = message;
    elements.status.dataset.status = state;
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

  const stopCamera = (): void => {
    camera.stop(elements.video);
    clearError();
    setStatus("Camera not started", "idle");
    updateControls();
  };

  elements.startButton.addEventListener("click", async () => {
    if (isStarting || camera.isRunning) {
      return;
    }

    isStarting = true;
    clearError();
    setStatus("Starting camera", "loading");
    updateControls();

    try {
      await camera.start(elements.video);
      setStatus("Camera started", "ready");
    } catch (error) {
      showError(error);
      setStatus("Camera or model error", "error");
    } finally {
      isStarting = false;
      updateControls();
    }
  });

  elements.stopButton.addEventListener("click", stopCamera);
  window.addEventListener("pagehide", () => camera.stop(elements.video));
  updateControls();
}
