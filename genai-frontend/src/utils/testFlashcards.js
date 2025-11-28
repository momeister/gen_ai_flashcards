// Test-Set mit Lernkarten für verschiedene Themen
export const testFlashcards = [
  // Geographie
  {
    id: 1,
    front: "Was ist die Hauptstadt von Deutschland?",
    back: "Berlin",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    front: "Welcher ist der längste Fluss Europas?",
    back: "Die Wolga (3.530 km)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    front: "Wie viele Kontinente gibt es auf der Erde?",
    back: "7 Kontinente: Afrika, Antarktika, Asien, Australien, Europa, Nordamerika, Südamerika",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },

  // Mathematik
  {
    id: 4,
    front: "Was ist die Formel für den Flächeninhalt eines Kreises?",
    back: "A = π × r²\n(r = Radius)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    front: "Was ist der Satz des Pythagoras?",
    back: "a² + b² = c²\n(In einem rechtwinkligen Dreieck ist die Summe der Quadrate der Katheten gleich dem Quadrat der Hypotenuse)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 6,
    front: "Was ist die Ableitung von f(x) = x³?",
    back: "f'(x) = 3x²",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },

  // Programmierung
  {
    id: 7,
    front: "Was ist der Unterschied zwischen '==' und '===' in JavaScript?",
    back: "'==' vergleicht nur den Wert (mit Typkonvertierung)\n'===' vergleicht Wert UND Typ (strict equality)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 8,
    front: "Was ist ein React Hook?",
    back: "Hooks sind Funktionen, die es ermöglichen, React-Features wie State und Lifecycle-Methoden in funktionalen Komponenten zu nutzen.\nBeispiele: useState, useEffect, useContext",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 9,
    front: "Was bedeutet 'Big O Notation'?",
    back: "Big O Notation beschreibt die Zeitkomplexität eines Algorithmus - wie sich die Laufzeit mit wachsender Eingabegröße verhält.\nBeispiele: O(1), O(n), O(n²), O(log n)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },

  // Geschichte
  {
    id: 10,
    front: "In welchem Jahr fiel die Berliner Mauer?",
    back: "1989 (9. November 1989)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 11,
    front: "Wer war der erste Mensch im Weltall?",
    back: "Juri Gagarin (sowjetischer Kosmonaut, 12. April 1961)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },

  // Wissenschaft
  {
    id: 12,
    front: "Was ist die Lichtgeschwindigkeit im Vakuum?",
    back: "c ≈ 299.792.458 m/s\n(circa 300.000 km/s)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 13,
    front: "Was besagt das erste Newtonsche Gesetz (Trägheitsgesetz)?",
    back: "Ein Körper verharrt im Zustand der Ruhe oder der gleichförmigen geradlinigen Bewegung, solange keine äußere Kraft auf ihn wirkt.",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 14,
    front: "Wie viele Elemente gibt es im Periodensystem?",
    back: "118 bestätigte chemische Elemente (Stand 2024)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },

  // Sprachen
  {
    id: 15,
    front: "Wie heißt 'Hallo' auf Japanisch?",
    back: "こんにちは (Konnichiwa)",
    level: "neu",
    lastReviewed: null,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  },
];

// Funktion zum Laden der Testkarten
export const loadTestFlashcards = () => {
  const existing = localStorage.getItem('flashcards');
  if (!existing || JSON.parse(existing).length === 0) {
    localStorage.setItem('flashcards', JSON.stringify(testFlashcards));
    return testFlashcards;
  }
  return JSON.parse(existing);
};
