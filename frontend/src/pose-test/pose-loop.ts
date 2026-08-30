import {
  type PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

type ResultHandler = (result: PoseLandmarkerResult) => void;
type ErrorHandler = (error: Error) => void;

export interface PoseFrameTiming {
  frameStartedAt: number;
  inferenceMilliseconds: number;
  movementToRenderMilliseconds: number;
}

type TimingHandler = (timing: PoseFrameTiming) => void;

export class PoseDetectionLoop {
  private animationFrameId: number | null = null;
  private lastVideoTime = -1;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly landmarker: PoseLandmarker,
    private readonly onResult: ResultHandler,
    private readonly onError: ErrorHandler,
    private readonly onTiming?: TimingHandler,
  ) {}

  start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.lastVideoTime = -1;
    this.animationFrameId = requestAnimationFrame(this.detectFrame);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastVideoTime = -1;
  }

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
        const inferenceCompletedAt = performance.now();
        this.lastVideoTime = this.video.currentTime;
        this.onResult(result);

        if (this.onTiming) {
          requestAnimationFrame(() => {
            if (this.animationFrameId === null) {
              return;
            }
            const renderedAt = performance.now();
            this.onTiming?.({
              frameStartedAt,
              inferenceMilliseconds: inferenceCompletedAt - frameStartedAt,
              movementToRenderMilliseconds: renderedAt - frameStartedAt,
            });
          });
        }
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
