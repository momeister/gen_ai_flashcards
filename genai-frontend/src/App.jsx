import { useState, useEffect } from 'react';
import './App.css';
import UploadZone from './components/UploadZone';
import FlashcardDeck from './components/flashcards/FlashcardDeck';
import Home from './components/Home';
import { applyPalette } from './utils/colors';

function App() {
  const [view, setView] = useState('home'); // 'home' | 'flashcards'
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [accentHue, setAccentHue] = useState(() => {
    const saved = localStorage.getItem('accentHue');
    return saved ? parseInt(saved) : 200;
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : true;
  });

  // Dark mode persistence and class toggle
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    // Re-apply palette to adjust surface tokens for light/dark
    applyPalette(accentHue);
  }, [darkMode]);

  // Material You color palette
  useEffect(() => {
    applyPalette(accentHue);
    localStorage.setItem('accentHue', String(accentHue));
  }, [accentHue]);

  return (
    <div className="min-h-screen bg-surface text-on-surface transition-colors duration-300">
      <nav className="sticky top-0 z-40 backdrop-blur bg-surface/90 border-b border-token transition-colors shadow-sm">
        <div className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold tracking-wide" style={{ color:'hsl(var(--accent))' }}>Study Portal</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={()=>setDarkMode(!darkMode)} className="p-2 text-xl sm:text-2xl rounded-lg hover:bg-surface-variant transition-all active:scale-95" title="Toggle Dark Mode" aria-label="Toggle theme">
              {darkMode ? '🌙' : '☀️'}
            </button>
            <button onClick={()=>{ setView('home'); setActiveProjectId(null); }} className={`btn ${view==='home'?'btn-primary':'bg-surface-variant'}`}>Projekte</button>
            <button onClick={()=>{ if(activeProjectId){ setView('flashcards'); } }} className={`btn ${view==='flashcards'?'btn-primary':'bg-surface-variant'} ${!activeProjectId?'opacity-50 cursor-not-allowed':''}`}>Flashcards</button>
          </div>
        </div>
      </nav>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {view === 'home' && (
          <Home onOpenProject={(pid)=>{ setActiveProjectId(pid); setView('flashcards'); }} accentHue={accentHue} onAccentHueChange={setAccentHue} />
        )}
        {view === 'flashcards' && activeProjectId && (
          <FlashcardDeck projectId={activeProjectId} />
        )}
      </main>
      <footer className="px-4 sm:px-6 py-4 sm:py-6 text-center text-xs text-on-muted border-t border-token transition-colors">Made with React, Tailwind & Framer Motion</footer>
    </div>
  )
}

export default App
