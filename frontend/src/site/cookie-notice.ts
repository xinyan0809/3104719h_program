const STORAGE_KEY = "pose-platform.cookie-notice.v2";

const notice = document.querySelector<HTMLElement>("#cookie-notice");
const acceptButton = document.querySelector<HTMLButtonElement>("#accept-cookies");
const declineButton =
  document.querySelector<HTMLButtonElement>("#decline-cookies");

if (notice && acceptButton && declineButton) {
  let savedChoice: string | null = null;

  try {
    savedChoice = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // The choices can still dismiss the notice if storage is unavailable.
  }

  if (savedChoice !== "accepted" && savedChoice !== "declined") {
    notice.hidden = false;
  }

  const saveChoice = (choice: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Storage can be blocked by browser privacy settings; dismissal still works.
    }

    notice.hidden = true;
  };

  acceptButton.addEventListener("click", () => saveChoice("accepted"));
  declineButton.addEventListener("click", () => saveChoice("declined"));
}
