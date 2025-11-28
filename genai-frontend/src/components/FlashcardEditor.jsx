import { useState, useEffect } from 'react';

const FlashcardEditor = ({ card, onSave, onClose }) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  useEffect(() => {
    if (card) {
      setFront(card.front || '');
      setBack(card.back || '');
    }
  }, [card]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      alert('Bitte füllen Sie beide Felder aus');
      return;
    }
    onSave({ front: front.trim(), back: back.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 rounded-lg shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold text-cyan-400">
            {card ? 'Karte bearbeiten' : 'Neue Karte erstellen'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Front (Question) */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Vorderseite (Frage)
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              rows="4"
              placeholder="Was ist die Hauptstadt von Deutschland?"
              required
            />
          </div>

          {/* Back (Answer) */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Rückseite (Antwort)
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              rows="4"
              placeholder="Berlin"
              required
            />
          </div>

          {/* Preview */}
          {(front || back) && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">Vorschau:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-cyan-400 mb-1">Frage:</div>
                  <div className="text-zinc-200 text-sm whitespace-pre-wrap">
                    {front || '...'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cyan-400 mb-1">Antwort:</div>
                  <div className="text-zinc-200 text-sm whitespace-pre-wrap">
                    {back || '...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              {card ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlashcardEditor;
