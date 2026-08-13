export function renderStarRating(
  element: HTMLElement,
  score: number,
  thresholds: readonly [number, number, number],
): void {
  const starCount = thresholds.filter((threshold) => score >= threshold).length;
  element.textContent = `${"★".repeat(starCount)}${"☆".repeat(3 - starCount)}`;
  element.setAttribute(
    "aria-label",
    `${starCount} out of 3 stars for a score of ${score}`,
  );
}
