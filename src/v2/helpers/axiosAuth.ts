/**
 * Centralized auth token management for axios
 * This allows setting the JWT token from React components
 * and having it automatically added to all axios requests
 */

let currentJwtToken: string | undefined = undefined

export const setAuthToken = (token: string | undefined) => {
  currentJwtToken = token
}

export const getAuthToken = (): string | undefined => {
  return currentJwtToken
}
