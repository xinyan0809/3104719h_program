// Coordinate camera, pose model, and frame detection lifecycles
import type {
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

import { CameraController } from "../pose-test/camera";
import {
  closePoseLandmarker,
  loadPoseLandmarker,
} from "../pose-test/pose-landmarker";
import { PoseDetectionLoop } from "../pose-test/pose-loop";

// Define callbacks: game received the pose position
interface PoseSessionOptions {
  video: HTMLVideoElement;
  onVideoReady: () => void;
  onResult: (result: PoseLandmarkerResult) => void;
  onReset: () => void;
  onRuntimeError: (error: Error) => void;
}

// Encapsulate the pose session that can safely start, stop, dispose
export class PoseGameSession {
  // Track
  private readonly camera = new CameraController();
  private landmarker: PoseLandmarker | null = null;
  private detectionLoop: PoseDetectionLoop | null = null;
  private operationVersion = 0;
  private modelReady = false;
  private starting = false;

  constructor(private readonly options: PoseSessionOptions) {}

  // make sure these are ready
  get isStarting(): boolean {
    return this.starting;
  }
  get isRunning(): boolean {
    return this.camera.isRunning;
  }
  // only when both model and camera are ready, game can start
  get isReady(): boolean {
    return this.modelReady && this.camera.isRunning;
  }

  // Start camera, load the model, then begin detection
  async start(): Promise<boolean> {
    if (this.starting || this.camera.isRunning) {
      return false;
    }

    const currentOperation = ++this.operationVersion;
    this.starting = true;

    try {
      await this.camera.start(this.options.video);
      if (!this.isCurrentRunningOperation(currentOperation)) {
        return false;
      }
      this.options.onVideoReady();

      const loadedLandmarker = await loadPoseLandmarker();
      if (!this.isCurrentRunningOperation(currentOperation)) {
        return false;
      }

      this.landmarker = loadedLandmarker;
      this.modelReady = true;
      this.detectionLoop = new PoseDetectionLoop(
        this.options.video,
        loadedLandmarker,
        this.options.onResult,
        (error) => {
          this.stop();
          this.options.onRuntimeError(error);
        },
      );
      this.detectionLoop.start();
      return true;
    } catch (error) {
      if (currentOperation !== this.operationVersion) {
        return false;
      }
      this.stop();
      throw error;
    } finally {
      if (currentOperation === this.operationVersion) {
        this.starting = false;
      }
    }
  }

  // Stop detection and camera, then notify the game to reset
  stop(): void {
    this.operationVersion += 1;
    this.starting = false;
    this.detectionLoop?.stop();
    this.detectionLoop = null;
    this.camera.stop(this.options.video);
    this.modelReady = false;
    this.options.onReset();
  }

  // Fully release the session and model resources
  dispose(): void {
    this.stop();
    closePoseLandmarker(this.landmarker);
    this.landmarker = null;
  }

  // check action: whether an async result still belongs to the active
  private isCurrentRunningOperation(operation: number): boolean {
    return operation === this.operationVersion && this.camera.isRunning;
  }
}
