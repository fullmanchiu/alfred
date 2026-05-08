import { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore();
  const [localBackendUrl, setBackendUrl] = useState(settings.backendUrl);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    settings.setSettings({ backendUrl: localBackendUrl });
    settings.saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">后端地址</label>
            <input
              type="text"
              value={localBackendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-zinc-600 placeholder-zinc-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-zinc-800">
          <span className={`text-sm transition-opacity ${saved ? 'opacity-100' : 'opacity-0'} text-green-400`}>
            ✓ 已保存
          </span>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-white text-black text-sm font-medium
                       hover:bg-zinc-200 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
