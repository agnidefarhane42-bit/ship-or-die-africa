/**
 * Retourne l'URL d'avatar à afficher, selon la priorité :
 * 1. avatarUrl (upload custom via Vercel Blob)
 * 2. image (avatar OAuth éventuel, ex. GitHub via NextAuth)
 * 3. https://github.com/{username}.png si GitHub vérifié
 * 4. null → le composant affiche les initiales
 */
export function getAvatarUrl(user: {
  avatarUrl?: string | null;
  image?: string | null;
  githubUsername?: string | null;
  githubVerified?: boolean;
}): string | null {
  if (user.avatarUrl) return user.avatarUrl;
  if (user.image) return user.image;
  if (user.githubVerified && user.githubUsername) {
    return `https://github.com/${user.githubUsername}.png`;
  }
  return null;
}
