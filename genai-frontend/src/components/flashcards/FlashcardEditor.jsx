import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function FlashcardEditor({ card, onSave, onCancel }) {
  const [front, setFront] = useState(card?.front || '');
  const [back, setBack] = useState(card?.back || '');

  useEffect(()=>{
    setFront(card?.front || '');
    setBack(card?.back || '');
  }, [card]);

  const submit = (e) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return alert('Beide Seiten ausfüllen.');
    onSave({ front: front.trim(), back: back.trim() });
  };

  return (
  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm">
      <motion.div initial={{scale:0.9, opacity:0, y:40}} animate={{scale:1, opacity:1, y:0}} exit={{scale:0.9, opacity:0, y:40}}
        className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-8 pb-10 space-y-6 shadow-2xl">
        <h2 className="text-2xl font-semibold text-cyan-500 dark:text-cyan-400">{card ? 'Karte bearbeiten' : 'Neue Karte'}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-semibold">Frage</label>
            <textarea value={front} onChange={e=>setFront(e.target.value)} rows={4}
              className="mt-2 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 font-semibold">Antwort</label>
            <textarea value={back} onChange={e=>setBack(e.target.value)} rows={4}
              className="mt-2 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <motion.button whileHover={{scale:1.05, y:-2}} whileTap={{scale:0.95}} type="button" onClick={onCancel} className="px-5 py-2 text-sm rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-all shadow">Abbrechen</motion.button>
            <motion.button whileHover={{scale:1.05, y:-2}} whileTap={{scale:0.95}} type="submit" className="px-5 py-2 text-sm rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold shadow-lg transition-all">Speichern</motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
