// Test dataset for flashcards
export const testFlashcards = [
  { id: 1, front: 'Was ist die Hauptstadt von Frankreich?', back: 'Paris', level: 'neu', reviewCount: 0, createdAt: Date.now(), lastReviewed: null },
  { id: 2, front: 'React Hook zum lokalen Zustand?', back: 'useState()', level: 'neu', reviewCount: 0, createdAt: Date.now(), lastReviewed: null },
  { id: 3, front: 'Formel Kreisfläche?', back: 'A = π r^2', level: 'neu', reviewCount: 0, createdAt: Date.now(), lastReviewed: null },
  { id: 4, front: 'HTTP Status 404 bedeutet?', back: 'Not Found', level: 'neu', reviewCount: 0, createdAt: Date.now(), lastReviewed: null },
  { id: 5, front: 'Größter Planet im Sonnensystem?', back: 'Jupiter', level: 'neu', reviewCount: 0, createdAt: Date.now(), lastReviewed: null },
];

export function loadTestFlashcards() {
  const existing = JSON.parse(localStorage.getItem('flashcards') || '[]');
  if (existing.length === 0) {
    localStorage.setItem('flashcards', JSON.stringify(testFlashcards));
    return testFlashcards;
  }
  return existing;
}
