
import React, { useState, useEffect, useRef } from 'react';
import { Character, Folder, INITIAL_CHARACTER } from './types';
import { generateId, exportCharacterImage, importCharacterFromImage, calculateResources } from './utils';
import StatBox from './components/StatBox';
import SectionArea from './components/SectionArea';
import DiceRoller from './components/DiceRoller';
import { Menu, X, Plus, Trash2, Download, Upload, User, Camera, PanelLeftClose, PanelLeftOpen, Dices, FolderPlus, Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, FileText, Zap, HeartPulse, Swords, Edit2 } from 'lucide-react';

// Componente de Item da Lista (Ficha)
interface CharacterItemProps {
  char: Character;
  activeId: string | null;
  draggedId: string | null;
  onDragStart: (e: React.DragEvent, id: string, type: 'char' | 'folder') => void;
  onDragEnd: () => void;
  onSelect: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const CharacterItem: React.FC<CharacterItemProps> = ({ 
  char, 
  activeId, 
  draggedId, 
  onDragStart,
  onDragEnd,
  onSelect, 
  onDelete 
}) => (
  <div 
    draggable
    onDragStart={(e) => onDragStart(e, char.id, 'char')}
    onDragEnd={onDragEnd}
    onClick={(e) => { e.stopPropagation(); onSelect(); }}
    className={`
      relative p-2 pl-3 cursor-grab active:cursor-grabbing flex justify-between items-center group transition-colors rounded-sm mb-0.5
      ${activeId === char.id 
        ? 'bg-victory-orange text-white' 
        : 'hover:bg-gray-700 text-gray-300'
      }
      ${draggedId === char.id ? 'opacity-50' : ''}
    `}
  >
    <div className="flex items-center gap-2 overflow-hidden">
      {char.isActionMode ? (
        <Zap size={14} className="text-yellow-400 fill-yellow-400 shrink-0" />
      ) : (
        <FileText size={14} className={activeId === char.id ? 'text-white' : 'text-gray-500'} />
      )}
      <div className="truncate text-xs font-medium uppercase tracking-tighter">{char.name}</div>
    </div>
    <button 
      onClick={(e) => onDelete(char.id, e)}
      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 ${activeId === char.id ? 'text-white hover:text-gray-200' : 'text-gray-500 hover:text-red-400'}`}
    >
      <Trash2 size={12} />
    </button>
  </div>
);

const App: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'char' | 'folder' | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedChars = localStorage.getItem('3det_characters');
    if (storedChars) {
      try {
        const parsed = JSON.parse(storedChars);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migratedChars = parsed.map((char: any) => ({
            ...INITIAL_CHARACTER,
            ...char,
            isActionMode: char.isActionMode || false,
            items: char.items || '',
            history: char.history || char.inventory || '',
            scale: char.scale || 'Ningen',
          }));
          setCharacters(migratedChars);
          setActiveId(migratedChars[0].id);
        } else {
          createNewCharacter();
        }
      } catch (e) {
        createNewCharacter();
      }
    } else {
      createNewCharacter();
    }

    const storedFolders = localStorage.getItem('3det_folders');
    if (storedFolders) {
      try {
        setFolders(JSON.parse(storedFolders));
      } catch(e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (characters.length > 0) {
      localStorage.setItem('3det_characters', JSON.stringify(characters));
    }
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('3det_folders', JSON.stringify(folders));
  }, [folders]);

  const createNewCharacter = (folderId?: string) => {
    const resBase = calculateResources(INITIAL_CHARACTER.attributes, INITIAL_CHARACTER.advantages);
    const newChar: Character = {
      ...INITIAL_CHARACTER,
      id: generateId(),
      name: 'Novo Herói',
      folderId: folderId,
      resources: {
        pa: { current: resBase.pa, max: resBase.pa },
        pm: { current: resBase.pm, max: resBase.pm },
        pv: { current: resBase.pv, max: resBase.pv },
      }
    };
    setCharacters((prev) => [...prev, newChar]);
    setActiveId(newChar.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const createFolder = (parentId?: string) => {
    const name = prompt("Nome da nova pasta:");
    if (name) {
      const newFolder: Folder = { id: generateId(), name, isOpen: true, parentId };
      setFolders(prev => [...prev, newFolder]);
    }
  };

  const renameFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    const newName = prompt("Novo nome da pasta:", folder.name);
    if (newName && newName !== folder.name) {
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    }
  };

  const getAllDescendantFolderIds = (folderId: string, currentFolders: Folder[]): string[] => {
    const children = currentFolders.filter(f => f.parentId === folderId);
    let ids = children.map(c => c.id);
    children.forEach(child => {
      ids = [...ids, ...getAllDescendantFolderIds(child.id, currentFolders)];
    });
    return ids;
  };

  const deleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    const hasDirectChars = characters.some(c => c.folderId === id);
    const hasDirectSubfolders = folders.some(f => f.parentId === id);

    if (!hasDirectChars && !hasDirectSubfolders) {
      if (confirm(`Excluir a pasta vazia "${folder.name}"?`)) {
        setFolders(prev => prev.filter(f => f.id !== id));
      }
      return;
    }

    const choice = confirm(
      `A pasta "${folder.name}" contém itens.\n\n` +
      `[OK] APAGAR TUDO (incluindo fichas e subpastas internas).\n` +
      `[CANCELAR] MANTER CONTEÚDO (mover para fora).`
    );

    if (choice) {
      const allSubFolderIds = getAllDescendantFolderIds(id, folders);
      const allIdsToDelete = [id, ...allSubFolderIds];

      setCharacters(prev => prev.filter(c => !c.folderId || !allIdsToDelete.includes(c.folderId)));
      setFolders(prev => prev.filter(f => !allIdsToDelete.includes(f.id)));
    } else {
      const targetParentId = folder.parentId;
      setCharacters(prev => prev.map(c => c.folderId === id ? { ...c, folderId: targetParentId } : c));
      setFolders(prev => 
        prev
          .filter(f => f.id !== id)
          .map(f => f.parentId === id ? { ...f, parentId: targetParentId } : f)
      );
    }
  };

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolders(prev => prev.map(f => f.id === id ? { ...f, isOpen: !f.isOpen } : f));
  };

  const deleteCharacter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Excluir esta ficha?')) {
      const newDocs = characters.filter((c) => c.id !== id);
      setCharacters(newDocs);
      if (activeId === id) {
        setActiveId(newDocs.length > 0 ? newDocs[0].id : null);
      }
      if (newDocs.length === 0) createNewCharacter();
    }
  };

  const updateCharacter = (updates: Partial<Character>) => {
    if (!activeId) return;
    setCharacters((prev) => 
      prev.map((char) => {
        if (char.id !== activeId) return char;
        const oldActionMode = char.isActionMode;
        const updatedChar = { ...char, ...updates };
        const newActionMode = updatedChar.isActionMode;
        if (updates.attributes || updates.advantages !== undefined || updates.isActionMode !== undefined) {
          const newMax = calculateResources(updatedChar.attributes, updatedChar.advantages);
          const newResources = { ...updatedChar.resources };
          newResources.pa.max = newMax.pa;
          newResources.pm.max = newMax.pm;
          newResources.pv.max = newMax.pv;
          if (!newActionMode) {
            const isTransitioningOff = oldActionMode === true && newActionMode === false;
            if (isTransitioningOff) {
              newResources.pa.current = Math.min(newResources.pa.current, newMax.pa);
              newResources.pm.current = Math.min(newResources.pm.current, newMax.pm);
              newResources.pv.current = Math.min(newResources.pv.current, newMax.pv);
            } else if (updates.attributes || updates.advantages !== undefined) {
              newResources.pa.current = newMax.pa;
              newResources.pm.current = newMax.pm;
              newResources.pv.current = newMax.pv;
            }
          }
          updatedChar.resources = newResources;
        }
        return updatedChar;
      })
    );
  };

  const toggleActionMode = () => {
    const char = characters.find(c => c.id === activeId);
    if (!char) return;
    const nextMode = !char.isActionMode;
    if (nextMode) {
      updateCharacter({ savedAttributes: { ...char.attributes }, isActionMode: true });
    } else {
      updateCharacter({ 
        attributes: char.savedAttributes ? { ...char.savedAttributes } : char.attributes,
        savedAttributes: undefined,
        isActionMode: false 
      });
    }
  };

  const toggleAllActionMode = () => {
    const allInAction = characters.every(c => c.isActionMode);
    const nextMode = !allInAction;
    setCharacters(prev => prev.map(char => {
      if (char.isActionMode === nextMode) return char;
      const updatedChar = { ...char };
      if (nextMode) {
        updatedChar.savedAttributes = { ...char.attributes };
        updatedChar.isActionMode = true;
      } else {
        updatedChar.attributes = char.savedAttributes ? { ...char.savedAttributes } : char.attributes;
        updatedChar.savedAttributes = undefined;
        updatedChar.isActionMode = false;
        const newMax = calculateResources(updatedChar.attributes, updatedChar.advantages);
        updatedChar.resources = {
          pa: { current: Math.min(char.resources.pa.current, newMax.pa), max: newMax.pa },
          pm: { current: Math.min(char.resources.pm.current, newMax.pm), max: newMax.pm },
          pv: { current: Math.min(char.resources.pv.current, newMax.pv), max: newMax.pv },
        };
      }
      return updatedChar;
    }));
  };

  const refillResources = () => {
    const char = characters.find(c => c.id === activeId);
    if (!char) return;
    updateCharacter({ 
      resources: {
        pa: { ...char.resources.pa, current: char.resources.pa.max },
        pm: { ...char.resources.pm, current: char.resources.pm.max },
        pv: { ...char.resources.pv, current: char.resources.pv.max },
      }
    });
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: string, type: 'char' | 'folder') => {
    e.stopPropagation(); // Previne iniciar múltiplos drags se aninhado
    setDraggedId(id);
    setDragType(type);
    e.dataTransfer.setData("id", id);
    e.dataTransfer.setData("type", type);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragType(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // IMPORTANTE: Impede que o container pai também receba o evento
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    e.stopPropagation(); // CRUCIAL: Impede borbulhamento para o container pai/raiz

    const id = e.dataTransfer.getData("id");
    const type = e.dataTransfer.getData("type");

    if (type === 'char') {
      setCharacters(prev => prev.map(c => c.id === id ? { ...c, folderId: targetFolderId } : c));
    } else if (type === 'folder') {
      if (id === targetFolderId) {
        handleDragEnd();
        return;
      }
      
      const isDescendant = (parent: string, child: string): boolean => {
        const c = folders.find(f => f.id === child);
        if (!c || !c.parentId) return false;
        if (c.parentId === parent) return true;
        return isDescendant(parent, c.parentId);
      };

      if (targetFolderId && isDescendant(id, targetFolderId)) {
        handleDragEnd();
        return;
      }

      setFolders(prev => prev.map(f => f.id === id ? { ...f, parentId: targetFolderId } : f));
    }
    
    if (targetFolderId) {
      setFolders(prev => prev.map(f => f.id === targetFolderId ? { ...f, isOpen: true } : f));
    }

    handleDragEnd();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedChar = await importCharacterFromImage(file);
      const resBase = calculateResources(importedChar.attributes, importedChar.advantages);
      importedChar.resources = {
        pa: { current: importedChar.resources?.pa?.current ?? resBase.pa, max: resBase.pa },
        pm: { current: importedChar.resources?.pm?.current ?? resBase.pm, max: resBase.pm },
        pv: { current: importedChar.resources?.pv?.current ?? resBase.pv, max: resBase.pv },
      };
      setCharacters((prev) => [...prev, importedChar]);
      setActiveId(importedChar.id);
      setIsSidebarOpen(false);
    } catch (err) { alert("Falha ao importar."); }
  };

  const handleExport = () => {
    const char = characters.find(c => c.id === activeId);
    if (sheetRef.current && char) exportCharacterImage(sheetRef.current, char);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateCharacter({ portrait: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const renderFolders = (parentId?: string, level: number = 0) => {
    const currentFolders = folders.filter(f => f.parentId === parentId);
    const currentChars = characters.filter(c => c.folderId === parentId);

    return (
      <div className={level > 0 ? 'ml-3 border-l border-gray-700' : ''}>
        {currentFolders.map(folder => (
          <div key={folder.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, folder.id)} className="group/folder">
            <div 
              draggable
              onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
              onDragEnd={handleDragEnd}
              className={`flex justify-between items-center p-2 cursor-pointer hover:bg-gray-700 transition-colors rounded ${folder.isOpen ? 'bg-gray-800/50' : ''} ${draggedId === folder.id ? 'opacity-50 border border-dashed border-gray-500' : ''}`}
              onClick={(e) => toggleFolder(folder.id, e)}
            >
              <div className="flex items-center gap-2 text-gray-300 min-w-0 pointer-events-none">
                {folder.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {folder.isOpen ? <FolderOpen size={16} className="text-victory-orange shrink-0" /> : <FolderIcon size={16} className="shrink-0" />}
                <span className="text-xs font-bold truncate uppercase tracking-tighter">{folder.name}</span>
              </div>
              <div className="flex items-center opacity-0 group-hover/folder:opacity-100 transition-opacity">
                <button onClick={(e) => renameFolder(folder.id, e)} className="p-1 text-gray-500 hover:text-white" title="Renomear">
                  <Edit2 size={12} />
                </button>
                <button onClick={(e) => deleteFolder(folder.id, e)} className="p-1 text-gray-500 hover:text-red-400" title="Excluir">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {folder.isOpen && (
              <div className="py-0.5">
                {renderFolders(folder.id, level + 1)}
              </div>
            )}
          </div>
        ))}
        {currentChars.map(char => (
          <CharacterItem 
            key={char.id} 
            char={char} 
            activeId={activeId} 
            draggedId={draggedId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onSelect={() => { setActiveId(char.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
            onDelete={deleteCharacter}
          />
        ))}
      </div>
    );
  };

  const activeChar = characters.find((c) => c.id === activeId) || characters[0];
  const allInActionMode = characters.length > 0 && characters.every(c => c.isActionMode);

  if (!activeChar && characters.length === 0) {
       return <div className="flex h-screen items-center justify-center bg-gray-100 text-gray-500">Iniciando...</div>;
  }
  
  const displayChar = activeChar || characters[0]; 

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-body text-gray-800">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed md:relative z-30 h-full bg-victory-dark text-gray-200 shadow-xl transform transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} ${isDesktopSidebarOpen ? 'md:w-72' : 'md:w-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-black/20 shrink-0">
          <h1 className="font-header text-2xl font-bold text-victory-orange">3DeT Builder</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X size={24} /></button>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin" 
          onDragOver={handleDragOver} 
          onDrop={(e) => handleDrop(e, undefined)}
        >
          {renderFolders(undefined, 0)}
        </div>

        <div className="p-4 bg-black/20 border-t border-gray-700 flex flex-col gap-2 shrink-0">
          <button onClick={toggleAllActionMode} className={`flex items-center justify-center gap-2 py-2 rounded font-bold text-xs transition-all border shadow-sm ${allInActionMode ? 'bg-yellow-500 text-white border-yellow-400 hover:bg-yellow-600' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'}`}>
            <Swords size={14} /> {allInActionMode ? 'DESATIVAR EM TODOS' : 'MODO AÇÃO GLOBAL'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => createNewCharacter()} className="flex items-center justify-center gap-1 bg-victory-orange hover:bg-orange-600 text-white py-2 rounded font-bold text-xs transition-colors">
              <Plus size={16} /> Ficha
            </button>
            <button onClick={() => createFolder()} className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold text-xs transition-colors">
              <FolderPlus size={16} /> Pasta
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto relative">
        <header className="sticky top-0 z-10 bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-victory-dark"><Menu size={28} /></button>
            <button onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} className="hidden md:block text-victory-dark hover:text-victory-orange transition-colors">
              {isDesktopSidebarOpen ? <PanelLeftClose size={28} /> : <PanelLeftOpen size={28} />}
            </button>
            <h2 className="font-header text-xl font-bold text-gray-600 hidden sm:block">Editor de Herói</h2>
          </div>
          <div className="flex gap-2 border-gray-200 border-l pl-4">
            <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors text-sm font-medium">
              <Upload size={18} /> <span className="hidden sm:inline">Importar</span>
              <input type="file" accept="image/png" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm font-medium">
              <Download size={18} /> <span className="hidden sm:inline">Exportar PNG</span>
            </button>
          </div>
        </header>

        {displayChar && (
        <div className="p-4 md:p-8 flex justify-center">
          <div key={activeId} ref={sheetRef} className="bg-white w-full max-w-5xl shadow-2xl rounded-lg overflow-hidden border border-gray-200" style={{ minHeight: '1000px' }}>
            
            <div className="bg-victory-dark text-white p-6 border-b-4 border-victory-orange">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="flex items-center gap-4">
                   <div className="text-5xl font-header font-bold text-victory-orange">3DeT</div>
                   <div className="text-3xl font-header font-bold tracking-wider uppercase">Victory</div>
                </div>
                <div className="bg-white/10 p-4 rounded backdrop-blur-sm">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-victory-yellow uppercase font-bold mb-1 opacity-80">Nome do Personagem</label>
                      <input type="text" value={displayChar.name} onChange={(e) => updateCharacter({ name: e.target.value })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-xl font-header font-bold" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-victory-yellow uppercase font-bold mb-1 opacity-80">Arquétipo</label>
                      <input type="text" value={displayChar.archetype} onChange={(e) => updateCharacter({ archetype: e.target.value })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-lg" />
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="block text-[10px] text-victory-yellow uppercase font-bold mb-1 opacity-80">Pontos</label>
                      <input type="number" value={displayChar.points} onChange={(e) => updateCharacter({ points: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-center font-bold" />
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="block text-[10px] text-victory-yellow uppercase font-bold mb-1 opacity-80">XP</label>
                      <input type="number" value={displayChar.xp} onChange={(e) => updateCharacter({ xp: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-center" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-victory-yellow uppercase font-bold mb-1 opacity-80">Escala de Poder</label>
                      <input type="text" value={displayChar.scale} onChange={(e) => updateCharacter({ scale: e.target.value })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="w-full aspect-square bg-gray-50 rounded-lg relative group overflow-hidden border border-gray-200 flex items-center justify-center">
                  {displayChar.portrait ? (
                    <img src={displayChar.portrait} alt="Portrait" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-gray-200" />
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Camera size={32} className="text-white" />
                  </label>
                </div>

                <div className="flex gap-2 w-full">
                  <button onClick={toggleActionMode} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border ${displayChar.isActionMode ? 'bg-victory-orange text-white border-victory-orange shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                    <Zap size={14} fill={displayChar.isActionMode ? "white" : "none"} /> {displayChar.isActionMode ? 'MODO AÇÃO: ON' : 'MODO AÇÃO: OFF'}
                  </button>
                  <button onClick={refillResources} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg font-bold text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all">
                    <HeartPulse size={14} /> RESTAURAR
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4 shadow-sm">
                  <StatBox label="Poder" value={displayChar.attributes.poder} color="orange" onChange={(val) => updateCharacter({ attributes: { ...displayChar.attributes, poder: val } })} />
                  <StatBox label="Ação" value={displayChar.resources.pa.current} maxValue={displayChar.resources.pa.max} color="orange" isResource onChange={(val) => { const newRes = { ...displayChar.resources }; newRes.pa.current = val; updateCharacter({ resources: newRes }); }} />
                  <div className="h-px bg-gray-200" />
                  <StatBox label="Habilidade" value={displayChar.attributes.habilidade} color="blue" onChange={(val) => updateCharacter({ attributes: { ...displayChar.attributes, habilidade: val } })} />
                  <StatBox label="Mana" value={displayChar.resources.pm.current} maxValue={displayChar.resources.pm.max} color="blue" isResource onChange={(val) => { const newRes = { ...displayChar.resources }; newRes.pm.current = val; updateCharacter({ resources: newRes }); }} />
                  <div className="h-px bg-gray-200" />
                  <StatBox label="Resistência" value={displayChar.attributes.resistencia} color="red" onChange={(val) => updateCharacter({ attributes: { ...displayChar.attributes, resistencia: val } })} />
                  <StatBox label="Vida" value={displayChar.resources.pv.current} maxValue={displayChar.resources.pv.max} color="red" isResource onChange={(val) => { const newRes = { ...displayChar.resources }; newRes.pv.current = val; updateCharacter({ resources: newRes }); }} />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="font-header font-bold text-lg text-victory-orange mb-3 border-b border-gray-200 uppercase">INVENTÁRIO</h3>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <label className="text-[10px] font-bold text-gray-400 block uppercase">Comum</label>
                      <input type="number" value={displayChar.inventorySlots.common} onChange={(e) => updateCharacter({ inventorySlots: { ...displayChar.inventorySlots, common: parseInt(e.target.value)||0 } })} className="w-full text-center font-bold border border-gray-200 rounded bg-white p-1 focus:ring-1 focus:ring-victory-orange" />
                    </div>
                    <div className="text-center">
                      <label className="text-[10px] font-bold text-blue-400 block uppercase">Incomum</label>
                      <input type="number" value={displayChar.inventorySlots.uncommon} onChange={(e) => updateCharacter({ inventorySlots: { ...displayChar.inventorySlots, uncommon: parseInt(e.target.value)||0 } })} className="w-full text-center font-bold border border-gray-200 rounded bg-white p-1 focus:ring-1 focus:ring-victory-orange" />
                    </div>
                    <div className="text-center">
                      <label className="text-[10px] font-bold text-victory-orange block uppercase">Raro</label>
                      <input type="number" value={displayChar.inventorySlots.rare} onChange={(e) => updateCharacter({ inventorySlots: { ...displayChar.inventorySlots, rare: parseInt(e.target.value)||0 } })} className="w-full text-center font-bold border border-gray-200 rounded bg-white p-1 focus:ring-1 focus:ring-victory-orange" />
                    </div>
                  </div>
                  <textarea value={displayChar.items} onChange={(e) => updateCharacter({ items: e.target.value })} className="w-full h-32 p-2 text-sm border border-gray-200 rounded bg-white focus:ring-1 focus:ring-victory-orange resize-none" placeholder="Itens e equipamentos..." />
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col gap-2">
                <SectionArea title="Perícias" value={displayChar.skills} onChange={(val) => updateCharacter({ skills: val })} rows={2} type="skills" />
                <SectionArea title="Vantagens" value={displayChar.advantages} onChange={(val) => updateCharacter({ advantages: val })} rows={4} type="advantages" />
                <SectionArea title="Desvantagens" value={displayChar.disadvantages} onChange={(val) => updateCharacter({ disadvantages: val })} rows={3} type="disadvantages" />
                <SectionArea title="Técnicas & Magias" value={displayChar.techniques} onChange={(val) => updateCharacter({ techniques: val })} rows={5} />
                <SectionArea title="História & Anotações" value={displayChar.history} onChange={(val) => updateCharacter({ history: val })} rows={8} />
              </div>
            </div>
          </div>
        </div>
        )}

        {!showDiceRoller && (
          <button onClick={() => setShowDiceRoller(true)} className="fixed bottom-6 right-6 bg-victory-orange text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all z-20">
            <Dices size={28} />
          </button>
        )}
        {showDiceRoller && displayChar && <DiceRoller character={displayChar} onClose={() => setShowDiceRoller(false)} />}
      </main>
    </div>
  );
};

export default App;
