// Run MediaPipe video detection
import {
  type PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

type ResultHandler = (result: PoseLandmarkerResult) => void;
type ErrorHandler = (error: Error) => void;

// Ensure each new video frame is detected at most once
export class PoseDetectionLoop {
  private animationFrameId: number | null = null;
  private lastVideoTime = -1;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly landmarker: PoseLandmarker,
    private readonly onResult: ResultHandler,
    private readonly onError: ErrorHandler,
  ) {}

  start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.lastVideoTime = -1;
    this.animationFrameId = requestAnimationFrame(this.detectFrame);
  }

  // Cancel the frame and reset video timing
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastVideoTime = -1;
  }

  // Detect a fresh video frame and keep the loop scheduled
  private readonly detectFrame = (): void => {
    if (this.animationFrameId === null) {
      return;
    }

    try {
      if (
        this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        this.video.currentTime !== this.lastVideoTime
      ) {
        const frameStartedAt = performance.now();
        const result = this.landmarker.detectForVideo(this.video, frameStartedAt);
        this.lastVideoTime = this.video.currentTime;
        this.onResult(result);
      }

      this.animationFrameId = requestAnimationFrame(this.detectFrame);
    } catch (error) {
      this.stop();
      this.onError(
        error instanceof Error
          ? error
          : new Error("Pose detection stopped unexpectedly."),
      );
    }
  };
}
