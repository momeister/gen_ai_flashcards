# Study & Upload Portal

Eine kleine React + Vite Anwendung mit Tailwind CSS und Framer Motion für:

1. Projekte-Übersicht mit Farbakzent-Regler und Projekt-Erstellung (Drag & Drop)
2. Datei-Upload (Drag & Drop, Mock-Upload)
3. Animiertes Lernkarten-System (Anki-Stil: Frage / Antwort, Lernstufen, Export)

## Features

### Upload
* Drag & Drop für PDF, Bilder, Text und Office-Dokumente (Videos ausgeschlossen)
* Vorschau für Bilder, Dateiliste mit Größe
* Entfernen einzelner Dateien / Leeren der Liste
* Mock "Senden" erzeugt `FormData` und zeigt dies an (kein echtes Backend)

### Flashcards
* Karten erstellen, bearbeiten, löschen
* Lernstufen: `neu`, `nicht_sicher`, `kann_ich`
* Swipe-Interface im Lernmodus (Links = neu, Rechts = kann ich; Buttons für alle drei Stufen)
* Flip-Animation Frage/Antwort
* Statistik (Gesamt + pro Stufe + Wiederholungszähler)
* CSV-Export (Anki-kompatibles Semikolon-Format)
* Test-Datenset zum schnellen Start (`Testdaten laden`)

## Installation & Start

```bash
npm install
npm run dev
```

Öffne dann `http://localhost:5173`.

## Nutzung

Navigation oben: `Projekte` / `Flashcards`.

### Projekte & Upload
1. Start auf Projekte-Seite.
2. Dateien in die Zone ziehen oder klicken auf "durchsuchen".
3. Unerlaubte Typen (Video) werden abgewiesen und im Fehlerblock angezeigt.
4. Senden (Mock) erstellt eine `FormData`. (Konsole ansehen)

### Flashcards
1. Testdaten laden oder neue Karte hinzufügen.
2. Lernen starten: Karte flippen (Klick) oder Bewertung durch Buttons / Swipe.
3. Export speichert `anki-export.csv`.

## Datenformat (Flashcard)

```ts
{
	id: number,
	front: string,
	back: string,
	level: 'neu' | 'nicht_sicher' | 'kann_ich',
	reviewCount: number,
	createdAt: number,
	lastReviewed: number | null
}
```

## Erweiterungen / Ideen
* Echten Upload-Endpunkt anbinden
* .apkg Export (Anki Paket) via externem Tool
* Spaced-Repetition-Algorithmus (SM-2) implementieren
* Tagging & Suche für Karten

## Lizenz
Internal educational prototype. Keine Garantie.

