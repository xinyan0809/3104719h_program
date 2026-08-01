const STORAGE_KEY = "pose-platform.cookie-notice.v1";

const notice = document.querySelector<HTMLElement>("#cookie-notice");
const acknowledgeButton = document.querySelector<HTMLButtonElement>(
  "#acknowledge-cookies",
);

if (notice && acknowledgeButton) {
  let isAcknowledged = false;

  try {
    isAcknowledged = window.localStorage.getItem(STORAGE_KEY) === "acknowledged";
  } catch {
    // The notice can still be dismissed for this page if storage is unavailable.
  }

  if (!isAcknowledged) {
    notice.hidden = false;
  }

  acknowledgeButton.addEventListener("click", () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // Storage can be blocked by browser privacy settings; dismissal still works.
    }

    notice.hidden = true;
  });
}
