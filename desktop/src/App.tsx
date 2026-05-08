import { useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { SettingsPanel } from './components/SettingsPanel';

function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const backendUrl = useSettingsStore((s) => s.backendUrl);
  const [showSettings, setShowSettings] = useState(false);

  // If not logged in, show login view
  if (!isLoggedIn) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-white">
      <Sidebar onSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col">
        <ChatView />
      </main>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
