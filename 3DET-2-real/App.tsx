
import React, { useState, useEffect, useRef } from 'react';
import { Character, Folder, INITIAL_CHARACTER } from './types';
import { generateId, exportCharacterImage, importCharacterFromImage, calculateResources } from './utils';
import StatBox from './components/StatBox';
import SectionArea from './components/SectionArea';
import DiceRoller from './components/DiceRoller';
import { Menu, X, Plus, Trash2, Download, Upload, User, Camera, PanelLeftClose, PanelLeftOpen, Dices, FolderPlus, Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, FileText, Zap, HeartPulse } from 'lucide-react';

// Componente de Item da Lista
interface CharacterItemProps {
  char: Character;
  nested?: boolean;
  activeId: string | null;
  draggedCharId: string | null;
  onDragStart: (e: React.DragEvent, charId: string) => void;
  onSelect: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const CharacterItem: React.FC<CharacterItemProps> = ({ 
  char, 
  nested = false, 
  activeId, 
  draggedCharId, 
  onDragStart, 
  onSelect, 
  onDelete 
}) => (
  <div 
    draggable
    onDragStart={(e) => onDragStart(e, char.id)}
    onClick={onSelect}
    className={`
      relative p-2 pl-3 cursor-grab active:cursor-grabbing flex justify-between items-center group transition-colors rounded-sm mb-0.5
      ${nested ? 'ml-4 border-l-2 border-gray-600' : ''}
      ${activeId === char.id 
        ? 'bg-victory-orange text-white' 
        : 'hover:bg-gray-700 text-gray-300'
      }
      ${draggedCharId === char.id ? 'opacity-50' : ''}
    `}
  >
    <div className="flex items-center gap-2 overflow-hidden">
      <FileText size={14} className={activeId === char.id ? 'text-white' : 'text-gray-500'} />
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
  const [isActionMode, setIsActionMode] = useState(false);
  const [draggedCharId, setDraggedCharId] = useState<string | null>(null);
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
    const newChar: Character = {
      ...INITIAL_CHARACTER,
      id: generateId(),
      name: 'Novo Herói',
      folderId: folderId
    };
    setCharacters((prev) => [...prev, newChar]);
    setActiveId(newChar.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const createFolder = () => {
    const name = prompt("Nome da nova pasta:");
    if (name) {
      const newFolder: Folder = { id: generateId(), name, isOpen: true };
      setFolders(prev => [...prev, newFolder]);
    }
  };

  const deleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Excluir pasta? As fichas dentro dela voltarão para a raiz.")) {
      setCharacters(prev => prev.map(c => c.folderId === id ? { ...c, folderId: undefined } : c));
      setFolders(prev => prev.filter(f => f.id !== id));
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
        
        const oldAttributes = char.attributes;
        const updatedChar = { ...char, ...updates };

        // Recalcular recursos se atributos OU vantagens mudarem
        if (updates.attributes || updates.advantages !== undefined) {
          const newResourcesMax = calculateResources(updatedChar.attributes, updatedChar.advantages);
          const newResources = { ...updatedChar.resources };

          // Atualiza Máximos
          newResources.pa.max = newResourcesMax.pa;
          newResources.pm.max = newResourcesMax.pm;
          newResources.pv.max = newResourcesMax.pv;

          // Se não estiver em modo ação, ou se atributos básicos mudaram, reseta os correntes para o novo máximo
          if (!isActionMode || updates.attributes) {
            newResources.pa.current = newResourcesMax.pa;
            newResources.pm.current = newResourcesMax.pm;
            newResources.pv.current = newResourcesMax.pv;
          }

          updatedChar.resources = newResources;
        }
        
        return updatedChar;
      })
    );
  };

  const toggleActionMode = () => {
    if (!activeChar) return;
    const nextMode = !isActionMode;
    setIsActionMode(nextMode);

    if (nextMode) {
      // Ligando Modo Ação: Salva os atributos atuais para restauração posterior
      updateCharacter({ savedAttributes: { ...activeChar.attributes } });
    } else {
      // Desligando Modo Ação: Restaura os atributos originais
      if (activeChar.savedAttributes) {
        updateCharacter({ 
          attributes: { ...activeChar.savedAttributes }, 
          savedAttributes: undefined 
        });
      }
    }
  };

  const refillResources = () => {
    if (!activeChar) return;
    const newResources = {
      pa: { ...activeChar.resources.pa, current: activeChar.resources.pa.max },
      pm: { ...activeChar.resources.pm, current: activeChar.resources.pm.max },
      pv: { ...activeChar.resources.pv, current: activeChar.resources.pv.max },
    };
    updateCharacter({ resources: newResources });
  };

  const handleDragStart = (e: React.DragEvent, charId: string) => {
    setDraggedCharId(charId);
    e.dataTransfer.setData("charId", charId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const charId = e.dataTransfer.getData("charId");
    if (charId) {
      setCharacters(prev => prev.map(c => c.id === charId ? { ...c, folderId } : c));
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, isOpen: true } : f));
    }
    setDraggedCharId(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    const charId = e.dataTransfer.getData("charId");
    if (charId) {
      setCharacters(prev => prev.map(c => c.id === charId ? { ...c, folderId: undefined } : c));
    }
    setDraggedCharId(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const char = await importCharacterFromImage(file);
      setCharacters((prev) => [...prev, char]);
      setActiveId(char.id);
      setIsSidebarOpen(false);
    } catch (err) {
      alert("Falha ao importar.");
    }
  };

  const handleExport = () => {
    if (sheetRef.current && activeChar) {
      exportCharacterImage(sheetRef.current, activeChar);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCharacter({ portrait: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const activeChar = characters.find((c) => c.id === activeId) || characters[0];

  if (!activeChar) return <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-500">Carregando...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-body text-gray-800">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside 
        className={`fixed md:relative z-30 h-full bg-victory-dark text-gray-200 shadow-xl transform transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-0 overflow-hidden'}
        `}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-black/20 shrink-0">
          <h1 className="font-header text-2xl font-bold text-victory-orange">3DeT Victory</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {folders.map(folder => (
            <div key={folder.id} onDragOver={handleDragOver} onDrop={(e) => handleDropOnFolder(e, folder.id)} className="rounded mb-1">
              <div onClick={(e) => toggleFolder(folder.id, e)} className={`flex justify-between items-center p-2 cursor-pointer hover:bg-gray-700 transition-colors rounded ${folder.isOpen ? 'bg-gray-800' : ''}`}>
                 <div className="flex items-center gap-2 text-gray-300">
                    {folder.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {folder.isOpen ? <FolderOpen size={16} className="text-victory-orange" /> : <FolderIcon size={16} />}
                    <span className="text-sm font-bold truncate max-w-[120px]">{folder.name}</span>
                 </div>
                 <button onClick={(e) => deleteFolder(folder.id, e)} className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={12} />
                 </button>
              </div>
              {folder.isOpen && (
                <div className="mt-0.5">
                   {characters.filter(c => c.folderId === folder.id).map(char => (
                      <CharacterItem 
                        key={char.id} char={char} nested={true} activeId={activeId}
                        draggedCharId={draggedCharId} onDragStart={handleDragStart}
                        onSelect={() => { setActiveId(char.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                        onDelete={deleteCharacter}
                      />
                   ))}
                </div>
              )}
            </div>
          ))}
          {folders.length > 0 && <div className="h-px bg-gray-700 my-2 mx-2" />}
          <div className="min-h-[50px]" onDragOver={handleDragOver} onDrop={handleDropOnRoot}>
             {characters.filter(c => !c.folderId).map(char => (
                <CharacterItem 
                  key={char.id} char={char} activeId={activeId} draggedCharId={draggedCharId}
                  onDragStart={handleDragStart}
                  onSelect={() => { setActiveId(char.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                  onDelete={deleteCharacter}
                />
             ))}
          </div>
        </div>

        <div className="p-4 bg-black/20 border-t border-gray-700 grid grid-cols-2 gap-2 shrink-0">
          <button onClick={() => createNewCharacter()} className="flex items-center justify-center gap-1 bg-victory-orange hover:bg-orange-600 text-white py-2 rounded font-bold text-xs transition-colors">
            <Plus size={16} /> Ficha
          </button>
          <button onClick={createFolder} className="flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold text-xs transition-colors">
            <FolderPlus size={16} /> Pasta
          </button>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto relative">
        <header className="sticky top-0 z-10 bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-victory-dark">
              <Menu size={28} />
            </button>
            <button onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} className="hidden md:block text-victory-dark hover:text-victory-orange transition-colors">
              {isDesktopSidebarOpen ? <PanelLeftClose size={28} /> : <PanelLeftOpen size={28} />}
            </button>
            <h2 className="font-header text-xl font-bold text-gray-600 hidden sm:block">Editor de Personagem</h2>
          </div>
          <div className="flex gap-2 border-gray-200 border-l pl-4">
            <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors text-sm font-medium">
              <Upload size={18} />
              <span className="hidden sm:inline">Importar</span>
              <input type="file" accept="image/png" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm font-medium">
              <Download size={18} /> <span className="hidden sm:inline">Exportar PNG</span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex justify-center">
          <div ref={sheetRef} className="bg-white w-full max-w-5xl shadow-2xl rounded-lg overflow-hidden border border-gray-200" style={{ minHeight: '1000px' }}>
            
            <div className="bg-victory-dark text-white p-6 border-b-4 border-victory-orange">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="flex items-center gap-4">
                   <div className="text-5xl font-header font-bold text-victory-orange">3DeT</div>
                   <div className="text-3xl font-header font-bold tracking-wider">VICTORY</div>
                </div>
                <div className="bg-white/10 p-4 rounded backdrop-blur-sm">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-victory-yellow uppercase font-bold mb-1">Nome</label>
                      <input type="text" value={activeChar.name} onChange={(e) => updateCharacter({ name: e.target.value })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-xl font-header font-bold" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-victory-yellow uppercase font-bold mb-1">Arquétipo</label>
                      <input type="text" value={activeChar.archetype} onChange={(e) => updateCharacter({ archetype: e.target.value })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-lg" />
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="block text-xs text-victory-yellow uppercase font-bold mb-1">Pontos</label>
                      <input 
                        type="number" 
                        value={activeChar.points} 
                        onChange={(e) => updateCharacter({ points: parseInt(e.target.value) || 0 })} 
                        className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-center font-bold" 
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <label className="block text-xs text-victory-yellow uppercase font-bold mb-1">XP</label>
                      <input 
                        type="number" 
                        value={activeChar.xp} 
                        onChange={(e) => updateCharacter({ xp: parseInt(e.target.value) || 0 })} 
                        className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none text-center" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-victory-yellow uppercase font-bold mb-1">Escala</label>
                      <input type="text" value={activeChar.scale} onChange={(e) => updateCharacter({ scale: e.target.value })} className="w-full bg-transparent border-b border-victory-yellow/50 focus:border-victory-yellow focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-5 flex flex-col gap-6">
                
                <div className="w-full aspect-square bg-gray-50 rounded-lg relative group overflow-hidden border border-gray-200 flex items-center justify-center">
                  {activeChar.portrait ? (
                    <img src={activeChar.portrait} alt="Portrait" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-gray-200" />
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Camera size={32} className="text-white" />
                  </label>
                </div>

                <div className="flex gap-2 w-full">
                  <button 
                    onClick={toggleActionMode}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all border ${isActionMode ? 'bg-victory-orange text-white border-victory-orange shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Zap size={14} fill={isActionMode ? "white" : "none"} />
                    {isActionMode ? 'MODO AÇÃO: ON' : 'MODO AÇÃO: OFF'}
                  </button>
                  <button 
                    onClick={refillResources}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg font-bold text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all"
                  >
                    <HeartPulse size={14} />
                    RESTAURAR
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4 shadow-sm overflow-hidden">
                  {/* Linha 1: Poder e Ação */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1"><StatBox label="Poder" value={activeChar.attributes.poder} color="orange" onChange={(val) => updateCharacter({ attributes: { ...activeChar.attributes, poder: val } })} /></div>
                    <div className="flex-1"><StatBox label="Ação" value={activeChar.resources.pa.current} maxValue={activeChar.resources.pa.max} color="orange" isResource onChange={(val) => { const newRes = { ...activeChar.resources }; newRes.pa.current = val; updateCharacter({ resources: newRes }); }} /></div>
                  </div>
                  
                  {/* Linha 2: Habilidade e Mana */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1"><StatBox label="Habilidade" value={activeChar.attributes.habilidade} color="blue" onChange={(val) => updateCharacter({ attributes: { ...activeChar.attributes, habilidade: val } })} /></div>
                    <div className="flex-1"><StatBox label="Mana" value={activeChar.resources.pm.current} maxValue={activeChar.resources.pm.max} color="blue" isResource onChange={(val) => { const newRes = { ...activeChar.resources }; newRes.pm.current = val; updateCharacter({ resources: newRes }); }} /></div>
                  </div>

                  {/* Linha 3: Resistência e Vida */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1"><StatBox label="Resistência" value={activeChar.attributes.resistencia} color="red" onChange={(val) => updateCharacter({ attributes: { ...activeChar.attributes, resistencia: val } })} /></div>
                    <div className="flex-1"><StatBox label="Vida" value={activeChar.resources.pv.current} maxValue={activeChar.resources.pv.max} color="red" isResource onChange={(val) => { const newRes = { ...activeChar.resources }; newRes.pv.current = val; updateCharacter({ resources: newRes }); }} /></div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="font-header font-bold text-lg text-victory-orange mb-3 border-b border-gray-200 uppercase">INVENTÁRIO</h3>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <label className="text-[10px] font-bold text-gray-400 block">Comum</label>
                      <input type="number" value={activeChar.inventorySlots.common} onChange={(e) => updateCharacter({ inventorySlots: { ...activeChar.inventorySlots, common: parseInt(e.target.value)||0 } })} className="w-full text-center font-bold border border-gray-200 rounded bg-white p-1 focus:ring-1 focus:ring-victory-orange" />
                    </div>
                    <div className="text-center">
                      <label className="text-[10px] font-bold text-blue-400 block">Incomum</label>
                      <input type="number" value={activeChar.inventorySlots.uncommon} onChange={(e) => updateCharacter({ inventorySlots: { ...activeChar.inventorySlots, uncommon: parseInt(e.target.value)||0 } })} className="w-full text-center font-bold border border-gray-200 rounded bg-white p-1 focus:ring-1 focus:ring-victory-orange" />
                    </div>
                    <div className="text-center">
                      <label className="text-[10px] font-bold text-victory-orange block">Raro</label>
                      <input type="number" value={activeChar.inventorySlots.rare} onChange={(e) => updateCharacter({ inventorySlots: { ...activeChar.inventorySlots, rare: parseInt(e.target.value)||0 } })} className="w-full text-center font-bold border border-gray-200 rounded bg-white p-1 focus:ring-1 focus:ring-victory-orange" />
                    </div>
                  </div>
                  <textarea value={activeChar.items} onChange={(e) => updateCharacter({ items: e.target.value })} className="w-full h-32 p-2 text-sm border border-gray-200 rounded bg-white focus:ring-1 focus:ring-victory-orange resize-none" placeholder="Itens e equipamentos..." />
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col gap-2">
                <SectionArea title="Perícias" value={activeChar.skills} onChange={(val) => updateCharacter({ skills: val })} rows={2} type="skills" />
                <SectionArea title="Vantagens" value={activeChar.advantages} onChange={(val) => updateCharacter({ advantages: val })} rows={4} type="advantages" />
                <SectionArea title="Desvantagens" value={activeChar.disadvantages} onChange={(val) => updateCharacter({ disadvantages: val })} rows={3} type="disadvantages" />
                <SectionArea title="Técnicas & Magias" value={activeChar.techniques} onChange={(val) => updateCharacter({ techniques: val })} rows={5} />
                <SectionArea title="História & Anotações" value={activeChar.history} onChange={(val) => updateCharacter({ history: val })} rows={8} />
              </div>
            </div>
          </div>
        </div>

        {!showDiceRoller && (
          <button onClick={() => setShowDiceRoller(true)} className="fixed bottom-6 right-6 bg-victory-orange text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all z-20">
            <Dices size={28} />
          </button>
        )}
        {showDiceRoller && <DiceRoller character={activeChar} onClose={() => setShowDiceRoller(false)} />}
      </main>
    </div>
  );
};

export default App;
