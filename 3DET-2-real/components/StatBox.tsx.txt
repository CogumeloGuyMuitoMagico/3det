
import React, { useState, useEffect } from 'react';

interface StatBoxProps {
  label: string;
  value: number;
  onChange?: (val: number) => void;
  color: 'orange' | 'blue' | 'red';
  isResource?: boolean;
  maxValue?: number;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, onChange, color, isResource, maxValue }) => {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    if (inputValue !== '' && parseInt(inputValue, 10) !== value) {
      setInputValue(value.toString());
    } else if (inputValue === '' && value !== 0) {
      setInputValue(value.toString());
    }
  }, [value]);

  // Cores de Atributos: Baseadas nas cores originais do 3DeT Victory
  const attrStyles = {
    orange: 'text-victory-orange border-victory-orange',
    blue: 'text-blue-600 border-blue-600',
    red: 'text-red-600 border-red-600'
  };

  // Cores de Recursos: Apenas um pouco mais escuras para contraste (Tons 700/800)
  const resourceStyles = {
    orange: 'text-orange-700 border-orange-700',
    blue: 'text-blue-800 border-blue-800',
    red: 'text-red-800 border-red-800'
  };

  const currentStyle = isResource ? resourceStyles[color] : attrStyles[color];

  const handleBlur = () => {
    if (inputValue === '') {
      setInputValue(value.toString());
    } else {
      const parsed = parseInt(inputValue, 10);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      } else {
        setInputValue(value.toString());
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val !== '') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      }
    }
  };

  return (
    <div className={`flex items-baseline border-b-2 pb-0.5 w-full overflow-hidden transition-colors ${currentStyle}`}>
      {/* Rótulo (Label) */}
      <span className="w-24 sm:w-28 shrink-0 font-header font-bold text-base sm:text-lg uppercase tracking-tight leading-none truncate">
        {label}
      </span>
      
      {/* Área de Valor */}
      <div className="flex items-baseline min-w-0">
        {onChange ? (
          <input 
            type="number" 
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-12 text-left font-bold text-base sm:text-xl bg-transparent focus:outline-none focus:ring-0 appearance-none border-none p-0 m-0"
            style={{ MozAppearance: 'textfield' }}
          />
        ) : (
          <span className="w-12 text-left text-base sm:text-xl font-bold">{value}</span>
        )}

        {isResource && maxValue !== undefined && (
          <div className="flex items-baseline -ml-3">
            <span className="text-xs font-bold opacity-40 px-0.5">/</span>
            <span className="text-sm font-bold opacity-70">{maxValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatBox;
