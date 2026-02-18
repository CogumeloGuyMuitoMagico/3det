
import html2canvas from 'html2canvas';
import { Character, INITIAL_CHARACTER, Attributes } from './types';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Separator signature to identify our data in the image binary
const SEPARATOR = "###3DET_DATA###";

export const exportCharacterImage = async (element: HTMLElement, character: Character) => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // High resolution
      useCORS: true,
    });

    canvas.toBlob((blob) => {
      if (!blob) return;

      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        
        // Convert Character data to string then to Uint8Array
        const jsonString = JSON.stringify(character);
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(SEPARATOR + jsonString);
        
        // Combine Image Bytes + Data Bytes
        const newBuffer = new Uint8Array(arrayBuffer.byteLength + dataBytes.length);
        newBuffer.set(new Uint8Array(arrayBuffer), 0);
        newBuffer.set(dataBytes, arrayBuffer.byteLength);

        // Download
        const finalBlob = new Blob([newBuffer], { type: 'image/png' });
        const url = URL.createObjectURL(finalBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_3det.png`;
        link.click();
        URL.revokeObjectURL(url);
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  } catch (error) {
    console.error("Export failed", error);
    alert("Erro ao exportar imagem.");
  }
};

export const importCharacterFromImage = (file: File): Promise<Character> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const decoder = new TextDecoder();
        const text = decoder.decode(arrayBuffer);
        
        // Find the separator
        const parts = text.split(SEPARATOR);
        if (parts.length < 2) {
          reject(new Error("Imagem não contém dados de ficha válidos."));
          return;
        }

        // The last part should be the JSON
        const jsonString = parts[parts.length - 1];
        const loadedData = JSON.parse(jsonString);
        
        // Migration Logic for old files (inventory -> history, add scale)
        const character: Character = {
          ...INITIAL_CHARACTER,
          ...loadedData,
          items: loadedData.items || '',
          history: loadedData.history || loadedData.inventory || '',
          scale: loadedData.scale || 'Ningen',
        };
        
        // Refresh ID to avoid conflicts
        character.id = generateId();
        resolve(character);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
    reader.readAsArrayBuffer(file);
  });
};

const romanToNum = (roman: string): number => {
  const map: { [key: string]: number } = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let total = 0;
  const upperRoman = roman.toUpperCase();
  for (let i = 0; i < upperRoman.length; i++) {
    const current = map[upperRoman[i]];
    const next = map[upperRoman[i + 1]];
    if (next && next > current) {
      total += next - current;
      i++;
    } else {
      total += current || 0;
    }
  }
  return total;
};

const getAdvantageLevel = (text: string, keyPattern: string): number => {
  // Regex para encontrar "+Vantagem", "+Vantagem 2", "+Vantagem II", "+Vantagem (3)", "+Vantagem x2"
  const regex = new RegExp(`\\+ ?${keyPattern}\\s*(?:x|\\()?(\\d+|[IVXLCDM]+)?\\)?`, 'gi');
  let totalLevel = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const val = match[1];
    if (!val) {
      totalLevel += 1;
    } else if (/^\d+$/.test(val)) {
      totalLevel += parseInt(val, 10);
    } else {
      const romanVal = romanToNum(val);
      totalLevel += romanVal > 0 ? romanVal : 1;
    }
  }
  return totalLevel;
};

export const calculateResources = (attr: Attributes, advantages: string) => {
  const paBonus = getAdvantageLevel(advantages, 'A[çc][ãa]o') * 2;
  const pmBonus = getAdvantageLevel(advantages, 'Mana') * 10;
  const pvBonus = getAdvantageLevel(advantages, 'Vida') * 10;

  return {
    pa: Math.max(0, attr.poder) + paBonus,
    pm: Math.max(1, attr.habilidade * 5) + pmBonus,
    pv: Math.max(1, attr.resistencia * 5) + pvBonus
  };
};
