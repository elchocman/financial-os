'use client'

export interface AuthToken {
  accessToken: string
  tokenType: string
}

export interface User {
  id: string
  email: string
  name?: string
}

let TOKEN_KEY = 'financial_os_token'

export function setToken(token: AuthToken) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token.accessToken)
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}
