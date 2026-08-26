export const PROMOVIE_TOKEN_KEY = "promovie_access_token";

export function getProMovieToken() {
  return window.localStorage.getItem(PROMOVIE_TOKEN_KEY) ?? "";
}

export function saveProMovieToken(token: string) {
  window.localStorage.setItem(PROMOVIE_TOKEN_KEY, token);
}

export function clearProMovieToken() {
  window.localStorage.removeItem(PROMOVIE_TOKEN_KEY);
}
