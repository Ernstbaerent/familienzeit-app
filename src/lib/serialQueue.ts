// Führt Aufgaben nacheinander aus, nie gleichzeitig.
// Wozu: Tippt jemand zweimal schnell hintereinander, soll die zweite Speicherung den Stand
// der ersten sehen und nicht daran vorbeischreiben (sonst gehen Änderungen verloren oder werden doppelt angelegt).
export function createSerialQueue() {
  let last: Promise<unknown> = Promise.resolve();

  // Schlägt eine Aufgabe fehl, bekommt nur ihr Aufrufer den Fehler. Die nächste läuft trotzdem.
  return function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const result = last.then(job);
    last = result.catch(() => undefined);
    return result;
  };
}
