
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

  const themeColors = {
    orange: 'text-victory-orange border-victory-orange',
    blue: 'text-blue-600 border-blue-600',
    red: 'text-red-600 border-red-600'
  };

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
    <div className={`flex items-baseline border-b-2 ${themeColors[color]} pb-0.5 w-full overflow-hidden`}>
      {/* Nome do atributo - largura reduzida e flexível para não empurrar o resto para fora */}
      <span className={`w-24 sm:w-28 shrink-0 font-header font-bold text-base sm:text-lg uppercase tracking-tighter leading-none truncate ${themeColors[color].split(' ')[0]}`}>
        {label}
      </span>
      
      {/* Valor e Recurso Máximo colados no nome */}
      <div className="flex items-baseline min-w-0">
        {onChange ? (
          <input 
            type="number" 
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-10 text-left font-bold text-base sm:text-lg bg-transparent focus:outline-none focus:ring-0 appearance-none border-none p-0 m-0"
            style={{ MozAppearance: 'textfield' }}
          />
        ) : (
          <span className="w-10 text-left text-base sm:text-lg font-bold">{value}</span>
        )}

        {isResource && maxValue !== undefined && (
          <div className="flex items-baseline -ml-2">
            <span className="text-[10px] font-bold text-gray-400">/</span>
            <span className="text-xs font-bold text-gray-400">{maxValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatBox;
