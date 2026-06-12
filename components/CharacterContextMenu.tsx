import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Download, Trash2, FolderInput, X, FolderPlus, Folder as FolderIcon, ArrowLeft, Check } from 'lucide-react';
import { Folder } from '../types';

interface CharacterContextMenuProps {
  x: number;
  y: number;
  charName: string;
  currentFolderId?: string;
  folders: Folder[];
  onClose: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onMoveToFolder: (folderId?: string) => void;
  onCreateFolderAndMove: (name: string) => void;
}

const CharacterContextMenu: React.FC<CharacterContextMenuProps> = ({
  x,
  y,
  charName,
  currentFolderId,
  folders,
  onClose,
  onRename,
  onDownload,
  onDelete,
  onMoveToFolder,
  onCreateFolderAndMove,
}) => {
  const [view, setView] = useState<'main' | 'move' | 'newFolder'>('main');
  const [newFolderName, setNewFolderName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (view === 'newFolder' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view]);

  // Adjust position so menu stays within viewport
  const [style, setStyle] = useState<React.CSSProperties>({ top: y, left: x });
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let newX = x;
    let newY = y;
    if (x + rect.width > vw) newX = Math.max(8, vw - rect.width - 8);
    if (y + rect.height > vh) newY = Math.max(8, vh - rect.height - 8);
    setStyle({ top: newY, left: newX });
  }, [x, y, view]);

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    onCreateFolderAndMove(name);
  };

  return (
    <>
      {/* Backdrop for mobile to dim background and capture taps */}
      <div className="fixed inset-0 z-40 bg-black/20 md:bg-transparent" />
      <div
        ref={menuRef}
        style={style}
        className="fixed z-50 bg-victory-dark text-gray-200 rounded-lg shadow-2xl border border-gray-700 w-60 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onContextMenu={(e) => e.preventDefault()}
      >
        {view === 'main' && (
          <>
            <div className="px-3 py-2 border-b border-gray-700 bg-black/30">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Ficha</div>
              <div className="text-sm font-bold truncate text-victory-orange">{charName}</div>
            </div>
            <div className="py-1">
              <button
                onClick={() => { onRename(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors text-left"
              >
                <Edit2 size={16} className="text-gray-400" /> Renomear
              </button>
              <button
                onClick={() => { onDownload(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors text-left"
              >
                <Download size={16} className="text-gray-400" /> Baixar
              </button>
              <button
                onClick={() => setView('move')}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors text-left"
              >
                <FolderInput size={16} className="text-gray-400" /> Mover para pasta
              </button>
              <div className="h-px bg-gray-700 my-1" />
              <button
                onClick={() => { onDelete(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-red-900/40 text-red-400 transition-colors text-left"
              >
                <Trash2 size={16} /> Apagar
              </button>
            </div>
          </>
        )}

        {view === 'move' && (
          <>
            <div className="px-2 py-2 border-b border-gray-700 bg-black/30 flex items-center gap-2">
              <button onClick={() => setView('main')} className="p-1 hover:bg-gray-700 rounded transition-colors">
                <ArrowLeft size={16} />
              </button>
              <div className="text-sm font-bold uppercase tracking-tight">Mover para pasta</div>
              <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-700 rounded transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              <button
                onClick={() => { onMoveToFolder(undefined); onClose(); }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors text-left"
              >
                <span className="flex items-center gap-3">
                  <FolderIcon size={16} className="text-gray-400" /> Raiz (sem pasta)
                </span>
                {!currentFolderId && <Check size={14} className="text-victory-orange" />}
              </button>
              {folders.length > 0 && <div className="h-px bg-gray-700 my-1" />}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => { onMoveToFolder(folder.id); onClose(); }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors text-left"
                >
                  <span className="flex items-center gap-3 truncate">
                    <FolderIcon size={16} className="text-gray-400 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  {currentFolderId === folder.id && <Check size={14} className="text-victory-orange shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-700">
              <button
                onClick={() => setView('newFolder')}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-700 transition-colors text-left text-victory-orange font-bold"
              >
                <FolderPlus size={16} /> Nova pasta
              </button>
            </div>
          </>
        )}

        {view === 'newFolder' && (
          <>
            <div className="px-2 py-2 border-b border-gray-700 bg-black/30 flex items-center gap-2">
              <button onClick={() => setView('move')} className="p-1 hover:bg-gray-700 rounded transition-colors">
                <ArrowLeft size={16} />
              </button>
              <div className="text-sm font-bold uppercase tracking-tight">Nova pasta</div>
              <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-700 rounded transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-3 flex flex-col gap-3">
              <input
                ref={inputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
                placeholder="Nome da pasta..."
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-victory-orange"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 bg-victory-orange hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-bold text-xs transition-colors"
              >
                <FolderPlus size={14} /> Criar e mover
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CharacterContextMenu;
