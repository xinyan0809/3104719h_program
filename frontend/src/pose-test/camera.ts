export class CameraAccessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CameraAccessError";
  }
}

export class CameraController {
  private stream: MediaStream | null = null;
  private requestVersion = 0;

  get isRunning(): boolean {
    return this.stream !== null;
  }

  async start(video: HTMLVideoElement): Promise<void> {
    if (this.stream) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraAccessError(
        "Camera access is not supported in this browser or context.",
      );
    }

    const requestVersion = ++this.requestVersion;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (requestVersion !== this.requestVersion) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.stream = stream;
      video.srcObject = stream;
      await video.play();
    } catch (error) {
      this.stop(video);
      throw new CameraAccessError(cameraErrorMessage(error), { cause: error });
    }
  }

  stop(video: HTMLVideoElement): void {
    this.requestVersion += 1;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    video.pause();
    video.srcObject = null;
    video.removeAttribute("src");
    video.load();
  }
}

function cameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "The camera could not be started. Check the browser camera settings.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Allow camera access and try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No available camera was found.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is unavailable or is already in use by another application.";
    case "OverconstrainedError":
      return "The available camera does not support the requested settings.";
    default:
      return "The camera could not be started. Check the browser camera settings.";
  }
}
