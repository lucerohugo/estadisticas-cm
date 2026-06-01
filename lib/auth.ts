// Simple authentication context for demo purposes
// In production, use proper auth like Supabase Auth

export interface User {
  username: string
  role: "admin"
}

const VALID_CREDENTIALS = {
  username: "Brix",
  password: "Brix123*",
}

export function validateCredentials(username: string, password: string): User | null {
  if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
    return { username: VALID_CREDENTIALS.username, role: "admin" }
  }
  return null
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("centro-motos-user")
  if (stored) {
    try {
      return JSON.parse(stored) as User
    } catch {
      return null
    }
  }
  return null
}

export function storeUser(user: User): void {
  localStorage.setItem("centro-motos-user", JSON.stringify(user))
}

export function clearUser(): void {
  localStorage.removeItem("centro-motos-user")
}
