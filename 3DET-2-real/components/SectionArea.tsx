import React, { useState } from 'react';
import { BookOpen, ArrowDownAZ } from 'lucide-react';
import ReferenceModal from './ReferenceModal';
import { PERICIAS, VANTAGENS, DESVANTAGENS, ManualItem } from '../manualData';

interface SectionAreaProps {
  title: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  type?: 'skills' | 'advantages' | 'disadvantages' | 'none';
}

const SectionArea: React.FC<SectionAreaProps> = ({ title, value, onChange, rows = 4, type = 'none' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getModalData = (): { items: ManualItem[], color: 'orange' | 'blue' | 'red' } | null => {
    switch (type) {
      case 'skills': return { items: PERICIAS, color: 'blue' };
      case 'advantages': return { items: VANTAGENS, color: 'orange' };
      case 'disadvantages': return { items: DESVANTAGENS, color: 'red' };
      default: return null;
    }
  };

  const handleOrganize = () => {
    if (!value.trim()) return;

    // 1. Separar itens respeitando parênteses
    const items: string[] = [];
    let buffer = '';
    let parenDepth = 0;

    for (const char of value) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;

      if (char === ',' && parenDepth === 0) {
        const trimmed = buffer.trim();
        if (trimmed) items.push(trimmed);
        buffer = '';
      } else {
        buffer += char;
      }
    }
    // Adicionar o último item que sobrou no buffer
    if (buffer.trim()) items.push(buffer.trim());

    // 2. Separar itens prioritários (terminados em ;) dos normais
    const priorityItems: string[] = [];
    const normalItems: string[] = [];

    items.forEach(item => {
      // Remove espaços extras internos se necessário, mas mantém a string limpa
      const cleanItem = item.trim();
      if (cleanItem.endsWith(';')) {
        priorityItems.push(cleanItem);
      } else {
        normalItems.push(cleanItem);
      }
    });

    // 3. Ordenar alfabeticamente (localeCompare para acentos corretos em PT-BR)
    priorityItems.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    normalItems.sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // 4. Juntar tudo
    const sortedValue = [...priorityItems, ...normalItems].join(', ');
    onChange(sortedValue);
  };

  const handleAdd = (textToAdd: string) => {
    const separator = value.trim().length > 0 ? (value.trim().endsWith(',') ? ' ' : ', ') : '';
    const newValue = value.trim() + separator + textToAdd;
    onChange(newValue);
  };

  const modalData = getModalData();

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end border-b border-gray-200 mb-2">
        <h3 className="font-header font-bold text-lg text-victory-orange uppercase">
          {title}
        </h3>
        
        <div className="flex items-center gap-3 pb-1">
          <button
            onClick={handleOrganize}
            className="text-xs flex items-center gap-1 text-gray-500 hover:text-victory-orange transition-colors"
            title="Organizar alfabeticamente (Itens com ';' primeiro)"
          >
            <ArrowDownAZ size={14} />
            <span className="hidden sm:inline">Organizar</span>
          </button>

          {modalData && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-xs flex items-center gap-1 text-gray-500 hover:text-victory-orange transition-colors"
              title="Ver lista do manual"
            >
              <BookOpen size={14} />
              <span className="hidden sm:inline">Manual</span>
            </button>
          )}
        </div>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-victory-orange focus:border-transparent text-sm leading-relaxed resize-none bg-white"
        rows={rows}
        placeholder={`Liste suas ${title.toLowerCase()}...`}
      />

      {isModalOpen && modalData && (
        <ReferenceModal
          title={`Lista de ${title}`}
          items={modalData.items}
          color={modalData.color}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
};

export default SectionArea;