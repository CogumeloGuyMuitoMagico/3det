
import React, { useState, useEffect, useRef } from 'react';
import { X, Dices, RotateCcw } from 'lucide-react';
import { Character } from '../types';

interface DiceRollerProps {
  character: Character;
  onClose: () => void;
}

interface RollHistory {
  id: number;
  diceResults: number[];
  attributeName: string;
  attributeValue: number;
  isCrit: boolean;
  bonus: number;
  total: number;
  timestamp: string;
}

// Subcomponente para inputs numéricos com UX melhorada (mesmo padrão do StatBox)
const LocalNumericInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  className?: string;
}> = ({ label, value, onChange, min, max, className = "" }) => {
  // O segredo está em usar uma string local para permitir campo vazio enquanto o usuário digita
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    // Sincroniza se o valor mudar externamente (ex: limpando histórico)
    if (inputValue !== value.toString()) {
      setInputValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val); // Permite digitar qualquer coisa (inclusive vazio)
    
    if (val !== '') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        onChange(parsed); // Atualiza o estado real se for um número válido
      }
    }
  };

  const handleBlur = () => {
    // Quando sai do campo, se estiver vazio, volta para o valor anterior ou 0
    if (inputValue === '') {
      setInputValue(value.toString());
    } else {
      const parsed = parseInt(inputValue, 10);
      if (isNaN(parsed)) {
        setInputValue(value.toString());
      } else {
        let finalVal = parsed;
        if (min !== undefined) finalVal = Math.max(min, finalVal);
        if (max !== undefined) finalVal = Math.min(max, finalVal);
        onChange(finalVal);
        setInputValue(finalVal.toString());
      }
    }
  };

  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{label}</label>
      <input 
        type="number" 
        value={inputValue} 
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full border border-gray-300 rounded p-1 text-center font-bold text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-victory-orange ${className}`}
      />
    </div>
  );
};

const DiceRoller: React.FC<DiceRollerProps> = ({ character, onClose }) => {
  const [selectedAttr, setSelectedAttr] = useState<'poder' | 'habilidade' | 'resistencia' | null>('poder');
  const [bonus, setBonus] = useState(0);
  const [diceCount, setDiceCount] = useState(1);
  const [critRange, setCritRange] = useState(6);
  const [history, setHistory] = useState<RollHistory[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleRoll = () => {
    const results: number[] = [];
    let isCrit = false;

    for (let i = 0; i < Math.max(1, diceCount); i++) {
      const val = Math.ceil(Math.random() * 6);
      results.push(val);
      if (val >= critRange) {
        isCrit = true;
      }
    }

    let attrValue = 0;
    let attrName = 'Nenhum';
    
    if (selectedAttr) {
      attrValue = character.attributes[selectedAttr];
      attrName = selectedAttr.charAt(0).toUpperCase();
    }

    const effectiveAttr = isCrit ? attrValue * 2 : attrValue;
    const diceSum = results.reduce((a, b) => a + b, 0);
    const total = diceSum + effectiveAttr + bonus;

    const newRoll: RollHistory = {
      id: Date.now(),
      diceResults: results,
      attributeName: attrName,
      attributeValue: effectiveAttr,
      isCrit,
      bonus,
      total,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setHistory(prev => [...prev, newRoll]);
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-2xl border-2 border-victory-orange overflow-hidden z-50 flex flex-col font-body animate-in slide-in-from-bottom-5 fade-in duration-300">
      
      <div className="bg-victory-dark text-white p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Dices size={20} className="text-victory-orange" />
          <h3 className="font-header font-bold text-lg">Rolador de Dados</h3>
        </div>
        <button onClick={onClose} className="hover:text-victory-orange transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 bg-white border-b border-gray-200">
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Atributo</label>
          <div className="flex bg-white rounded border border-gray-300 overflow-hidden shadow-sm">
            {(['poder', 'habilidade', 'resistencia'] as const).map((attr) => (
              <button
                key={attr}
                onClick={() => setSelectedAttr(attr)}
                className={`flex-1 py-1 text-sm font-bold transition-colors border-r last:border-r-0 border-gray-200
                  ${selectedAttr === attr 
                    ? (attr === 'poder' ? 'bg-victory-orange text-white' : attr === 'habilidade' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white')
                    : 'hover:bg-gray-100 text-gray-600'
                  }`}
              >
                {attr.charAt(0).toUpperCase()} ({character.attributes[attr]})
              </button>
            ))}
            <button
              onClick={() => setSelectedAttr(null)}
              className={`flex-1 py-1 text-sm font-bold transition-colors ${selectedAttr === null ? 'bg-gray-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              -
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <LocalNumericInput 
            label="Bônus" 
            value={bonus} 
            onChange={setBonus} 
          />
          <LocalNumericInput 
            label="Dados" 
            value={diceCount} 
            onChange={setDiceCount} 
            min={1} 
          />
          <LocalNumericInput 
            label="Crítico" 
            value={critRange} 
            onChange={setCritRange} 
            min={1} 
            max={6} 
            className="text-red-600" 
          />
        </div>

        <button 
          onClick={handleRoll}
          className="w-full bg-victory-orange hover:bg-orange-600 text-white font-header font-bold py-2 rounded shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Dices size={18} /> ROLAR
        </button>
      </div>

      <div className="bg-gray-100 h-48 overflow-y-auto p-3 flex flex-col gap-2">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm italic">
            <Dices size={32} className="mb-2 opacity-20" />
            Nenhuma rolagem ainda.
          </div>
        )}
        
        {history.map((roll) => (
          <div key={roll.id} className="bg-white p-2 rounded border border-gray-200 shadow-sm text-sm">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-gray-100">
              <span className="text-xs text-gray-500">{roll.timestamp}</span>
              {roll.isCrit && <span className="text-xs font-bold text-victory-orange bg-orange-100 px-1 rounded">CRÍTICO!</span>}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                 <div className="text-xs text-gray-600">
                   Dados: [{roll.diceResults.join(', ')}]
                 </div>
                 <div className="text-xs text-gray-400">
                   {roll.diceResults.reduce((a,b)=>a+b, 0)} + {roll.attributeName}({roll.attributeValue}) {roll.bonus >= 0 ? `+ ${roll.bonus}` : roll.bonus}
                 </div>
              </div>
              <div className="text-2xl font-header font-bold text-victory-dark">
                {roll.total}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {history.length > 0 && (
        <div className="bg-gray-50 p-1 flex justify-end">
           <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 px-2 py-1">
             <RotateCcw size={12} /> Limpar
           </button>
        </div>
      )}
    </div>
  );
};

export default DiceRoller;
