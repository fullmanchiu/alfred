import { create } from 'zustand';
import type { Settings } from '../shared/types';

interface SettingsState extends Settings {
  setSettings: (settings: Partial<Settings>) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const defaultSettings: Settings = {
  backendUrl: 'http://localhost:8080',
  mcpServers: [],
};

const STORAGE_KEY = 'alfred-settings';

function loadFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultSettings;
}

function saveToStorage(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const saved = loadFromStorage();

  return {
    ...saved,

    setSettings: (settings) => set((state) => ({ ...state, ...settings })),

    loadSettings: () => {
      const current = loadFromStorage();
      set(current);
    },

    saveSettings: () => {
      const { setSettings, loadSettings, saveSettings, ...current } = get();
      saveToStorage(current);
    },
  };
});
