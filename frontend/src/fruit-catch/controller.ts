
import { renderStarRating } from "../game-shell/rating";
import { saveCompletedGame } from "../game-shell/records";
import { PoseGameSession } from "../game-shell/pose-session";
import { PoseRenderer } from "../pose-test/pose-renderer";
import { GAME_DURATION } from "./config";
import { EasyFruitCatchGame, type GameState } from "./game";
import { WristBasketController } from "./wrist-baskets";

// List all elements
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

// Initialize page interactions and bind the game lifecycle
export function mountFruitCatch(): void {
  const elements = getElements();
  if (!elements) {
    return;
  }

  // Create the pose renderer and dual-wrist basket controller
  const renderer = new PoseRenderer(elements.canvas);
  const baskets = new WristBasketController(
    elements.stage,
    elements.leftBasket,
    elements.rightBasket,
  );

  let game: EasyFruitCatchGame;

  // Sync camera status text and styling state
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

  const poseSession = new PoseGameSession({
    video: elements.video,
    onVideoReady: () => {
      baskets.syncStageToVideo(elements.video);
      updateControls();
    },
    onResult: (result) => {
      const poseDetected = renderer.draw(result, elements.video);
      baskets.update(result.landmarks[0]);
      setPoseStatus(
        poseDetected ? "Pose detected" : "No pose detected",
        poseDetected ? "detected" : "ready",
      );
    },
    onReset: () => {
      renderer.clear();
      baskets.reset();
    },
    onRuntimeError: (error) => {
      game.cancel();
      showError(error);
      setPoseStatus("Camera or model error", "error");
      updateControls();
    },
  });

  const isGameReady = (): boolean => poseSession.isReady;

  const updateControls = (stateChange?: GameState): void => {
    const state = game?.state ?? "IDLE";
    if (stateChange === "FINISHED") {
      poseSession.stop();
      setPoseStatus("Camera stopped", "idle");
    }
    const ready = isGameReady();
    elements.root.dataset.gameState = state.toLowerCase();
    elements.startCameraButton.textContent = poseSession.isStarting
      ? "Starting..."
      : "Start Game";
    elements.startCameraButton.disabled =
      poseSession.isStarting || poseSession.isRunning;
    elements.stopCameraButton.disabled = !poseSession.isRunning;
    elements.startGameButton.disabled = !ready || state !== "IDLE";
    elements.restartGameButton.textContent = poseSession.isStarting
      ? "Starting..."
      : "Play Again";
    elements.restartGameButton.disabled =
      poseSession.isStarting || state !== "FINISHED";
    elements.root.dataset.modelReady = String(ready);
    if (state === "FINISHED" || state === "IDLE") {
      const score = state === "FINISHED" ? Number(elements.finalScore.textContent) : 0;
      renderStarRating(elements.rating, score, [5, 12, 20]);
    }
    if (stateChange === "FINISHED") {
      const score = Number(elements.finalScore.textContent);
      void saveCompletedGame(elements.root, {
        gameId: "fruit-catch",
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

  // Create the game instance and route state changes back here
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
    poseSession.stop();
    game.cancel();
  };

  const stopCamera = (): void => {
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

  // Start camera, model, and gameplay from one user action
  const startCameraAndGame = async (): Promise<void> => {
    // Prevent concurrent startup or duplicate camera access
    if (poseSession.isStarting || poseSession.isRunning) {
      return;
    }

    clearError();
    setPoseStatus("Loading pose model", "loading");
    const startPromise = poseSession.start();
    updateControls();

    try {
      const started = await startPromise;
      if (!started) {
        return;
      }
      setPoseStatus("No pose detected", "ready");
      elements.gameStatus.textContent = "Ready to start";
      beginGame();
    } catch (error) {
      game.cancel();
      showError(error);
      setPoseStatus("Camera or model error", "error");
    } finally {
      updateControls();
    }
  };

  elements.startCameraButton.addEventListener("click", startCameraAndGame);
  elements.stopCameraButton.addEventListener("click", stopCamera);
  elements.startGameButton.addEventListener("click", beginGame);
  elements.restartGameButton.addEventListener("click", startCameraAndGame);
  window.addEventListener("pagehide", () => {
    game.cancel();
    poseSession.dispose();
  });

  elements.root.dataset.moduleReady = "true";
  setPoseStatus("Camera not started", "idle");
  updateControls();
}

// Find and validate elements required by the Fruit Catch template
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
