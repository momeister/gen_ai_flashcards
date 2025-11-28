import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const levels = {
  neu: { label: 'Neu', color: 'bg-cyan-500/20 text-cyan-300' },
  nicht_sicher: { label: 'Nicht sicher', color: 'bg-yellow-500/20 text-yellow-300' },
  kann_ich: { label: 'Kann ich', color: 'bg-green-500/20 text-green-300' },
};

export default function FlashcardStudy({ cards, onUpdateLevel, onExit, onEditCurrent, onDeleteCurrent }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  // Progress tracking: level chosen per card in this session
  const [progress, setProgress] = useState(() => cards.map(c => ({ id: c.id, level: null })));
  const card = cards[index];
  const nextCard = cards[index + 1];
  const nextNextCard = cards[index + 2];

  const handleSwipeEnd = (_e, info) => {
    const { x = 0, y = 0 } = info.offset || {};
    if (x < -120) { // links => neu
      rate('neu');
    } else if (x > 120) { // rechts => kann_ich
      rate('kann_ich');
    } else if (y > 120) { // unten => nicht_sicher
      rate('nicht_sicher');
    }
  };

  const rate = (lvl) => {
    if (!card) return;
    // Update underlying card level via parent callback
    onUpdateLevel(card.id, lvl);
    // Update local progress color coding
    setProgress(prev => prev.map((p, i) => i === index ? { ...p, level: lvl } : p));
    setFlipped(false);
    // Advance unless we're at the end
    if (index + 1 < cards.length) {
      setIndex(i => i + 1);
    } else {
      onExit();
    }
  };

  const goBack = () => {
    if (index === 0) return;
    setIndex(i => i - 1);
    setFlipped(false);
  };

  const handleEdit = () => {
    setEditingCard(card);
    if (onEditCurrent) onEditCurrent(card);
  };

  // Keyboard shortcuts: arrows / A S D for rating, W to edit, ESC to exit, Space to flip, Backspace to go back
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'textarea' || tag === 'input' || e.target?.isContentEditable) return;
      if (!card) return;
      const key = e.key.toLowerCase();
      if (['arrowleft','a'].includes(key)) { e.preventDefault(); rate('neu'); }
      else if (['arrowdown','s'].includes(key)) { e.preventDefault(); rate('nicht_sicher'); }
      else if (['arrowright','d'].includes(key)) { e.preventDefault(); rate('kann_ich'); }
      else if (key === 'w') { e.preventDefault(); handleEdit(); }
      else if (key === ' ' || key === 'spacebar') { e.preventDefault(); setFlipped(f=>!f); }
      else if (key === 'backspace') { e.preventDefault(); goBack(); }
      else if (key === 'escape') { e.preventDefault(); onExit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, index]);

  if (!card) return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <div className="text-center space-y-4">
        <p className="text-zinc-200">Keine Karten zum Lernen.</p>
        <button onClick={onExit} className="px-4 py-2 rounded bg-zinc-700 text-zinc-200">Zurück</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface p-4 sm:p-6 transition-colors overflow-hidden">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-surface-variant">
        <div className="h-full" style={{ width: `${((index+1)/cards.length)*100}%`, background: 'hsl(var(--accent))', transition: 'width 160ms linear' }} />
      </div>
      {/* Top bar with counter and edit */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="px-2 sm:px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-bold shadow">{index+1}/{cards.length}</span>
          <motion.button
            whileHover={{scale:1.05, y:-2}}
            whileTap={{scale:0.95}}
            onClick={goBack}
            disabled={index===0}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-lg transition-all flex items-center gap-1 ${index===0?'bg-surface-variant text-on-muted cursor-not-allowed':'bg-surface-variant text-on-surface hover:brightness-110'}`}
          >
            ← Zurück
          </motion.button>
          <motion.button 
            whileHover={{scale:1.05, y:-2}} 
            whileTap={{scale:0.95}} 
            onClick={handleEdit} 
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm font-semibold shadow-lg transition-all flex items-center gap-1"
          >
            ✏️ <span className="hidden sm:inline">Bearbeiten</span>
          </motion.button>
          {onDeleteCurrent && (
            <motion.button
              whileHover={{scale:1.05, y:-2}}
              whileTap={{scale:0.95}}
              onClick={()=> onDeleteCurrent(card)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold shadow-lg transition-all flex items-center gap-1"
            >
              🗑️ <span className="hidden sm:inline">Löschen</span>
            </motion.button>
          )}
        </div>
        <motion.button 
          whileHover={{scale:1.15, rotate:90}} 
          whileTap={{scale:0.9}} 
          onClick={onExit} 
          className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-red-500 dark:hover:bg-red-600 text-zinc-700 dark:text-zinc-300 hover:text-white text-xl sm:text-2xl transition-all shadow"
          aria-label="Schließen"
        >
          ✕
        </motion.button>
      </div>

      {/* Card Stack with preview of next cards */}
      <div className="relative w-full max-w-sm sm:max-w-md" style={{ perspective: '1200px' }}>
        {/* Preview cards behind (stack effect) */}
        {nextNextCard && (
          <div className="absolute inset-0 w-full h-full rounded-2xl border-8 bg-card border-token shadow-xl opacity-30" style={{ transform: 'translateY(16px) scale(0.92) rotateX(2deg)', zIndex: 1, willChange:'transform, opacity' }} />
        )}
        {nextCard && (
          <div className="absolute inset-0 w-full h-full rounded-2xl border-8 bg-card border-token shadow-xl opacity-50" style={{ transform: 'translateY(8px) scale(0.96) rotateX(1deg)', zIndex: 2, willChange:'transform, opacity' }} />
        )}

        {/* Current card */}
        <AnimatePresence mode="wait">
          <motion.div key={card.id}
            className="relative w-full aspect-[3/4] max-h-[500px] rounded-2xl border-8 bg-card border-token shadow-2xl cursor-pointer select-none overflow-hidden"
            initial={{scale:0.95, opacity:0, y:10, rotate:-2, z:-50}}
            animate={{scale:1, opacity:1, y:0, rotate:0, z:0, transition:{duration:0.15}}}
            exit={{scale:0.9, opacity:0, x: -140, rotate:-8, z:-50, transition:{duration:0.12}}}
            onClick={()=>setFlipped(f=>!f)}
            style={{ transformStyle:'preserve-3d', zIndex: 10, willChange:'transform, opacity' }}
            whileHover={{y:-10, boxShadow:'0 30px 60px rgba(0,0,0,0.5)'}}
          >
          <motion.div
            drag
            dragConstraints={{ left:0, right:0, top:0, bottom:0 }}
            onDragEnd={handleSwipeEnd}
            className="flex-1 flex flex-col p-8 h-full"
            animate={{ rotateY: flipped ? 180 : 0, transition:{duration:0.25}}}
            style={{ transformStyle:'preserve-3d' }}
          >
            <div style={{ backfaceVisibility:'hidden' }} className="flex-1 flex flex-col">
              <h3 className="text-xs uppercase tracking-wide mb-3 font-bold" style={{ color: 'hsl(var(--secondary))' }}>Frage</h3>
              <p className="text-xl text-on-surface whitespace-pre-wrap flex-1">{card.front}</p>
              <p className="mt-auto text-xs text-on-muted">💡 Klick = Umdrehen • Swipe = Bewerten</p>
            </div>
            <div style={{ backfaceVisibility:'hidden', transform:'rotateY(180deg)' }} className="absolute inset-0 p-8 flex flex-col">
              <h3 className="text-xs uppercase tracking-wide mb-3 font-bold" style={{ color: 'hsl(var(--accent))' }}>Antwort</h3>
              <p className="text-xl text-on-surface whitespace-pre-wrap flex-1">{card.back}</p>
              <p className="mt-auto text-xs text-on-muted">↔ Swipe oder Buttons unten</p>
            </div>
          </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating buttons - mobile responsive */}
      <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-4 justify-center">
        <motion.button whileHover={{scale:1.1, y:-3}} whileTap={{scale:0.95}} onClick={()=>rate('neu')} className="btn" style={{ background:'hsl(var(--secondary))', color:'hsl(var(--on-secondary))' }}>← Neu</motion.button>
        <motion.button whileHover={{scale:1.1, y:-3}} whileTap={{scale:0.95}} onClick={()=>rate('nicht_sicher')} className="btn" style={{ background:'hsl(var(--warning))', color:'#fff' }}>↓ Mal gehört</motion.button>
        <motion.button whileHover={{scale:1.1, y:-3}} whileTap={{scale:0.95}} onClick={()=>rate('kann_ich')} className="btn" style={{ background:'hsl(var(--success))', color:'#fff' }}>→ Sicher</motion.button>
      </div>

      {/* Progress color map */}
      <div className="mt-5 w-full max-w-xl flex flex-col gap-2">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0,1fr))`, gap:'2px' }}>
          {progress.map((p,i) => {
            let bg = 'hsl(var(--surface-variant))';
            if (p.level === 'neu') bg = 'rgba(6,182,212,0.6)';
            if (p.level === 'nicht_sicher') bg = 'rgba(234,179,8,0.7)';
            if (p.level === 'kann_ich') bg = 'rgba(34,197,94,0.7)';
            const isCurrent = i === index;
            return (
              <div key={p.id} title={`${i+1}. ${p.level||'Offen'}`}
                className={`h-4 rounded-sm cursor-pointer ${isCurrent?'ring-2 ring-[hsl(var(--accent))]':''}`}
                style={{ background: bg }}
                onClick={()=>{ setIndex(i); setFlipped(false); }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-on-muted">
          <span>Farbcodierung: Neu = Cyan, Nicht sicher = Gelb, Kann ich = Grün</span>
          <span>Space: Flip • Backspace: Zurück</span>
        </div>
      </div>
    </div>
  );
}
