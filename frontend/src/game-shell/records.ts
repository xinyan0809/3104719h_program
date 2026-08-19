export type RecordableGame =
  | "fruit-catch"
  | "target-shot"
  | "body-dodge";

interface CompletedGameRecord {
  gameId: RecordableGame;
  score: number;
  durationSeconds: number;
}

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

  if (!response.ok) {
    throw new Error("The game record could not be saved.");
  }
}

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
