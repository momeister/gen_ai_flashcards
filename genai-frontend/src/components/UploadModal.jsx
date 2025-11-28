import { useState } from 'react';

const UploadModal = ({ isOpen, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);

  // Erlaubte Dateitypen (statische Formate, keine Videos)
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    // Prüfe, ob es kein Video ist
    if (file.type.startsWith('video/')) {
      return { valid: false, error: 'Videos sind nicht erlaubt' };
    }
    
    // Prüfe, ob der Dateityp erlaubt ist
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      // Erlaube alle Bilder und spezifische andere Typen
      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Dieser Dateityp ist nicht erlaubt' };
      }
    }
    
    return { valid: true };
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = [];
    const errors = [];

    droppedFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert('Einige Dateien wurden nicht hinzugefügt:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];
    const errors = [];

    selectedFiles.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert('Einige Dateien wurden nicht hinzugefügt:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length === 0) {
      alert('Bitte fügen Sie mindestens eine Datei hinzu');
      return;
    }

    // Hier würde die tatsächliche Upload-Logik implementiert werden
    console.log('Uploading files:', files);
    alert(`${files.length} Datei(en) erfolgreich hochgeladen!`);
    
    // Reset und schließen
    setFiles([]);
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  console.log('UploadModal COMPONENT render - isOpen:', isOpen);

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 99999,
        position: 'fixed'
      }}
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl mx-4 rounded-lg shadow-2xl"
        style={{
          backgroundColor: '#18181b',
          border: '1px solid #27272a'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold text-cyan-400">Lectures hinzufügen</h2>
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
        <div className="p-6">
          {/* Drag & Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
              dragActive
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-input"
              multiple
              onChange={handleFileInput}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            
            <div className="space-y-4">
              <svg
                className="mx-auto h-16 w-16 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              
              <div>
                <p className="text-lg text-zinc-300">
                  Dateien hierher ziehen oder{' '}
                  <label
                    htmlFor="file-input"
                    className="text-cyan-400 hover:text-cyan-300 cursor-pointer underline"
                  >
                    durchsuchen
                  </label>
                </p>
                <p className="text-sm text-zinc-500 mt-2">
                  PDF, Bilder, Dokumente (Videos nicht erlaubt)
                </p>
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2 max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                {files.length} Datei(en) ausgewählt:
              </h3>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <svg
                      className="w-5 h-5 text-cyan-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{file.name}</p>
                      <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-3 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-6 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            Hochladen ({files.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
