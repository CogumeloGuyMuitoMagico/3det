import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCcw } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
}

const CANVAS_DISPLAY = 300; // px displayed
const OUTPUT_SIZE    = 640; // final resolution

const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom,   setZoom]   = useState(1);           // multiplier on top of fitScale
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready,  setReady]  = useState(false);

  // Drag state kept in refs to avoid stale closure issues in native listeners
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number } | null>(null);
  const zoomRef  = useRef(zoom);
  const offsetRef = useRef(offset);
  zoomRef.current  = zoom;
  offsetRef.current = offset;

  // ── Load image ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // "cover" fit: image fills the square viewport
      const scale = Math.max(CANVAS_DISPLAY / img.naturalWidth, CANVAS_DISPLAY / img.naturalHeight);
      setFitScale(scale);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setReady(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // ── Draw ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    const S = CANVAS_DISPLAY;

    const scale = fitScale * zoom;
    ctx.clearRect(0, 0, S, S);

    // Draw image
    ctx.save();
    ctx.translate(S / 2 + offset.x, S / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Dim outside the visible square (nothing to dim since canvas IS the square)
    // Grid of thirds
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const p = (S / 3) * i;
      ctx.beginPath(); ctx.moveTo(p, 0);   ctx.lineTo(p, S);   ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p);   ctx.lineTo(S, p);   ctx.stroke();
    }
    // Border
    ctx.strokeStyle = '#FF9F1C';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, S - 2, S - 2);
  }, [ready, zoom, offset, fitScale]);

  // ── Native event listeners (need passive:false for wheel/touch) ─────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Wheel zoom ──
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(6, Math.max(0.5, z - e.deltaY * 0.0012)));
    };

    // ── Touch pan + pinch-zoom ──
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        dragRef.current = {
          x: e.touches[0].clientX, y: e.touches[0].clientY,
          ox: offsetRef.current.x, oy: offsetRef.current.y,
        };
        pinchRef.current = null;
      } else if (e.touches.length === 2) {
        dragRef.current = null;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        pinchRef.current = { dist: Math.hypot(dx, dy) };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current) {
        const dr = dragRef.current;
        setOffset({
          x: dr.ox + e.touches[0].clientX - dr.x,
          y: dr.oy + e.touches[0].clientY - dr.y,
        });
      } else if (e.touches.length === 2 && pinchRef.current) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / pinchRef.current.dist;
        pinchRef.current.dist = dist;
        setZoom(z => Math.min(6, Math.max(0.5, z * ratio)));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length < 1) dragRef.current  = null;
    };

    canvas.addEventListener('wheel',      onWheel,      { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

    return () => {
      canvas.removeEventListener('wheel',      onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, [ready]);

  // ── Mouse drag ──────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dr = dragRef.current;
    setOffset({ x: dr.ox + e.clientX - dr.x, y: dr.oy + e.clientY - dr.y });
  };
  const onMouseUp = () => { dragRef.current = null; };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // ── Confirm: render crop to output canvas ────────────────────────────────────
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const out = document.createElement('canvas');
    out.width  = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx  = out.getContext('2d')!;

    // Scale transform from display canvas → output canvas
    const ratio = OUTPUT_SIZE / CANVAS_DISPLAY;
    const scale = fitScale * zoom * ratio;

    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    onConfirm(out.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-victory-dark rounded-xl shadow-2xl border border-gray-700 w-full max-w-xs overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700 bg-black/30 flex items-center justify-between">
          <h3 className="font-header font-bold text-victory-orange text-lg uppercase tracking-wide">
            Recortar Imagem
          </h3>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className="text-[11px] text-gray-400 text-center">
            Arraste para reposicionar · Pinça ou scroll para zoom
          </p>

          {/* Crop canvas */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_DISPLAY}
              height={CANVAS_DISPLAY}
              className="rounded-lg cursor-grab active:cursor-grabbing select-none"
              style={{ width: CANVAS_DISPLAY, height: CANVAS_DISPLAY, touchAction: 'none' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut size={16} className="text-gray-400 shrink-0" />
            <input
              type="range" min={50} max={600}
              value={Math.round(zoom * 100)}
              onChange={e => setZoom(parseInt(e.target.value) / 100)}
              className="flex-1 accent-victory-orange"
            />
            <ZoomIn size={16} className="text-gray-400 shrink-0" />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              title="Resetar"
              className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2 text-sm font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 text-sm font-bold text-white bg-victory-orange hover:bg-orange-600 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} /> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
