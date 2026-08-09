import "vite/modulepreload-polyfill";

const root = document.querySelector<HTMLElement>("#fruit-catch-root");

if (root) {
  root.dataset.moduleReady = "true";
  const status = root.querySelector<HTMLElement>("#pose-status");
  if (status) {
    status.textContent = "Game module loaded; camera controls are not enabled yet";
    status.dataset.status = "idle";
  }
}
