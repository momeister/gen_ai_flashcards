import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import UploadZone from './UploadZone';
import { projectsAPI } from '../utils/api';

export default function Home({ onOpenProject, accentHue, onAccentHueChange }) {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default'); // default | name | cards | updated
  const [tab, setTab] = useState('all'); // all | pinned | recent
  const [presetCategory, setPresetCategory] = useState('all'); // all | cool | warm | vivid
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  const reload = async () => {
    try {
      const list = await projectsAPI.getAll();
      // sort by updated or title for now
      list.sort((a,b)=> a.title.localeCompare(b.title));
      setProjects(list);
    } catch (e) {
      console.warn('Could not load projects:', e);
      setProjects([]);
    }
  };

  useEffect(() => { reload(); }, []);

  const createNewProject = async () => {
    const name = prompt('Enter project name:');
    if (!name) return;
    const p = await projectsAPI.create({ title: name, description: '' });
    await reload();
    onOpenProject(p.id);
  };

  const handleDropNew = async (files) => {
    const name = prompt('Project name for upload:');
    if (!name) return;
    const p = await projectsAPI.create({ title: name, description: '' });
    await reload();
    alert(`${files.length} file(s) ready – please upload in the upload tile.`);
  };

  const PRESETS = [
    { name:'Ocean', hue:190, cat:'cool' },
    { name:'Sky', hue:210, cat:'cool' },
    { name:'Forest', hue:150, cat:'cool' },
    { name:'Grape', hue:270, cat:'cool' },
    { name:'Sunset', hue:20, cat:'warm' },
    { name:'Rose', hue:330, cat:'warm' },
    { name:'Amber', hue:45, cat:'warm' },
    { name:'Coral', hue:10, cat:'warm' },
    { name:'Vivid Lime', hue:95, cat:'vivid' },
    { name:'Electric', hue:250, cat:'vivid' },
  ];

  const visiblePresets = PRESETS.filter(p => presetCategory==='all' || p.cat===presetCategory);

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    // base sort
    list.sort((a,b)=> (b.pinned===true)-(a.pinned===true) || (a.order??0)-(b.order??0) || (b.updatedAt - a.updatedAt));
    // tabs
    if (tab==='pinned') list = list.filter(p=>p.pinned);
    if (tab==='recent') list = list.slice(0, 5);
    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p=> p.name.toLowerCase().includes(q));
    }
    // custom sort
    if (sortBy==='name') list.sort((a,b)=> a.name.localeCompare(b.name));
    if (sortBy==='cards') list.sort((a,b)=> (b.flashcards?.length||0) - (a.flashcards?.length||0));
    if (sortBy==='updated') list.sort((a,b)=> (b.updatedAt - a.updatedAt));
    return list;
  }, [projects, search, sortBy, tab]);

  return (
    <div ref={containerRef} className="space-y-8 sm:space-y-10">
      {/* Top: Title + Accent Hue Slider with Parallax */}
      <motion.div style={{ y, opacity }} className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Your Projects</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a project to continue learning – or create a new one.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-surface-variant border border-token transition-colors">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Accent Color</label>
          <input type="range" min="0" max="360" value={accentHue} onChange={(e)=>onAccentHueChange(parseInt(e.target.value))}
            className="w-28 sm:w-48 accent-[hsl(var(--accent))] hover:cursor-grab active:cursor-grabbing" />
          <motion.div 
            whileHover={{ scale:1.2, rotate:180 }} 
            transition={{ type:'spring', stiffness:200 }}
            className="w-8 h-8 rounded-full border-2 border-zinc-400 dark:border-zinc-600 shadow-lg" 
            style={{ backgroundColor:`hsl(${accentHue} 90% 50%)` }} 
          />
          <div className="hidden md:flex items-center gap-1 pl-2">
            <select value={presetCategory} onChange={e=>setPresetCategory(e.target.value)} className="px-2 py-1 rounded-lg bg-card border border-token text-on-surface text-xs">
              <option value="all">All</option>
              <option value="cool">Cool</option>
              <option value="warm">Warm</option>
              <option value="vivid">Vivid</option>
            </select>
            {visiblePresets.map(p => (
              <button key={p.name} onClick={()=>onAccentHueChange(p.hue)} className="px-2 py-1 rounded-lg text-xs border border-token hover:bg-surface" style={{ color:`hsl(${p.hue} 90% 40%)` }}>{p.name}</button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Grid: Projects + New Project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Projects list – Polaroid-Stil */}
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 justify-between bg-surface-variant border border-token rounded-xl p-3">
            <div className="flex items-center gap-2">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects…" className="px-3 py-2 rounded-lg bg-card border border-token text-on-surface w-48 sm:w-64" />
              <div className="hidden sm:flex items-center gap-1">
                {['all','pinned','recent'].map(t => (
                  <button key={t} onClick={()=>setTab(t)} className={`chip ${tab===t?'bg-[hsl(var(--accent-50))]':''}`}>{t==='all'?'All':t==='pinned'?'Pinned':'Recent'}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={reload} className="px-3 py-2 rounded bg-surface-variant border border-token text-xs">↻ Refresh</button>
            </div>
          </div>
          {filteredProjects.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 text-center">
              No projects yet. Create a new project on the right.
            </div>
          ) : (
            filteredProjects.map((p, idx) => {
              const rot = (idx % 2 === 0 ? 1 : -1) * (1 + Math.random() * 2);
              return (
                <motion.button 
                  key={p.id} 
                  whileHover={{ scale:1.05, rotate:0, y:-8, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)' }} 
                  whileTap={{ scale:0.97 }} 
                  onClick={()=>onOpenProject(p.id)}
                  initial={{ rotate: rot }}
                  className="w-full text-left p-6 pb-10 rounded-lg bg-card border-8 border-token shadow-xl hover:shadow-2xl transition-all duration-300"
                  style={{ transformStyle:'preserve-3d' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xl font-bold tracking-tight" style={{ color:'hsl(var(--accent))' }}>{p.title}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={async (e)=>{e.stopPropagation(); const n = prompt('New name:', p.title); if(!n) return; await projectsAPI.update(p.id, { title: n }); await reload();}} className="px-2 py-1 rounded-md text-xs bg-surface-variant">✏️ Rename</button>
                      <button onClick={async (e)=>{e.stopPropagation(); if(confirm('Delete project permanently?')) { await projectsAPI.delete(p.id); await reload(); }}} className="px-2 py-1 rounded-md text-xs" style={{ background:'hsl(var(--danger))', color:'#fff' }}>🗑️ Delete</button>
                    </div>
                  </div>
                  <div className="text-sm text-on-muted">
                    📚 {p.cardCount || 0} Cards
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Right: Projekt + Dateien Upload */}
        <div className="space-y-6">
          <motion.div
            whileHover={{ scale:1.02, rotate:0, y:-4 }}
            initial={{ rotate:1 }}
            className="p-6 pb-10 rounded-lg bg-card border-8 border-token shadow-xl transition-all"
          >
            <h3 className="text-xl font-semibold mb-2">Project & Files</h3>
            <p className="text-sm text-on-muted mb-4">Choose a name and upload any number of files.</p>
            <UploadZone onCreated={async (pid)=>{ await reload(); onOpenProject(pid); }} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
