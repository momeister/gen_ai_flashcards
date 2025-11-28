import { useState, useEffect } from 'react';

const FlashcardStudy = ({ cards, onUpdate, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCount, setStudiedCount] = useState(0);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const handleRating = (level) => {
    // Update card with new level and review info
    onUpdate(currentCard.id, {
      level,
      lastReviewed: new Date().toISOString(),
      reviewCount: currentCard.reviewCount + 1,
    });

    setStudiedCount(studiedCount + 1);

    // Move to next card or close if done
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert(`Glückwunsch! Sie haben ${studiedCount + 1} Karten wiederholt.`);
      onClose();
    }
  };

  if (!currentCard) {
    return null;
  }

  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-zinc-900 rounded-lg shadow-2xl border border-zinc-800">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-cyan-400">Lernmodus</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
              <span>Fortschritt</span>
              <span>{currentIndex + 1} / {cards.length}</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="p-8">
          <div
            className={`relative bg-zinc-800/50 border-2 rounded-xl min-h-[300px] cursor-pointer transition-all duration-300 ${
              isFlipped ? 'border-green-500/50' : 'border-cyan-500/50'
            }`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className="text-center">
                <div className="text-sm text-zinc-500 mb-4">
                  {isFlipped ? 'Antwort' : 'Frage'}
                </div>
                <div className="text-2xl text-zinc-100 whitespace-pre-wrap">
                  {isFlipped ? currentCard.back : currentCard.front}
                </div>
              </div>

              {!isFlipped && (
                <div className="absolute bottom-4 text-sm text-zinc-500">
                  Klicken zum Umdrehen
                </div>
              )}
            </div>

            {/* Flip Indicator */}
            <div className="absolute top-4 right-4">
              <svg
                className={`w-6 h-6 transition-transform duration-300 ${
                  isFlipped ? 'rotate-180 text-green-400' : 'text-cyan-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>

          {/* Rating Buttons */}
          {isFlipped && (
            <div className="mt-8">
              <p className="text-center text-zinc-400 mb-4">
                Wie gut kannten Sie diese Antwort?
              </p>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleRating('neu')}
                  className="p-4 bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
                >
                  <div className="text-3xl mb-2">🆕</div>
                  <div className="font-semibold mb-1">Neu für mich</div>
                  <div className="text-xs opacity-75">Öfter wiederholen</div>
                </button>

                <button
                  onClick={() => handleRating('nicht_sicher')}
                  className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/20 hover:border-yellow-500/50 transition-all"
                >
                  <div className="text-3xl mb-2">🤔</div>
                  <div className="font-semibold mb-1">Nicht sicher</div>
                  <div className="text-xs opacity-75">Regelmäßig üben</div>
                </button>

                <button
                  onClick={() => handleRating('kann_ich')}
                  className="p-4 bg-green-500/10 border-2 border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 hover:border-green-500/50 transition-all"
                >
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-semibold mb-1">Kann ich</div>
                  <div className="text-xs opacity-75">Gut beherrscht</div>
                </button>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Hint */}
          <div className="mt-6 text-center text-xs text-zinc-600">
            💡 Tipp: Klicken Sie auf die Karte, um sie umzudrehen
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardStudy;
