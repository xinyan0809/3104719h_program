import {
  DrawingUtils,
  PoseLandmarker,
  type NormalizedLandmark,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

export class PoseRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly drawingUtils: DrawingUtils;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("This browser cannot create the pose drawing canvas.");
    }
    this.context = context;
    this.drawingUtils = new DrawingUtils(context);
  }

  // Draw the first pose and report whether a person was detected
  draw(result: PoseLandmarkerResult, video: HTMLVideoElement): boolean {
    this.resizeToVideo(video);
    this.clear();

    const landmarks = result.landmarks[0];
    if (!landmarks) {
      return false;
    }

    this.drawPose(landmarks);
    return true;
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private resizeToVideo(video: HTMLVideoElement): void {
    if (
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      (this.canvas.width !== video.videoWidth ||
        this.canvas.height !== video.videoHeight)
    ) {
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
    }
  }

  // Draw pose connectors and landmarks
  private drawPose(landmarks: NormalizedLandmark[]): void {
    this.drawingUtils.drawConnectors(
      landmarks,
      PoseLandmarker.POSE_CONNECTIONS,
      {
        color: "#22c55e",
        lineWidth: 4,
      },
    );
    this.drawingUtils.drawLandmarks(landmarks, {
      color: "#f8fafc",
      fillColor: "#2563eb",
      lineWidth: 2,
      radius: 4,
    });
  }
}
