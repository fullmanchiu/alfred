import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export function LoginView() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(username, password, email || undefined);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-zinc-950">
      <div className="w-80 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-1">
          {isRegister ? '注册' : '登录'} Alfred
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          {isRegister ? '创建你的账户' : '输入你的凭据'}
        </p>

        {error && (
          <div className="mb-4 p-2 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm
                         text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm
                         text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
          </div>
          {isRegister && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">邮箱（可选）</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm
                           text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full py-2 rounded-lg bg-white text-black text-sm font-medium
                       hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isLoading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="w-full mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {isRegister ? '已有账户？登录' : '没有账户？注册'}
        </button>
      </div>
    </div>
  );
}
