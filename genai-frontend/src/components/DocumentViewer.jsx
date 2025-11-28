import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { updateFileHighlights } from '../utils/projects';

// DocumentViewer: Displays images with rectangle highlights. PDFs show a simple placeholder (MVP).
// Highlights format: [{ x: number, y: number, width: number, height: number }] in normalized 0..1 coords.

export default function DocumentViewer({ projectId, file, onClose }) {
  const isImage = file?.type?.startsWith('image/');
  const isPDF = file?.type === 'application/pdf' || (file?.name||'').toLowerCase().endsWith('.pdf');
  const [highlights, setHighlights] = useState(file?.highlights || []);
  const [drawing, setDrawing] = useState(null); // {startX,startY,currentX,currentY}
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => { setHighlights(file?.highlights || []); }, [file?.id]);

  // Persist on change (debounced minimal)
  useEffect(() => {
    const t = setTimeout(() => {
      if (projectId && file?.id) updateFileHighlights(projectId, file.id, highlights);
    }, 120);
    return () => clearTimeout(t);
  }, [highlights, projectId, file?.id]);

  const normFromEvent = (e) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const onPointerDown = (e) => {
    if (!isImage) return;
    const { x, y } = normFromEvent(e);
    setDrawing({ startX: x, startY: y, currentX: x, currentY: y });
  };
  const onPointerMove = (e) => {
    if (!drawing) return;
    const { x, y } = normFromEvent(e);
    setDrawing((d) => ({ ...d, currentX: x, currentY: y }));
  };
  const onPointerUp = () => {
    if (!drawing) return;
    const { startX, startY, currentX, currentY } = drawing;
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    if (width > 0.01 && height > 0.01) {
      setHighlights((h) => [...h, { x, y, width, height }]);
    }
    setDrawing(null);
  };

  const removeHighlight = (idx) => {
    setHighlights((h) => h.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{scale:0.95, opacity:0, y:20}} animate={{scale:1, opacity:1, y:0}} className="w-full max-w-5xl h-[85vh] rounded-xl bg-card border border-token shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-token">
          <div className="flex items-center gap-3">
            <span className="text-sm text-on-muted">{file?.name}</span>
            {isImage && <span className="chip">Bild • Highlights aktiv</span>}
            {isPDF && <span className="chip">PDF • Vorschau</span>}
          </div>
          <div className="flex items-center gap-2">
            <a href={file?.previewUrl} download={file?.name} className="btn" style={{ background:'hsl(var(--accent))', color:'white' }} title="Herunterladen">📥 Download</a>
            <button onClick={onClose} className="btn" style={{ background:'hsl(var(--surface-variant))' }}>Schließen</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-surface flex items-center justify-center">
          {isImage && (
            <div
              ref={containerRef}
              className="relative max-h-full max-w-full select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <img ref={imgRef} src={file.previewUrl} alt={file.name} className="max-h-[70vh] max-w-full block" />
              {/* Existing highlights */}
              {highlights.map((h, idx) => (
                <div key={idx}
                  className="absolute border-2 rounded-md"
                  style={{
                    left: `${h.x*100}%`,
                    top: `${h.y*100}%`,
                    width: `${h.width*100}%`,
                    height: `${h.height*100}%`,
                    borderColor: 'hsl(var(--accent))',
                    background: 'hsla(var(--accent), 0.08)'
                  }}
                  onClick={(e)=>{ e.stopPropagation(); removeHighlight(idx); }}
                  title="Klicken zum Entfernen"
                />
              ))}
              {/* Drawing overlay */}
              {drawing && (
                <div className="absolute border-2 rounded-md pointer-events-none"
                  style={{
                    left: `${Math.min(drawing.startX, drawing.currentX)*100}%`,
                    top: `${Math.min(drawing.startY, drawing.currentY)*100}%`,
                    width: `${Math.abs(drawing.currentX - drawing.startX)*100}%`,
                    height: `${Math.abs(drawing.currentY - drawing.startY)*100}%`,
                    borderColor: 'hsl(var(--secondary))',
                    background: 'hsla(var(--secondary), 0.08)'
                  }}
                />
              )}
            </div>
          )}

          {!isImage && isPDF && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6">
              <div className="w-full h-full flex flex-col">
                <p className="text-on-muted mb-3 text-center">PDF-Vorschau</p>
                <object data={file.previewUrl} type="application/pdf" className="w-full flex-1 rounded-lg border border-token">
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-on-muted">
                    <p>PDF kann nicht angezeigt werden.</p>
                    <a href={file.previewUrl} download={file.name} className="px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600">📥 Herunterladen</a>
                  </div>
                </object>
                <p className="text-xs text-on-muted mt-2 text-center">Hinweis: Highlights für PDFs werden im nächsten Schritt mit pdf.js ergänzt.</p>
              </div>
            </div>
          )}

          {!isImage && !isPDF && (
            <div className="p-8 text-on-muted">Dieser Dateityp wird aktuell nicht direkt angezeigt.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
