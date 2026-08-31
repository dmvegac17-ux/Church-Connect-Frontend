import type { JwtClaims } from "../types/user";

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  const binary = atob(padded);
  // Decodifica correctamente caracteres multibyte (acentos, etc.).
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Decodifica (sin verificar la firma) el payload de un JWT. */
export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const claims = JSON.parse(base64UrlDecode(parts[1])) as Partial<JwtClaims>;

    if (
      typeof claims.sub !== "string" ||
      typeof claims.rol !== "string" ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }

    return claims as JwtClaims;
  } catch {
    return null;
  }
}

/** `true` si el token ya expiró (o falta `exp`). `skewSeconds` da margen. */
export function isExpired(claims: JwtClaims, skewSeconds = 5): boolean {
  const now = Math.floor(Date.now() / 1000);
  return claims.exp <= now + skewSeconds;
}

/** Decodifica y valida vigencia en un paso. Devuelve claims solo si sirve. */
export function readValidClaims(token: string): JwtClaims | null {
  const claims = decodeJwt(token);
  if (!claims || isExpired(claims)) {
    return null;
  }
  return claims;
}
