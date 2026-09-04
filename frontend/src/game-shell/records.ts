// Provide the shared score-saving client
export type RecordableGame =
  | "fruit-catch"
  | "target-shot"
  | "body-dodge";

// Describe one completed result that can be persisted
interface CompletedGameRecord {
  gameId: RecordableGame;
  score: number;
  durationSeconds: number;
}

// Submit a final score using the page's CSRF information
export async function saveCompletedGame(
  root: HTMLElement,
  record: CompletedGameRecord,
): Promise<void> {
  const endpoint = root.dataset.recordUrl;
  const csrfToken = readCookie("csrftoken");
  if (!endpoint || !csrfToken) {
    throw new Error("Game record saving is not available.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({
      game_id: record.gameId,
      score: record.score,
      duration_seconds: record.durationSeconds,
    }),
  });

  // Convert any unsuccessful response into a save failure
  if (!response.ok) {
    throw new Error("The game record could not be saved.");
  }
}

// Read one named value from the browser cookie string
function readCookie(name: string): string | null {
  const prefix = name + "=";
  for (const item of document.cookie.split(";")) {
    const cookie = item.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return null;
}
