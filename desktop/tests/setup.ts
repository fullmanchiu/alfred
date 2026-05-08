import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TMP_DIR = '/tmp/alfred-playwright-tmp';

export default async function globalSetup() {
  console.log('[setup] Starting Vite dev server...');

  // 清理可能残留的 Electron 进程
  try {
    const { execSync } = await import('child_process');
    execSync('pkill -9 -f "electron.*vite-plugin" 2>/dev/null || true');
    execSync('pkill -9 -f "dist-electron/main" 2>/dev/null || true');
  } catch {
    // noop
  }

  // 启动 Vite dev server（vite-plugin-electron 会自动启动 Electron）
  const proc = spawn('pnpm', ['dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // 收集输出
  let output = '';
  proc.stdout!.on('data', (d) => {
    const text = d.toString();
    output += text;
    process.stdout.write(`[vite] ${text}`);
  });
  proc.stderr!.on('data', (d) => {
    const text = d.toString();
    output += text;
    process.stderr.write(`[vite] ${text}`);
  });

  // 等待 CDP 端口可用
  console.log('[setup] Waiting for CDP port 9222...');
  await waitForCDP(45000);

  // 额外等待确保页面完全加载
  await new Promise((r) => setTimeout(r, 3000));

  // 保存 PID 以便 teardown 清理
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(join(TMP_DIR, 'pid'), String(proc.pid));
  writeFileSync(join(TMP_DIR, 'output.log'), output);

  console.log(`[setup] Dev server ready (pid: ${proc.pid})`);
}

async function waitForCDP(timeout: number) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const resp = await fetch('http://127.0.0.1:9222/json');
      if (resp.ok) {
        const targets = await resp.json() as Array<{ type: string }>;
        if (targets.some((t) => t.type === 'page')) {
          return;
        }
      }
    } catch {
      // CDP not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`CDP port 9222 not available after ${timeout}ms`);
}
