/**
 * Lit la date d'expiration (`exp`, en secondes) d'un JWT, sans appel serveur.
 * Le JWT n'est pas chiffré : son contenu (payload) est simplement encodé en base64url.
 * Un jeton illisible est considéré comme expiré.
 */
export function isJwtExpired(token: string, marginMs = 0): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return true;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (!payload?.exp) return true;
    return Date.now() + marginMs >= payload.exp * 1000;
  } catch {
    return true;
  }
}
