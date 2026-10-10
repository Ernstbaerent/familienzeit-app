import type { ImperativeRouter } from 'expo-router';

// Schließt einen Bildschirm: zurück, wenn es ein Zurück gibt, sonst zum Start.
// (Beim allerersten Kind gibt es kein Zurück, weil der Start dorthin weitergeleitet hat.)
export function closeScreen(router: ImperativeRouter) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
