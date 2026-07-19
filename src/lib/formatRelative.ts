// Formate une date en temps relatif court, en français.
// Gère le passé ("il y a X") et le futur ("dans X").
export function formatRelativeDate(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const diffMin = Math.floor(absMs / 60000);

  if (diffMin < 1) return isFuture ? "dans un instant" : "à l'instant";
  if (diffMin < 60) {
    return isFuture ? `dans ${diffMin} min` : `il y a ${diffMin} min`;
  }

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    return isFuture ? `dans ${diffH}h` : `il y a ${diffH}h`;
  }

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) {
    return isFuture ? `dans ${diffD}j` : `il y a ${diffD}j`;
  }

  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
