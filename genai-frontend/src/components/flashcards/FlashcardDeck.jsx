import { useState, useEffect } from 'react';
import FlashcardEditor from './FlashcardEditor';
import FlashcardStudy from './FlashcardStudy';
import { loadTestFlashcards } from '../../data/testFlashcards';
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
  const [filter, setFilter] = useState('all'); // all | neu | nicht_sicher | kann_ich
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [studyFilter, setStudyFilter] = useState('all'); // all | neu | nicht_sicher | kann_ich | important
  const [files, setFiles] = useState([]);
  const [viewerFile, setViewerFile] = useState(null);

  useEffect(()=>{
    // Load flashcards from backend
    const load = async () => {
      try {
        const backendCards = await flashcardsAPI.getByProject(projectId);
        const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
        setCards(mapped);
      } catch (e) {
        console.warn('Karten konnten nicht geladen werden', e);
        setCards([]);
      }
      try {
        const backendFiles = await uploadsAPI.getFiles(projectId);
        const mappedFiles = backendFiles.map(f => ({ id: f.id, name: f.original_filename, size: f.size, type: f.mime_type, previewUrl: uploadsAPI.rawFileUrl(f.id) }));
        setFiles(mappedFiles);
      } catch (e) {
        console.warn('Dateien konnten nicht geladen werden', e);
        setFiles([]);
      }
    };
    load();
  }, [projectId]);

  const levelMap = { neu: 0, nicht_sicher: 1, kann_ich: 2 };
  const levelFromNumber = (n) => Object.entries(levelMap).find(([,v])=>v===n)?.[0] || 'neu';

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (card) => { setEditing(card); setEditorOpen(true); };
  const saveCard = async (data) => {
    try {
      if (editing) {
        await flashcardsAPI.update(projectId, editing.id, { question: data.front, answer: data.back });
      } else {
        const created = await flashcardsAPI.create(projectId, { question: data.front, answer: data.back, level: levelMap['neu'] });
      }
      const backendCards = await flashcardsAPI.getByProject(projectId);
      const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
      setCards(mapped);
    } catch (e) {
      alert('Speichern fehlgeschlagen: ' + (e.message || 'Unbekannt'));
    }
    setEditorOpen(false);
  };

  const deleteCard = async (id) => {
    if (!confirm('Karte wirklich löschen?')) return;
    try {
      await flashcardsAPI.delete(projectId, id);
      const backendCards = await flashcardsAPI.getByProject(projectId);
      const mapped = backendCards.map(c => ({ id: c.id, front: c.question, back: c.answer, level: levelFromNumber(c.level), reviewCount: c.review_count || 0, createdAt: Date.now(), lastReviewed: null, important: !!(c.important) }));
      setCards(mapped);
    } catch (e) {
      alert('Löschen fehlgeschlagen: ' + (e.message || 'Unbekannt'));
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
      console.warn('Level Update fehlgeschlagen', e);
    }
  };

  const exportCSV = () => {
    if (!cards.length) return alert('Keine Karten vorhanden');
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

  const loadTest = () => {
    const loaded = loadTestFlashcards();
    setCards(loaded);
    upsertFlashcards(projectId, () => loaded);
    alert(`${loaded.length} Testkarten geladen.`);
  };

  const handleDropFiles = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    try {
      await uploadsAPI.upload(projectId, dropped);
      const backendFiles = await uploadsAPI.getFiles(projectId);
      const mappedFiles = backendFiles.map(f => ({ id: f.id, name: f.original_filename, size: f.size, type: f.mime_type, previewUrl: uploadsAPI.rawFileUrl(f.id) }));
      setFiles(mappedFiles);
      alert(`${dropped.length} Datei(en) hochgeladen.`);
    } catch (e) {
      alert('Datei-Upload fehlgeschlagen: ' + (e.message || 'Unbekannt'));
    }
  };

  const stats = {
    total: cards.length,
    neu: cards.filter(c=>c.level==='neu').length,
    unsicher: cards.filter(c=>c.level==='nicht_sicher').length,
    kann: cards.filter(c=>c.level==='kann_ich').length,
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
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">Lernkarten</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Erstelle, lerne, exportiere – mit animiertem Swipe.</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center">
        <motion.button whileHover={{scale:1.05, y:-2}} whileTap={{scale:0.95}} onClick={openNew} className="btn btn-primary">+ Neue Karte</motion.button>
        
        {/* PROMINENT Learn Button */}
        <motion.button 
          whileHover={{scale:1.1, y:-4, boxShadow:'0 20px 40px rgba(34,197,94,0.4)'}} 
          whileTap={{scale:0.98}} 
          onClick={()=>setOverview(false)} 
          disabled={!studyCards.length} 
          className="relative px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:from-zinc-300 disabled:to-zinc-400 dark:disabled:from-zinc-700 dark:disabled:to-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-400 text-white text-base sm:text-lg font-bold shadow-2xl transition-all overflow-hidden group"
        >
          <span className="relative z-10 flex items-center gap-2">
            🎯 Lernen starten
            <span className="text-xs sm:text-sm font-normal opacity-80">({studyCards.length})</span>
          </span>
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-yellow-300/30 to-green-300/30 opacity-0 group-hover:opacity-100 transition-opacity"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.button>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-muted">Lernmenge</label>
          <select value={studyFilter} onChange={e=>setStudyFilter(e.target.value)} className="px-2 py-1 rounded bg-card border border-token text-on-surface">
            <option value="all">Alle</option>
            <option value="neu">Nur Neu</option>
            <option value="nicht_sicher">Nur Nicht sicher</option>
            <option value="kann_ich">Nur Kann ich</option>
            <option value="important">Nur Wichtig ⭐</option>
          </select>
        </div>
        <motion.button whileHover={{scale:1.05, y:-2}} whileTap={{scale:0.95}} onClick={exportCSV} className="btn btn-secondary">📤 Export</motion.button>
        <motion.button whileHover={{scale:1.05, y:-2}} whileTap={{scale:0.95}} onClick={loadTest} className="btn" style={{ background:'hsl(var(--accent-100))', color:'hsl(var(--on-surface))' }}>🧪 Test</motion.button>
      </div>

      {/* Search, Tabs and Page size */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-surface-variant border border-token rounded-xl p-3">
        <div className="flex items-center gap-2">
          <input value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} placeholder="Suchen…" className="px-3 py-2 rounded-lg bg-card border border-token text-on-surface w-48 sm:w-64 focus:outline-none focus:ring-2" style={{ outlineColor:'hsl(var(--accent))' }} />
          <div className="hidden sm:flex items-center gap-1">
            {['all','neu','nicht_sicher','kann_ich'].map(t => (
              <button key={t} onClick={()=>{ setFilter(t); setPage(1); }} className={`chip ${filter===t?'bg-[hsl(var(--accent-50))]':''}`}>{t==='all'?'Alle':t.replace('_',' ')}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-muted">Pro Seite</label>
          <select value={pageSize} onChange={e=>{ setPageSize(parseInt(e.target.value)); setPage(1); }} className="px-2 py-1 rounded bg-card border border-token text-on-surface">
            {[8,16,32].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Gesamt<br /><span className="text-cyan-500 dark:text-cyan-400 font-semibold text-2xl">{stats.total}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Neu<br /><span className="text-cyan-500 dark:text-cyan-400 font-semibold text-2xl">{stats.neu}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Nicht sicher<br /><span className="text-yellow-500 dark:text-yellow-400 font-semibold text-2xl">{stats.unsicher}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Kann ich<br /><span className="text-green-500 dark:text-green-400 font-semibold text-2xl">{stats.kann}</span></motion.div>
        <motion.div whileHover={{scale:1.05, y:-2}} className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all">Wichtig<br /><span className="text-yellow-500 dark:text-yellow-300 font-semibold text-2xl">{stats.important}</span></motion.div>
      </div>
      {/* Overview list – Polaroid cards */}
      {overview && filtered.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-400 dark:text-zinc-500">Noch keine Karten. Erstelle eine oder lade Testdaten.</div>
      ) : overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {paged.map((card, idx) => {
              const rot = (idx % 3 === 0) ? 1.5 : (idx % 3 === 1) ? -1 : 0.5;
              return (
                <motion.div 
                  key={card.id} 
                  layout 
                  initial={{opacity:0, y:20, rotate:rot}} 
                  animate={{opacity:1,y:0, rotate:rot}} 
                  exit={{opacity:0,scale:0.8, rotate:0}}
                  whileHover={{scale:1.05, rotate:0, y:-8, boxShadow:'0 20px 40px rgba(0,0,0,0.3)'}}
                  className="p-5 pb-8 rounded-lg bg-card border-8 border-token shadow-xl transition-all"
                  style={{ transformStyle:'preserve-3d' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${card.level==='neu'?'border-cyan-500/40 text-cyan-500 bg-cyan-500/10':card.level==='nicht_sicher'?'border-yellow-500/40 text-yellow-500 bg-yellow-500/10':'border-green-500/40 text-green-500 bg-green-500/10'}`}>{card.level}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">↻ {card.reviewCount}</span>
                      </div>
                      <p className="text-sm text-on-surface whitespace-pre-wrap"><strong>Frage:</strong> {card.front}</p>
                      <p className="text-sm text-on-muted whitespace-pre-wrap mt-2"><strong>Antwort:</strong> {card.back}</p>
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
                          console.error('[ERROR] Important toggle fehlgeschlagen', e);
                          alert('Fehler beim Speichern: ' + (e.message || 'Unbekannt'));
                        }
                      }} className={`p-2 rounded-lg transition-colors ${card.important?'bg-yellow-500 text-white hover:bg-yellow-600':'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`} title="Wichtig">
                        ⭐
                      </motion.button>
                      <motion.button whileHover={{scale:1.1, rotate:5}} whileTap={{scale:0.9}} onClick={()=>openEdit(card)} className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-cyan-100 dark:hover:bg-cyan-900 text-cyan-600 dark:text-cyan-300 transition-colors" title="Bearbeiten">✏️</motion.button>
                      <motion.button whileHover={{scale:1.1, rotate:-5}} whileTap={{scale:0.9}} onClick={()=>deleteCard(card.id)} className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 transition-colors" title="Löschen">🗑️</motion.button>
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
          <span className="text-on-muted text-sm">Seite {clampedPage} / {totalPages}</span>
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

      {/* Inline drop area to add files to project */}
      <motion.div 
        onDragOver={(e)=>e.preventDefault()} 
        onDrop={handleDropFiles}
        whileHover={{scale:1.02, borderColor:'hsl(var(--accent))'}}
        className="mt-8 p-8 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-center text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30 transition-all"
      >
        📎 Dateien hier ablegen um sie diesem Projekt hinzuzufügen (Backend)
      </motion.div>

      {/* Files list */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2" style={{ color:'hsl(var(--accent))' }}>Dateien</h3>
        {files.length === 0 ? (
          <div className="text-on-muted text-sm">Noch keine Dateien hinzugefügt.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map(f => (
              <div key={f.id} className="p-4 rounded-lg bg-card border border-token flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {f.type?.startsWith('image/') ? (
                    <img src={f.previewUrl} alt="thumb" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-surface-variant flex items-center justify-center text-on-muted text-xs">{(f.type||'file').split('/').pop()}</div>
                  )}
                  <div className="truncate">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-xs text-on-muted">{Math.round((f.size||0)/1024)} KB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn" style={{ background:'hsl(var(--surface-variant))' }} onClick={()=>setViewerFile(f)}>Ansehen</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerFile && (
        <DocumentViewer projectId={projectId} file={viewerFile} onClose={()=>setViewerFile(null)} />
      )}
    </div>
  );
}
