// Orte-Import (M10a): alle festen Grenzen an einer Stelle. Begründungen und Zahlen: docs/orte.md, „Grenzen“.

const MB = 1024 * 1024;

export const placeLimits = {
  // Größte Länder bei Geofabrik (Oktober 2026): Nordrhein-Westfalen ca. 871 MB, Bayern ca. 805–830 MB,
  // Baden-Württemberg ca. 611 MB. Ganz Deutschland ca. 4,9 GB. 1,5 GB lässt gut 70 % Luft für Wachstum
  // (Deutschland wuchs von 2022 bis 2026 um etwa ein Drittel) und fängt eine falsche Adresse (z. B. ganz Europa) ab.
  maxDownloadBytes: 1536 * MB,
  // Alle Länder zusammen pro Lauf (heute ca. 4,9 GB).
  maxTotalDownloadBytes: 8 * 1024 * MB,
  maxPolyBytes: 2 * MB,
  maxMd5Bytes: 4096,
  downloadTimeoutMs: 20 * 60_000, // pro Datei; bei üblichen 20–100 MB/s braucht die größte unter 1 Minute
  smallDownloadTimeoutMs: 60_000, // .poly und .md5
  osmiumTimeoutMs: 20 * 60_000, // pro osmium-Aufruf

  // Schätzung Deutschland: 300 000 bis 500 000 Orte (docs/orte.md, „Größe“). Größtes Land (NRW) schätzungsweise
  // 60 000 bis 90 000. Mehr als 150 000 in einem Land deutet auf einen Fehler im Filter hin.
  maxPlacesPerRegion: 150_000,
  // Standard für MAX_PLACES (alle Länder zusammen): obere Schätzung plus 20 % Luft. Bei etwa 250 Byte pro Zeile mit Index
  // sind das rund 150 MB, beim Austausch eines Landes kurz mehr. Das bleibt unter den 500 MB des kostenlosen Tarifs.
  defaultMaxPlaces: 600_000,

  // Qualitätsbremse je Bundesland: Ein neuer Import muss mindestens 70 % der bisherigen Zeilen dieses Landes haben.
  // Die Datenbank-Funktion prüft das selbst noch einmal (0003_places.sql).
  minRatio: 0.7,

  uploadChunkRows: 1000, // Zeilen pro Anfrage an die Zwischentabelle (ca. 300 KB)
  maxUploadChunks: 200, // = maxPlacesPerRegion / uploadChunkRows, mit Luft
  supabaseTimeoutMs: 60_000,
  publishTimeoutMs: 180_000, // die Datenbank-Funktion darf 120 Sekunden rechnen (statement_timeout)

  // Doppelte zusammenfassen (wie im Machbarkeitstest M2a): gleicher Name in derselben Kategorie näher als 150 m,
  // namenlose Orte derselben Unterart näher als 40 m.
  sameNamedMeters: 150,
  sameUnnamedMeters: 40,
} as const;
