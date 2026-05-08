import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TMP_DIR = '/tmp/alfred-playwright-tmp';

export default async function globalTeardown() {
  console.log('[teardown] Cleaning up dev server...');

  const pidFile = join(TMP_DIR, 'pid');
  if (existsSync(pidFile)) {
    const pid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10);
    if (pid > 0) {
      console.log(`[teardown] Killing pid ${pid}`);
      try {
        // macOS: 杀死进程及其子进程
        execSync(`kill -9 ${pid} 2>/dev/null || true`);
        execSync(`pkill -P ${pid} 2>/dev/null || true`);
      } catch {
        // Already dead
      }
    }
  }

  // 确保 Electron 进程被清理
  try {
    execSync('pkill -f "electron.*vite-plugin" 2>/dev/null || true');
  } catch {
    // noop
  }

  console.log('[teardown] Done');
}
