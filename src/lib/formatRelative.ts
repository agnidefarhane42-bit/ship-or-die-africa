// Formate une date en temps relatif court, en français.
export function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD}j`;

  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
