import { useState, useCallback } from 'react';
import { uploadsAPI, projectsAPI } from '../utils/api';
import { getProjects, createProject, saveProject } from '../utils/projects';
import { motion, AnimatePresence } from 'framer-motion';

const allowedMimeStarts = ['image/', 'application/pdf', 'text/', 'application/vnd'];

export default function UploadZone({ onCreated }) {
  const [lectureFiles, setLectureFiles] = useState([]);
  const [extendedFiles, setExtendedFiles] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [serverProjectId, setServerProjectId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lectureDropActive, setLectureDropActive] = useState(false);
  const [extendedDropActive, setExtendedDropActive] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);
  const [provider, setProvider] = useState('lmstudio');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const validate = (file) => {
    if (file.type.startsWith('video/')) return 'Videos are not allowed';
    if (allowedMimeStarts.some(prefix => file.type.startsWith(prefix))) return null;
    // allow common office mime types even if prefix not matched precisely
    return 'Unsupported file type';
  };

  const addFiles = useCallback((incoming, category) => {
    const errs = [];
    const valid = [];
    incoming.forEach(f => {
      const v = validate(f);
      if (v) errs.push(`${f.name}: ${v}`); else valid.push(f);
    });
    if (errs.length) setErrorMessages(errs);
    if (valid.length) {
      if (category === 'lecture_notes') {
        setLectureFiles(prev => [...prev, ...valid]);
      } else {
        setExtendedFiles(prev => [...prev, ...valid]);
      }
    }
  }, []);

  const onDropLecture = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLectureDropActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped, 'lecture_notes');
  };

  const onDropExtended = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExtendedDropActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped, 'extended_info');
  };

  const onInputChangeLecture = (e) => {
    const selected = Array.from(e.target.files);
    addFiles(selected, 'lecture_notes');
    e.target.value = '';
  };

  const onInputChangeExtended = (e) => {
    const selected = Array.from(e.target.files);
    addFiles(selected, 'extended_info');
    e.target.value = '';
  };

  const removeFileLecture = (index) => setLectureFiles(f => f.filter((_, i) => i !== index));
  const removeFileExtended = (index) => setExtendedFiles(f => f.filter((_, i) => i !== index));

  const ensureServerProject = async () => {
    if (serverProjectId) return serverProjectId;
    const name = projectName.trim();
    if (!name) throw new Error('Project name missing');
    // Create local project (for persistence/UI) if not existing
    let local = getProjects().find(p => p.name === name);
    if (!local) {
      local = createProject(name);
    }
    if (!local.serverId) {
      const serverProject = await projectsAPI.create({ 
        title: name, 
        description: '',
        flashcard_scope: flashcardScope,
        flashcard_density: flashcardDensity
      });
      local.serverId = serverProject.id;
      saveProject(local);
    }
    setServerProjectId(local.serverId);
    return local.serverId;
  };

  const handleUpload = async () => {
    const totalFiles = lectureFiles.length + extendedFiles.length;
    if (totalFiles === 0) return alert('No files selected');
    if (!projectName.trim()) return alert('Please enter a project name');
    if (provider === 'openai' && !openaiApiKey.trim()) {
      return alert('OpenAI API key is required for OpenAI provider');
    }
    setUploading(true);
    try {
      const pid = await ensureServerProject();
      console.log('📤 Upload started', { projectId: pid, files: files.length, provider });
      const result = await uploadsAPI.upload(pid, files, { provider, openaiApiKey });
      console.log('✅ Upload finished', result);
      const summary = Array.isArray(result) ? result.map(r=>`${r.file.original_filename}: ${r.cards_count || 0} cards`).join('\n') : 'n/a';
      alert(`✅ ${files.length} file(s) uploaded & processed.\n\n${summary}`);
      setFiles([]);
      setErrorMessages([]);
      if (onCreated) onCreated(pid);
    } catch (e) {
      console.error('❌ Upload error', e);
      alert(`Error: ${e?.data?.detail || e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const scopeOptions = [
    { value: 'all_slides', label: 'All Slides', description: 'Process entire document set' },
    { value: 'per_set', label: 'Per Set', description: 'Process each file separately' },
    { value: 'per_slide', label: 'Per Slide', description: 'Generate cards for each slide' }
  ];

  const renderDropZone = (id, active, onDragEnter, onDragLeave, onDrop, onInputChange, title, description, files, removeFile, color) => (
    <motion.div
      onDragEnter={(e)=>{e.preventDefault(); onDragEnter(true);}}
      onDragOver={(e)=>{e.preventDefault();}}
      onDragLeave={(e)=>{e.preventDefault(); onDragLeave(false);}}
      onDrop={onDrop}
      whileHover={{scale:1.02}}
      className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${active ? `border-${color}-500 bg-${color}-500/10 scale-105` : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'} flex flex-col items-center justify-center gap-3 bg-zinc-50 dark:bg-zinc-900/30`}
    >
      <input id={id} type="file" multiple onChange={onInputChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
      <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="text-center space-y-2">
        <h4 className={`font-semibold text-${color}-600 dark:text-${color}-400`}>{title}</h4>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
        <div className={`mx-auto w-12 h-12 rounded-full bg-${color}-500/10 dark:bg-${color}-500/20 flex items-center justify-center`}>
          <svg className={`w-6 h-6 text-${color}-500 dark:text-${color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
        </div>
        <p className="text-xs text-zinc-700 dark:text-zinc-300">Drop files or <label htmlFor={id} className={`text-${color}-500 dark:text-${color}-400 cursor-pointer underline`}>browse</label></p>
      </motion.div>
      {files.length > 0 && (
        <div className="w-full mt-3 space-y-2">
          {files.map((file, idx) => (
            <div key={file.name+idx} className="flex items-center gap-2 p-2 rounded bg-zinc-100 dark:bg-zinc-800/50 text-xs">
              <span className="flex-1 truncate">{file.name}</span>
              <button onClick={()=>removeFile(idx)} className="text-red-500 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={e=>setProjectName(e.target.value)}
          placeholder="My Project"
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
        />
        {serverProjectId && (
          <div className="text-xs text-cyan-600 dark:text-cyan-400">Backend Project ID: {serverProjectId}</div>
        )}
      </div>

      <div className="space-y-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">AI Provider for Card Generation</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="lmstudio"
              checked={provider === 'lmstudio'}
              onChange={(e) => {
                setProvider(e.target.value);
                setShowApiKeyInput(false);
              }}
              className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">LMStudio (Local)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="openai"
              checked={provider === 'openai'}
              onChange={(e) => {
                setProvider(e.target.value);
                setShowApiKeyInput(true);
              }}
              className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">OpenAI</span>
          </label>
        </div>

        {provider === 'openai' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 mt-3 pt-3 border-t border-zinc-300 dark:border-zinc-700"
          >
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">OpenAI API Key</label>
            <input
              type={showApiKeyInput ? 'password' : 'password'}
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-400 underline">platform.openai.com/api-keys</a></p>
          </motion.div>
        )}

        {provider === 'lmstudio' && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2">Make sure LMStudio is running on http://172.28.112.1:1234</p>
        )}
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">Upload Files</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Separate lecture notes from extended information.</p>
      </div>

      {/* Dual Upload Zones */}
      <div className="grid md:grid-cols-2 gap-4">
        {renderDropZone(
          'lectureInput',
          lectureDropActive,
          setLectureDropActive,
          setLectureDropActive,
          onDropLecture,
          onInputChangeLecture,
          '📚 Lecture Notes',
          'Core material for flashcard generation',
          lectureFiles,
          removeFileLecture,
          'cyan'
        )}
        {renderDropZone(
          'extendedInput',
          extendedDropActive,
          setExtendedDropActive,
          setExtendedDropActive,
          onDropExtended,
          onInputChangeExtended,
          '📖 Extended Information',
          'Additional context and references',
          extendedFiles,
          removeFileExtended,
          'purple'
        )}
      </div>

      {!!errorMessages.length && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-1">
          {errorMessages.map((e,i)=>(<div key={i} className="text-xs text-red-400">{e}</div>))}
        </motion.div>
      )}

      {/* Upload Button */}
      <div className="flex gap-3">
        <motion.button 
          whileHover={{scale:1.05, y:-2}} 
          whileTap={{scale:0.95}} 
          disabled={uploading} 
          onClick={()=>{setLectureFiles([]); setExtendedFiles([]);}} 
          className="px-4 py-2 text-sm rounded-lg bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-all shadow disabled:opacity-50"
        >
          Clear All
        </motion.button>
        <motion.button 
          whileHover={{scale:1.05, y:-2}} 
          whileTap={{scale:0.95}} 
          disabled={uploading || !projectName.trim() || (lectureFiles.length === 0 && extendedFiles.length === 0)} 
          onClick={handleUpload} 
          className="flex-1 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg transition-all disabled:opacity-50"
        >
          {uploading ? '⏳ Uploading…' : `📤 Upload Project (${lectureFiles.length + extendedFiles.length} files)`}
        </motion.button>
      </div>
    </div>
  );
}
