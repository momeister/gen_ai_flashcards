import { useState, useEffect, useRef } from 'react';
import FlashcardEditor from './FlashcardEditor';
import FlashcardStudy from './FlashcardStudy';
// Test flashcards import removed
import { motion, AnimatePresence } from 'framer-motion';
import { flashcardsAPI, uploadsAPI } from '../../utils/api';
import DocumentViewer from '../DocumentViewer';
import confetti from 'canvas-confetti';

export default function FlashcardDeck({ projectId }) {
  const [cards, setCards] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [overview, setOverview] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | new | unsure | know_it
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [studyFilter, setStudyFilter] = useState('all'); // all | new | unsure | know_it | important
  // Generation controls
  const [generationCount, setGenerationCount] = useState(10);
  const [draftSets, setDraftSets] = useState([]);
  const [files, setFiles] = useState([]);
  const [viewerFile, setViewerFile] = useState(null);
  // Drag and drop state
  const [draggedCard, setDraggedCard] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);
  const cardRefs = useRef({});

  // Global pointer tracking for swap-only dragging
  useEffect(() => {
    if (!draggedCard) return;
    const handleMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      let target = null;
      for (const [id, el] of Object.entries(cardRefs.current)) {
        if (!el || id === String(draggedCard)) continue;
        const rect = el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          target = id;
          break;
        }
      }
      setHoverTarget(target);
    };
    const handleUp = () => {
      if (hoverTarget && hoverTarget !== draggedCard) {
        setCards(prev => {
          const i1 = prev.findIndex(c => c.id === draggedCard);
          const i2 = prev.findIndex(c => c.id === hoverTarget);
          if (i1 === -1 || i2 === -1) return prev;
          const next = [...prev];
          [next[i1], next[i2]] = [next[i2], next[i1]];
          return next;
        });
      }
      setDraggedCard(null);
      setHoverTarget(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggedCard, hoverTarget, setCards]);

  useEffect(()=>{
    // Load flashcards from backend
    const load = async () => {
      try {
        const backendCards = await flashcardsAPI.getByProject(projectId);
        const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
        setCards(mapped);
      } catch (e) {
        console.warn('Cards could not be loaded', e);
        setCards([]);
      }
      try {
        const backendFiles = await uploadsAPI.getFiles(projectId);
        const mappedFiles = backendFiles.map(f => ({ id: f.id, name: f.original_filename, size: f.size, type: f.mime_type, category: f.category || 'lecture_notes', previewUrl: uploadsAPI.rawFileUrl(f.id) }));
        setFiles(mappedFiles);
      } catch (e) {
        console.warn('Files could not be loaded', e);
        setFiles([]);
      }
    };
    load();
  }, [projectId]);

  const levelMap = { new: 0, unsure: 1, know_it: 2 };
  const levelFromNumber = (n) => Object.entries(levelMap).find(([,v])=>v===n)?.[0] || 'new';
  const levelColors = {
    new: 'border-cyan-500',
    unsure: 'border-amber-500',
    know_it: 'border-green-500',
  };
  const levelGradients = {
    new: 'from-cyan-500 via-cyan-300 to-transparent',
    unsure: 'from-amber-500 via-amber-300 to-transparent',
    know_it: 'from-green-500 via-green-300 to-transparent',
  };
  const levelBadgeColors = {
    new: 'border-cyan-500/40 text-cyan-600 bg-cyan-500/10',
    unsure: 'border-amber-500/40 text-amber-600 bg-amber-500/10',
    know_it: 'border-green-500/40 text-green-600 bg-green-500/10',
  };

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (card) => { setEditing(card); setEditorOpen(true); };
  const saveCard = async (data) => {
    try {
      if (editing) {
        await flashcardsAPI.update(projectId, editing.id, { question: data.front, answer: data.back });
      } else {
        const created = await flashcardsAPI.create(projectId, { question: data.front, answer: data.back, level: levelMap['new'] });
      }
      const backendCards = await flashcardsAPI.getByProject(projectId);
      const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
      setCards(mapped);
    } catch (e) {
      alert('Save failed: ' + (e.message || 'Unknown'));
    }
    setEditorOpen(false);
  };

  const deleteCard = async (id) => {
    if (!confirm('Delete card permanently?')) return;
    try {
      await flashcardsAPI.delete(projectId, id);
      const backendCards = await flashcardsAPI.getByProject(projectId);
      const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
      setCards(mapped);
    } catch (e) {
      alert('Delete failed: ' + (e.message || 'Unknown'));
    }
  };

  const updateLevel = async (id, level) => {
    const card = cards.find(c => c.id === id);
    const newReviewCount = (card?.reviewCount || 0) + 1;
    try {
      await flashcardsAPI.updateLevel(projectId, id, levelMap[level] ?? 0);
      const backendCards = await flashcardsAPI.getByProject(projectId);
      const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
      setCards(mapped);
    } catch (e) {
      console.warn('Level update failed', e);
    }
  };

  const exportCSV = () => {
    if (!cards.length) return alert('No cards available');
    const rows = cards.map(c => [c.front.replace(/"/g,'""'), c.back.replace(/"/g,'""'), c.level, c.reviewCount]);
    let csv = '"Front";"Back";"Level";"ReviewCount"\n' + rows.map(r => r.map(f=>`"${f}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'anki-export.csv';
    a.click();

    // 🎉 Confetti celebration!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
    });
  };

  // loadTest removed per request

  const handleDropFiles = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    try {
      await uploadsAPI.upload(projectId, dropped, 'lecture_notes');
      const backendFiles = await uploadsAPI.getFiles(projectId);
      const mappedFiles = backendFiles.map(f => ({ id: f.id, name: f.original_filename, size: f.size, type: f.mime_type, category: f.category || 'lecture_notes', previewUrl: uploadsAPI.rawFileUrl(f.id) }));
      setFiles(mappedFiles);
      // success alert removed
    } catch (e) {
      console.warn('File upload failed', e);
    }
  };

  const stats = {
    total: cards.length,
    neu: cards.filter(c=>c.level==='new').length,
    unsicher: cards.filter(c=>c.level==='unsure').length,
    kann: cards.filter(c=>c.level==='know_it').length,
    important: cards.filter(c=>c.important).length,
  };

  // Derived list based on search + filter
  const filtered = cards.filter(c => {
    if (filter !== 'all' && c.level !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paged = filtered.slice((clampedPage-1)*pageSize, clampedPage*pageSize);

  // Study subset by filter
  const studyCards = cards.filter(c => {
    if (studyFilter==='all') return true;
    if (studyFilter==='important') return !!c.important;
    return c.level === studyFilter;
  });

  // Lock body scroll when study is open to prevent underlying page from showing
  useEffect(() => {
    if (!overview) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [overview]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">Flashcards</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Create, study, export – with animated swipe.</p>
      </div>
      {/* Button Section - Logical grouping */}
      <div className="flex flex-wrap gap-4 justify-center items-center">
        {/* 1. Create new card */}
        <motion.button 
          whileHover={{scale:1.05, y:-2}} 
          whileTap={{scale:0.95}} 
          onClick={openNew} 
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Karte
        </motion.button>

        {/* 2. Generate cards from files */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-variant border-2 border-token hover:border-accent transition-colors">
          <label className="text-sm font-medium text-on-surface">Anzahl:</label>
          <input
            type="number"
            min={1}
            max={500}
            value={generationCount}
            onChange={e=>setGenerationCount(Math.max(1, Math.min(500, parseInt(e.target.value||'1'))))}
            className="w-16 px-2 py-1 text-center bg-card border border-token rounded text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <motion.button 
            whileHover={{scale:1.05}} 
            whileTap={{scale:0.95}} 
            onClick={async ()=>{
              if (cards.length) setDraftSets(prev => [{ timestamp: Date.now(), count: cards.length, cards }, ...prev].slice(0, 10));
              try {
                const backendCards = await flashcardsAPI.getByProject(projectId);
                const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
                setCards(mapped);
              } catch (e) { console.warn('Generate failed', e); }
            }} 
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generieren
          </motion.button>
        </div>

        {/* 3. Study mode */}
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{scale:1.05, boxShadow:'0 10px 30px rgba(34,197,94,0.3)'}} 
            whileTap={{scale:0.95}} 
            onClick={()=>setOverview(false)} 
            disabled={!studyCards.length} 
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-zinc-300 disabled:to-zinc-400 dark:disabled:from-zinc-700 dark:disabled:to-zinc-800 disabled:text-zinc-500 text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lernen ({studyCards.length})
          </motion.button>
          <select 
            value={studyFilter} 
            onChange={e=>setStudyFilter(e.target.value)} 
            className="px-4 py-2.5 rounded-lg bg-surface-variant border-2 border-token text-on-surface font-medium hover:border-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">Alle</option>
            <option value="new">Neu</option>
            <option value="unsure">Unsicher</option>
            <option value="know_it">Kann ich</option>
            <option value="important">⭐ Wichtig</option>
          </select>
        </div>

        {/* 4. Export */}
        <motion.button 
          whileHover={{scale:1.05, y:-2}} 
          whileTap={{scale:0.95}} 
          onClick={exportCSV} 
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </motion.button>
      </div>

      {/* Search, Tabs and Page size */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-surface-variant border border-token rounded-xl p-3">
        <div className="flex items-center gap-2">
          <input value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} placeholder="Search…" className="px-3 py-2 rounded-lg bg-card border border-token text-on-surface w-48 sm:w-64 focus:outline-none focus:ring-2" style={{ outlineColor:'hsl(var(--accent))' }} />
          <div className="hidden sm:flex items-center gap-1">
            {['all','new','unsure','know_it'].map(t => (
              <button key={t} onClick={()=>{ setFilter(t); setPage(1); }} className={`chip ${filter===t?'bg-[hsl(var(--accent-50))]':''}`}>{t==='all'?'All':t.replace('_',' ')}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-muted">Per Page</label>
          <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value)); setPage(1); }} className="px-2 py-1 rounded bg-card border border-token text-on-surface">
            {[8,16,32].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Total<br /><span className="text-cyan-500 dark:text-cyan-400 font-semibold text-2xl">{stats.total}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">New<br /><span className="text-cyan-500 dark:text-cyan-400 font-semibold text-2xl">{stats.neu}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Unsure<br /><span className="text-yellow-500 dark:text-yellow-400 font-semibold text-2xl">{stats.unsicher}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Know It<br /><span className="text-green-500 dark:text-green-400 font-semibold text-2xl">{stats.kann}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Important<br /><span className="text-yellow-500 dark:text-yellow-300 font-semibold text-2xl">{stats.important}</span></motion.div>
      </div>
      {/* Overview list – Polaroid cards */}
      {overview && filtered.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-400 dark:text-zinc-500">No cards yet. Create one or load test data.</div>
      ) : overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {paged.map((card, idx) => {
              const rot = (idx % 3 === 0) ? 1.5 : (idx % 3 === 1) ? -1 : 0.5;
              const cardLevelColor = levelColors[card.level] || levelColors['new'];
              const cardBadgeColor = levelBadgeColors[card.level] || levelBadgeColors['new'];
              const cardGradient = levelGradients[card.level] || levelGradients['new'];
              const isDragging = draggedCard === card.id;
              const isHoverTarget = hoverTarget === String(card.id);
              return (
                <motion.div 
                  ref={(el) => { if (el) cardRefs.current[card.id] = el; }}
                  key={card.id} 
                  layout 
                  onPointerDown={(e) => { e.preventDefault(); setDraggedCard(card.id); }}
                  initial={{opacity:0, y:20, rotate:rot}} 
                  animate={{
                    opacity: isDragging ? 0.85 : 1,
                    y: 0, 
                    rotate: isDragging ? 0 : rot,
                    scale: isHoverTarget ? 0.97 : 1,
                  }} 
                  exit={{opacity:0,scale:0.8, rotate:0}}
                  whileHover={{scale:1.03, rotate:0, y:-4, boxShadow:'0 20px 40px rgba(0,0,0,0.3)'}}
                  className={`relative p-5 pb-8 rounded-lg bg-card shadow-xl transition-all overflow-hidden select-none ${draggedCard? 'cursor-grabbing' : 'cursor-grab'} ${isHoverTarget ? 'ring-4 ring-[hsl(var(--accent))]/40' : ''}`}
                  style={{ transformStyle:'preserve-3d' }}
                >
                  {/* Gradient border effect */}
                  <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${cardGradient} opacity-60`} style={{ padding: '8px', zIndex: -1 }}>
                    <div className="w-full h-full bg-card rounded-lg" />
                  </div>
                  <div className={`absolute inset-0 rounded-lg border-4 ${cardLevelColor} opacity-40`} />
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${cardBadgeColor}`}>{card.level.replace('_', ' ')}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">↻ {card.reviewCount}</span>
                      </div>
                      <p className="text-sm text-on-surface whitespace-pre-wrap"><strong>Question:</strong> {card.front}</p>
                      <p className="text-sm text-on-muted whitespace-pre-wrap mt-2"><strong>Answer:</strong> {card.back}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <motion.button whileHover={{scale:1.1, rotate:0}} whileTap={{scale:0.9}} onClick={async ()=>{
                        const newImportant = card.important ? 0 : 1;
                        console.log('[DEBUG] Toggling important:', { cardId: card.id, current: card.important, new: newImportant });
                        try {
                          const result = await flashcardsAPI.update(projectId, card.id, { important: newImportant });
                          console.log('[DEBUG] Update result:', result);
                          const backendCards = await flashcardsAPI.getByProject(projectId);
                          const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
                          setCards(mapped);
                        } catch (e) {
                          console.error('[ERROR] Important toggle failed', e);
                          alert('Error saving: ' + (e.message || 'Unknown'));
                        }
                      }} className={`p-2 rounded-lg transition-colors ${card.important?'bg-yellow-500 text-white hover:bg-yellow-600':'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`} title="Important">
                        ⭐
                      </motion.button>
                      <motion.button whileHover={{scale:1.1, rotate:5}} whileTap={{scale:0.9}} onClick={()=>openEdit(card)} className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-cyan-100 dark:hover:bg-cyan-900 text-cyan-600 dark:text-cyan-300 transition-colors" title="Edit">✏️</motion.button>
                      <motion.button whileHover={{scale:1.1, rotate:-5}} whileTap={{scale:0.9}} onClick={()=>deleteCard(card.id)} className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 transition-colors" title="Delete">🗑️</motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : null}

      {/* Pagination controls */}
      {overview && filtered.length > 0 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn" onClick={()=> setPage(p=>Math.max(1, p-1))} disabled={clampedPage===1} style={{ background:'hsl(var(--surface-variant))' }}>←</button>
          <span className="text-on-muted text-sm">Page {clampedPage} / {totalPages}</span>
          <button className="btn" onClick={()=> setPage(p=>Math.min(totalPages, p+1))} disabled={clampedPage===totalPages} style={{ background:'hsl(var(--surface-variant))' }}>→</button>
        </div>
      )}

      {editorOpen && (
        <FlashcardEditor card={editing} onSave={saveCard} onCancel={()=>setEditorOpen(false)} />
      )}
      {!overview && (
        <FlashcardStudy 
          cards={studyCards} 
          onUpdateLevel={updateLevel} 
          onExit={()=>setOverview(true)} 
          onEditCurrent={openEdit}
          onDeleteCurrent={(c)=>deleteCard(c.id)}
        />
      )}

      {/* Dual upload areas side-by-side in flashcard mode */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <motion.div 
          onDragOver={(e)=>e.preventDefault()} 
          onDrop={handleDropFiles}
          whileHover={{scale:1.02, borderColor:'hsl(var(--accent))'}}
          className="p-6 rounded-xl border-2 border-dashed border-cyan-500/40 text-center text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/30"
        >
          📚 Drop Lecture Notes here
        </motion.div>
        <motion.div 
          onDragOver={(e)=>e.preventDefault()} 
          onDrop={async (e)=>{ e.preventDefault(); const dropped = Array.from(e.dataTransfer.files); if (!dropped.length) return; try { await uploadsAPI.upload(projectId, dropped, 'extended_info'); const backendFiles = await uploadsAPI.getFiles(projectId); const mappedFiles = backendFiles.map(f => ({ id: f.id, name: f.original_filename, size: f.size, type: f.mime_type, category: f.category || 'lecture_notes', previewUrl: uploadsAPI.rawFileUrl(f.id) })); setFiles(mappedFiles);} catch(er){ console.warn('File upload failed', er);} }}
          whileHover={{scale:1.02, borderColor:'hsl(var(--accent))'}}
          className="p-6 rounded-xl border-2 border-dashed border-purple-500/40 text-center text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/30"
        >
          📖 Drop Extended Information here
        </motion.div>
      </div>

      {/* Files list - Sources side-by-side */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold" style={{ color:'hsl(var(--accent))' }}>Sources</h3>
        {files.length === 0 ? (
          <div className="text-on-muted text-sm">No files added yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lecture Notes column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">📚 Lecture Notes</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">({files.filter(f=>f.category==='lecture_notes').length})</span>
              </div>
              <div className="space-y-3">
                {files.filter(f => f.category === 'lecture_notes').map(f => (
                  <div key={f.id} className="p-4 rounded-lg bg-card border border-cyan-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {f.type?.startsWith('image/') ? (
                        <img src={f.previewUrl} alt="thumb" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-xs">📄</div>
                      )}
                      <div className="truncate">
                        <div className="text-sm truncate">{f.name}</div>
                        <div className="text-xs text-on-muted">{Math.round((f.size||0)/1024)} KB</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn" style={{ background:'hsl(var(--surface-variant))' }} onClick={()=>setViewerFile(f)}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Extended Information column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">📖 Extended Information</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">({files.filter(f=>f.category==='extended_info').length})</span>
              </div>
              <div className="space-y-3">
                {files.filter(f => f.category === 'extended_info').map(f => (
                  <div key={f.id} className="p-4 rounded-lg bg-card border border-purple-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {f.type?.startsWith('image/') ? (
                        <img src={f.previewUrl} alt="thumb" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs">📚</div>
                      )}
                      <div className="truncate">
                        <div className="text-sm truncate">{f.name}</div>
                        <div className="text-xs text-on-muted">{Math.round((f.size||0)/1024)} KB</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn" style={{ background:'hsl(var(--surface-variant))' }} onClick={()=>setViewerFile(f)}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {viewerFile && (
        <DocumentViewer projectId={projectId} file={viewerFile} onClose={()=>setViewerFile(null)} />
      )}

      {/* Drafts panel */}
      {draftSets.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold" style={{ color:'hsl(var(--accent))' }}>Drafts</h3>
          <div className="space-y-2 mt-2">
            {draftSets.map((d, i) => (
              <div key={d.timestamp} className="flex items-center justify-between p-3 rounded border border-token bg-card">
                <div className="text-sm text-on-surface">Set {draftSets.length - i} • {d.count} cards • {new Date(d.timestamp).toLocaleString()}</div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary" onClick={()=>setCards(d.cards)}>Restore</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
