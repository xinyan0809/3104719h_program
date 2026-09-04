// Connect the DOM, tracking and state
import { renderStarRating } from "../game-shell/rating";
import { saveCompletedGame } from "../game-shell/records";
import { PoseGameSession } from "../game-shell/pose-session";
import { HorizontalMovementTracker } from "../pose-test/movement";
import { GAME_DURATION } from "./config";
import { BodyDodgeGame, type BodyDodgeGameState } from "./game";
import { LanePlayerController } from "./lane-player";

// list all the elements
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
  rating: HTMLElement;
}

// Initialize page interaction
export function mountBodyDodge(): void {
  const elements = getElements();
  if (!elements) {
    return;
  }

  const movementTracker = new HorizontalMovementTracker();
  const player = new LanePlayerController(elements.stage, elements.player);
  let game: BodyDodgeGame;

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

  const poseSession = new PoseGameSession({
    video: elements.video,
    onVideoReady: () => {
      player.syncStageToVideo(elements.video);
      updateControls();
    },

    // Calculate horizontal position and update the player each frame
    onResult: (result) => {
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
    onReset: () => {
      movementTracker.reset();
      player.reset();
      game.updateMovement(null);
    },
    onRuntimeError: (error) => {
      game.cancel();
      showError(error);
      setPoseStatus("Camera or model error", "error");
      updateControls();
    },
  });

  const isGameReady = (): boolean => poseSession.isReady;

  // Refresh controls and results from pose and game state
  const updateControls = (stateChange?: BodyDodgeGameState): void => {
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
        gameId: "body-dodge",
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
      showError(
        new Error("Start the camera and wait for the pose model before playing."),
      );
      updateControls();
      return;
    }
    game.start();
    updateControls();
  };

  // Start camera, model, and gameplay from one user action
  const startCameraAndGame = async (): Promise<void> => {
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
    rating: requireFromRoot<HTMLElement>("#dodge-star-rating"),
  };
}
