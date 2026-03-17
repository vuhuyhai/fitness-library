/** JWT token management for web mode. Desktop (Wails) doesn't use auth. */

const TOKEN_KEY = 'fl_admin_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(
      parts[1].length + (4 - (parts[1].length % 4)) % 4, '='
    )
    const payload = JSON.parse(atob(padded)) as { exp: number }
    return payload.exp > Date.now() / 1000
  } catch {
    return false
  }
}
