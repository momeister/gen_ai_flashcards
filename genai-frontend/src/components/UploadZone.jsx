import { useState, useCallback } from 'react';
import { uploadsAPI, projectsAPI } from '../utils/api';
import { getProjects, createProject, saveProject } from '../utils/projects';
import { motion, AnimatePresence } from 'framer-motion';

const allowedMimeStarts = ['image/', 'application/pdf', 'text/', 'application/vnd'];

export default function UploadZone({ onCreated }) {
  const [files, setFiles] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [serverProjectId, setServerProjectId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);

  const validate = (file) => {
    if (file.type.startsWith('video/')) return 'Videos sind nicht erlaubt';
    if (allowedMimeStarts.some(prefix => file.type.startsWith(prefix))) return null;
    // allow common office mime types even if prefix not matched precisely
    return 'Nicht unterstützter Dateityp';
  };

  const addFiles = useCallback((incoming) => {
    const errs = [];
    const valid = [];
    incoming.forEach(f => {
      const v = validate(f);
      if (v) errs.push(`${f.name}: ${v}`); else valid.push(f);
    });
    if (errs.length) setErrorMessages(errs);
    if (valid.length) setFiles(prev => [...prev, ...valid]);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const onInputChange = (e) => {
    const selected = Array.from(e.target.files);
    addFiles(selected);
    e.target.value = '';
  };

  const removeFile = (index) => setFiles(f => f.filter((_, i) => i !== index));

  const ensureServerProject = async () => {
    if (serverProjectId) return serverProjectId;
    const name = projectName.trim();
    if (!name) throw new Error('Projektname fehlt');
    // Create local project (for persistence/UI) if not existing
    let local = getProjects().find(p => p.name === name);
    if (!local) {
      local = createProject(name);
    }
    if (!local.serverId) {
      const serverProject = await projectsAPI.create({ title: name, description: '' });
      local.serverId = serverProject.id;
      saveProject(local);
    }
    setServerProjectId(local.serverId);
    return local.serverId;
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert('Keine Dateien gewählt');
    if (!projectName.trim()) return alert('Bitte Projektnamen eingeben');
    setUploading(true);
    try {
      const pid = await ensureServerProject();
      console.log('📤 Upload gestartet', { projectId: pid, files: files.length });
      const result = await uploadsAPI.upload(pid, files);
      console.log('✅ Upload fertig', result);
      const summary = Array.isArray(result) ? result.map(r=>`${r.file.original_filename}: ${r.processed.chunks?.length||0} Abschnitte`).join('\n') : 'n/a';
      alert(`✅ ${files.length} Datei(en) hochgeladen & verarbeitet.\n\n${summary}`);
      setFiles([]);
      setErrorMessages([]);
      if (onCreated) onCreated(pid);
    } catch (e) {
      console.error('❌ Fehler beim Upload', e);
      alert(`Fehler: ${e?.data?.detail || e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Projektname</label>
        <input
          type="text"
          value={projectName}
          onChange={e=>setProjectName(e.target.value)}
          placeholder="Mein Projekt"
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
        />
        {serverProjectId && (
          <div className="text-xs text-cyan-600 dark:text-cyan-400">Backend Projekt-ID: {serverProjectId}</div>
        )}
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">Dateien hochladen</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Ziehe deine PDFs & Bilder hier hinein oder nutze den Button.</p>
      </div>

      <motion.div
        onDragEnter={(e)=>{e.preventDefault(); setDragActive(true);}}
        onDragOver={(e)=>{e.preventDefault();}}
        onDragLeave={(e)=>{e.preventDefault(); setDragActive(false);}}
        onDrop={onDrop}
        whileHover={{scale:1.02, borderColor:'hsl(var(--accent))'}}
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${dragActive ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 scale-105' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'} flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-900/30`}
      >
        <input id="fileInput" type="file" multiple onChange={onInputChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
        <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300">Dateien hier ablegen oder <label htmlFor="fileInput" className="text-cyan-500 dark:text-cyan-400 cursor-pointer underline hover:text-cyan-600 dark:hover:text-cyan-300">durchsuchen</label></p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Unterstützt: Bilder, PDF, Text & Office. Keine Videos.</p>
        </motion.div>
      </motion.div>

      {!!errorMessages.length && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-1">
          {errorMessages.map((e,i)=>(<div key={i} className="text-xs text-red-400">{e}</div>))}
        </motion.div>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-300">Ausgewählte Dateien ({files.length}):</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {files.map((file, idx) => (
                <motion.div key={file.name+idx} layout initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}}
                  whileHover={{scale:1.02, y:-2}}
                  className="group relative p-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 hover:border-cyan-500/50 transition-all shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="object-cover w-full h-full" />
                      ) : (
                        <svg className="w-6 h-6 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">{(file.size/1024).toFixed(1)} KB</p>
                    </div>
                    <motion.button whileHover={{scale:1.1, rotate:5}} whileTap={{scale:0.9}} onClick={()=>removeFile(idx)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors" title="Entfernen">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex gap-3">
              <motion.button whileHover={{scale:1.05, y:-2}} whileTap={{scale:0.95}} disabled={uploading} onClick={()=>setFiles([])} className="px-4 py-2 text-sm rounded-lg bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-all shadow disabled:opacity-50">Leeren</motion.button>
              <motion.button whileHover={{scale:1.05, y:-2}} whileTap={{scale:0.95}} disabled={uploading || !projectName.trim()} onClick={handleUpload} className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg transition-all disabled:opacity-50">
                {uploading ? '⏳ Lädt…' : '📤 Projekt & Dateien hochladen'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
