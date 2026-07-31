import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type MovementState = "LEFT" | "CENTRE" | "RIGHT";

export const LEFT_MAX_X = 0.42;
export const RIGHT_MIN_X = 0.58;
export const POSE_LOSS_GRACE_MS = 600;

const MIN_LANDMARK_CONFIDENCE = 0.5;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

export class HorizontalMovementTracker {
  private currentState: MovementState | null = null;
  private lastPoseTimestamp = 0;

  update(
    landmarks: NormalizedLandmark[] | undefined,
    timestamp = performance.now(),
  ): MovementState | null {
    const bodyCentreX = landmarks ? getBodyCentreX(landmarks) : null;

    if (bodyCentreX !== null) {
      // The preview is mirrored, so convert camera coordinates to screen direction.
      const displayX = 1 - bodyCentreX;
      this.currentState = classifyHorizontalPosition(displayX);
      this.lastPoseTimestamp = timestamp;
      return this.currentState;
    }

    if (timestamp - this.lastPoseTimestamp > POSE_LOSS_GRACE_MS) {
      this.currentState = null;
    }

    return this.currentState;
  }

  reset(): void {
    this.currentState = null;
    this.lastPoseTimestamp = 0;
  }
}

export function classifyHorizontalPosition(x: number): MovementState {
  if (x < LEFT_MAX_X) {
    return "LEFT";
  }
  if (x > RIGHT_MIN_X) {
    return "RIGHT";
  }
  return "CENTRE";
}

function getBodyCentreX(landmarks: NormalizedLandmark[]): number | null {
  return (
    centreOfVisiblePair(
      landmarks[LEFT_SHOULDER],
      landmarks[RIGHT_SHOULDER],
    ) ??
    centreOfVisiblePair(landmarks[LEFT_HIP], landmarks[RIGHT_HIP])
  );
}

function centreOfVisiblePair(
  first: NormalizedLandmark | undefined,
  second: NormalizedLandmark | undefined,
): number | null {
  if (!isUsable(first) || !isUsable(second)) {
    return null;
  }
  return (first.x + second.x) / 2;
}

function isUsable(
  landmark: NormalizedLandmark | undefined,
): landmark is NormalizedLandmark {
  return Boolean(
    landmark &&
      (landmark.visibility ?? 1) >= MIN_LANDMARK_CONFIDENCE,
  );
}
