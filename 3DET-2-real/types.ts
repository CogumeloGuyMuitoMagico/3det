
export interface Attributes {
  poder: number;
  habilidade: number;
  resistencia: number;
}

export interface Resources {
  pa: { current: number; max: number };
  pm: { current: number; max: number };
  pv: { current: number; max: number };
}

export interface Folder {
  id: string;
  name: string;
  isOpen: boolean;
  parentId?: string; // Suporte para pastas dentro de pastas
}

export interface Character {
  id: string;
  folderId?: string; // Links character to a folder
  name: string;
  archetype: string;
  scale: string;
  points: number;
  xp: number;
  attributes: Attributes;
  savedAttributes?: Attributes; // Atributos salvos antes do Modo Ação
  isActionMode: boolean; // Estado do Modo Ação individual
  resources: Resources;
  advantages: string;
  disadvantages: string;
  skills: string;
  techniques: string;
  items: string;
  history: string;
  inventorySlots: {
    common: number;
    uncommon: number;
    rare: number;
  };
  portrait: string | null; // Base64 string
}

export const INITIAL_CHARACTER: Character = {
  id: '',
  name: 'Novo Personagem',
  archetype: 'Humano',
  scale: 'Ningen',
  points: 10,
  xp: 0,
  attributes: {
    poder: 0,
    habilidade: 0,
    resistencia: 0,
  },
  isActionMode: false,
  resources: {
    pa: { current: 0, max: 0 },
    pm: { current: 0, max: 0 },
    pv: { current: 0, max: 0 },
  },
  advantages: '',
  disadvantages: '',
  skills: '',
  techniques: '',
  items: '',
  history: '',
  inventorySlots: {
    common: 0,
    uncommon: 0,
    rare: 0
  },
  portrait: null,
};
