// Dünner Wrapper um AsyncStorage: speichert JSON nur lokal auf dem Gerät.
// Nichts davon verlässt das Handy (Datenschutz-Regel in der CLAUDE.md).
import AsyncStorage from '@react-native-async-storage/async-storage';

// Liest einen Wert. Fehlt er oder ist er kaputt, kommt `null` zurück.
export async function loadJson(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

// Schreibt einen Wert. Schlägt das Speichern fehl, wird der Fehler weitergegeben,
// damit die Oberfläche es melden kann.
export async function saveJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
