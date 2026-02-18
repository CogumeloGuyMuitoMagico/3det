import React, { useState, useMemo } from 'react';
import { X, Search, PlusCircle } from 'lucide-react';
import { ManualItem } from '../manualData';

interface ReferenceModalProps {
  title: string;
  items: ManualItem[];
  onClose: () => void;
  onAdd: (text: string) => void;
  color: 'orange' | 'blue' | 'red';
}

const ReferenceModal: React.FC<ReferenceModalProps> = ({ title, items, onClose, onAdd, color }) => {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      item.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const headerColors = {
    orange: 'bg-victory-orange',
    blue: 'bg-blue-600',
    red: 'bg-red-600'
  };

  const textColors = {
    orange: 'text-victory-orange',
    blue: 'text-blue-600',
    red: 'text-red-600'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`${headerColors[color]} text-white p-4 flex justify-between items-center`}>
          <h3 className="font-header font-bold text-xl uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome ou regra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center text-gray-400 py-8 italic">Nenhum item encontrado.</div>
          ) : (
            filteredItems.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white shadow-sm">
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <span className={`font-header font-bold text-lg ${textColors[color]}`}>{item.name}</span>
                    <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{item.cost}</span>
                  </div>
                  <button 
                    onClick={() => {
                       onAdd(`${item.name} (${item.cost})`);
                       // Optional: Close on add? No, user might want to add multiple.
                    }}
                    className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide bg-white border border-gray-300 px-3 py-1 rounded hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-all active:scale-95"
                  >
                    <PlusCircle size={14} /> Adicionar
                  </button>
                </div>
                <div className="p-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-100 text-center text-xs text-gray-400 border-t border-gray-200">
           Manual 3DeT Victory
        </div>
      </div>
    </div>
  );
};

export default ReferenceModal;