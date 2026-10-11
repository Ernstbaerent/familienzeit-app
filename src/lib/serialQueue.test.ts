import { createSerialQueue } from './serialQueue';

// Eine Aufgabe, die erst beim Aufruf von `finish` fertig ist.
function controllableJob(log: string[], name: string) {
  let finish: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const job = async () => {
    log.push(`${name} start`);
    await done;
    log.push(`${name} ende`);
    return name;
  };
  return { job, finish: () => finish() };
}

describe('createSerialQueue', () => {
  it('führt Aufgaben nacheinander aus, nie gleichzeitig', async () => {
    const log: string[] = [];
    const enqueue = createSerialQueue();
    const first = controllableJob(log, 'a');
    const second = controllableJob(log, 'b');

    const resultA = enqueue(first.job);
    const resultB = enqueue(second.job);
    await Promise.resolve();
    expect(log).toEqual(['a start']); // b wartet

    first.finish();
    await resultA;
    await Promise.resolve();
    expect(log).toEqual(['a start', 'a ende', 'b start']);

    second.finish();
    expect(await resultB).toBe('b');
    expect(log).toEqual(['a start', 'a ende', 'b start', 'b ende']);
  });

  it('eine fehlgeschlagene Aufgabe stoppt die nächste nicht, ihr Fehler geht nur an ihren Aufrufer', async () => {
    const enqueue = createSerialQueue();
    const failing = enqueue(async () => {
      throw new Error('Speichern fehlgeschlagen');
    });
    const next = enqueue(async () => 'weiter');

    await expect(failing).rejects.toThrow('Speichern fehlgeschlagen');
    await expect(next).resolves.toBe('weiter');
  });
});
