// Load and reuse MediaPipe pose detection with CPU fallback
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerOptions,
} from "@mediapipe/tasks-vision";

// Focus the remote runtime and lightweight model URL
const MEDIAPIPE_VERSION = "1.0.0";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createPoseLandmarker().catch((error: unknown) => {
      landmarkerPromise = null;
      throw new Error(
        "The pose model could not be loaded. Check the network connection and try again.",
        { cause: error },
      );
    });
  }

  return landmarkerPromise;
}

// Close the model and clear the cached reference
export function closePoseLandmarker(landmarker: PoseLandmarker | null): void {
  landmarker?.close();
  landmarkerPromise = null;
}

// Create a GPU model first and fall back to CPU
async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const options: PoseLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: false,
  };

  // Keep model settings and switch delegate when GPU is unavailable
  try {
    return await PoseLandmarker.createFromOptions(vision, options);
  } catch {
    return PoseLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "CPU",
      },
    });
  }
}
