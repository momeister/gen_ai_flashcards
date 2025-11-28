import { useState, useEffect } from 'react';
import FlashcardEditor from './FlashcardEditor';
import FlashcardStudy from './FlashcardStudy';

const FlashcardManager = ({ onBack }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showStudy, setShowStudy] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  // Load flashcards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('flashcards');
    if (saved) {
      setFlashcards(JSON.parse(saved));
    }
  }, []);

  // Save flashcards to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('flashcards', JSON.stringify(flashcards));
  }, [flashcards]);

  const addFlashcard = (card) => {
    const newCard = {
      id: Date.now(),
      ...card,
      level: 'neu', // neu, nicht_sicher, kann_ich
      lastReviewed: null,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    setFlashcards([...flashcards, newCard]);
  };

  const updateFlashcard = (id, updatedCard) => {
    setFlashcards(flashcards.map(card => 
      card.id === id ? { ...card, ...updatedCard } : card
    ));
  };

  const deleteFlashcard = (id) => {
    if (confirm('Möchten Sie diese Karte wirklich löschen?')) {
      setFlashcards(flashcards.filter(card => card.id !== id));
    }
  };

  const exportToAnki = () => {
    // Create Anki-compatible CSV format
    let csv = 'Front;Back;Level;ReviewCount\n';
    flashcards.forEach(card => {
      const front = card.front.replace(/;/g, ',').replace(/\n/g, '<br>');
      const back = card.back.replace(/;/g, ',').replace(/\n/g, '<br>');
      csv += `"${front}";"${back}";"${card.level}";"${card.reviewCount}"\n`;
    });

    // Download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `anki-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingCard(null);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'kann_ich': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'nicht_sicher': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'neu': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
    }
  };

  const getLevelText = (level) => {
    switch (level) {
      case 'kann_ich': return 'Kann ich';
      case 'nicht_sicher': return 'Nicht sicher';
      case 'neu': return 'Neu für mich';
      default: return level;
    }
  };

  const getCardsToReview = () => {
    return flashcards.filter(card => card.level !== 'kann_ich' || card.reviewCount < 5);
  };

  return (
    <div className="min-h-screen bg-zinc-900 py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={onBack || (() => window.location.reload())}
            className="mb-6 flex items-center space-x-2 text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Zurück zur Hauptseite</span>
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">
              Anki Lernkarten System
            </h1>
            <p className="text-zinc-400">
              Erstellen, bearbeiten und lernen Sie mit Karteikarten
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={() => setShowEditor(true)}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-all shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Neue Karte erstellen</span>
              </div>
            </button>

            {flashcards.length > 0 && (
              <>
                <button
                  onClick={() => setShowStudy(true)}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Lernen starten ({getCardsToReview().length})</span>
                  </div>
                </button>

                <button
                  onClick={exportToAnki}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-all shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Nach Anki exportieren</span>
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Statistics */}
          {flashcards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-zinc-400 text-sm mb-1">Gesamt</div>
                <div className="text-3xl font-bold text-cyan-400">{flashcards.length}</div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-zinc-400 text-sm mb-1">Neu für mich</div>
                <div className="text-3xl font-bold text-cyan-400">
                  {flashcards.filter(c => c.level === 'neu').length}
                </div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-zinc-400 text-sm mb-1">Nicht sicher</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {flashcards.filter(c => c.level === 'nicht_sicher').length}
                </div>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-zinc-400 text-sm mb-1">Kann ich</div>
                <div className="text-3xl font-bold text-green-400">
                  {flashcards.filter(c => c.level === 'kann_ich').length}
                </div>
              </div>
            </div>
          )}

          {/* Flashcards List */}
          {flashcards.length === 0 ? (
            <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-12 text-center">
              <svg
                className="w-16 h-16 text-zinc-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-zinc-400 text-lg">
                Noch keine Lernkarten vorhanden
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Erstellen Sie Ihre erste Karte, um mit dem Lernen zu beginnen
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 text-xs rounded-full border ${getLevelColor(card.level)}`}>
                          {getLevelText(card.level)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Wiederholt: {card.reviewCount}x
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">Frage:</div>
                          <div className="text-zinc-200 whitespace-pre-wrap">{card.front}</div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">Antwort:</div>
                          <div className="text-zinc-300 whitespace-pre-wrap">{card.back}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEdit(card)}
                        className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteFlashcard(card.id)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="Löschen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <FlashcardEditor
          card={editingCard}
          onSave={(card) => {
            if (editingCard) {
              updateFlashcard(editingCard.id, card);
            } else {
              addFlashcard(card);
            }
            handleCloseEditor();
          }}
          onClose={handleCloseEditor}
        />
      )}

      {/* Study Modal */}
      {showStudy && (
        <FlashcardStudy
          cards={getCardsToReview()}
          onUpdate={updateFlashcard}
          onClose={() => setShowStudy(false)}
        />
      )}
    </div>
  );
};

export default FlashcardManager;
