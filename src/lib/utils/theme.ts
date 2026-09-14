import { browser } from '$app/environment';

const STORAGE_KEY = 'koe-theme';

/**
 * Leser gjeldende tema fra `<html>`-klassen, som settes av det innebygde
 * skriptet i `app.html` før første maling (fra lagret valg eller systemets
 * preferanse). Det er den ene kilden til tema i appen.
 */
export function readDarkMode(): boolean {
  if (!browser) return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Setter tema for hele appen og husker valget. Både `app.css` (`.dark`) og
 * `theme.css` (`:root.dark`) henger på `<html>`-klassen, så alle flater følger
 * samme bryter.
 */
export function saveDarkMode(dark: boolean) {
  if (!browser) return;
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // Privat nettleservindu eller blokkert lagring: temaet gjelder for økten.
  }
}
