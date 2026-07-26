import "vite/modulepreload-polyfill";

const frontendStatus = document.querySelector<HTMLElement>("#frontend-status");

if (frontendStatus) {
  frontendStatus.textContent = "Vite + TypeScript module loaded.";
  frontendStatus.dataset.moduleStatus = "ready";
}
