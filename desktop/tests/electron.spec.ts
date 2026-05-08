import WebSocket from 'ws';
import { test, expect } from '@playwright/test';

/**
 * 通过 Electron CDP 页面 WebSocket 直接操作页面。
 * 不使用 connectOverCDP（对 Electron 兼容性差），而是连接 page-level WebSocket。
 */
class CDPPage {
  private ws: WebSocket | null = null;
  private id = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  async connect() {
    // 获取 page target
    const resp = await fetch('http://127.0.0.1:9222/json');
    const targets = (await resp.json()) as Array<{ webSocketDebuggerUrl: string; type: string; title: string; url: string }>;

    console.log('[CDP] Available targets:', JSON.stringify(targets.map((t) => ({ type: t.type, title: t.title, url: t.url }))));

    // 找到主页面：类型为 page，且不是 DevTools
    const pageTarget = targets.find((t) => t.type === 'page' && !t.url.includes('devtools'));
    if (!pageTarget) {
      throw new Error('No page target found. Available: ' + JSON.stringify(targets.map((t) => ({ type: t.type, title: t.title }))));
    }

    console.log('[CDP] Connecting to:', pageTarget.url);

    this.ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      this.ws!.on('open', () => resolve());
      this.ws!.on('error', reject);
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(JSON.stringify(msg.error)));
        } else {
          pending.resolve(msg.result);
        }
      }
    });
  }

  private async send(method: string, params: Record<string, any> = {}) {
    if (!this.ws) throw new Error('Not connected');
    const id = ++this.id;
    const promise = new Promise<any>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.ws.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  async evaluate(expression: string) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result?.result?.value;
  }

  async fill(selector: string, value: string) {
    const escapedSelector = selector.replace(/'/g, "\\'");
    const escapedValue = value.replace(/'/g, "\\'");
    await this.evaluate(`(() => {
      const el = document.querySelector('${escapedSelector}');
      if (!el) return 'not found';
      const tag = el.tagName.toLowerCase();
      if (tag === 'input') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, '${escapedValue}');
      } else if (tag === 'textarea') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, '${escapedValue}');
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return 'ok';
    })()`);
  }

  async click(selector: string) {
    const escapedSelector = selector.replace(/'/g, "\\'");
    await this.evaluate(`(() => {
      const el = document.querySelector('${escapedSelector}');
      if (el) el.click();
      return !!el;
    })()`);
  }

  async waitForSelector(selector: string, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = await this.evaluate(`(() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        return !!el && el.offsetParent !== null;
      })()`);
      if (found) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async textContent(selector: string) {
    return await this.evaluate(`(() => {
      const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
      return el ? el.textContent : null;
    })()`);
  }

  async getPageState() {
    return await this.evaluate(`JSON.stringify({
      url: window.location.href,
      title: document.title,
      bodyLen: document.body?.innerText?.length || 0,
      bodyPreview: (document.body?.innerText || '').substring(0, 300)
    })`);
  }

  async close() {
    this.ws?.close();
  }
}

let cachedPage: CDPPage | null = null;

async function getPage() {
  if (cachedPage) return cachedPage;
  const page = new CDPPage();
  await page.connect();
  cachedPage = page;
  return page;
}

test.describe('Alfred Electron App', () => {
  test('should show login view on launch', async () => {
    const page = await getPage();

    // 先打印当前页面状态用于调试
    const state = await page.getPageState();
    console.log('[test] Page state:', state);

    // 等待登录表单出现
    await page.waitForSelector('form input[type="text"]', 10000);

    // 验证标题
    const headingText = await page.textContent('h2');
    expect(headingText).toContain('登录');
  });

  test('should login and show chat view', async () => {
    const page = await getPage();

    // 确保在登录页面
    await page.waitForSelector('form input[type="text"]');

    // 填写表单
    await page.fill('form input[type="text"]', 'testuser');
    await page.fill('form input[type="password"]', 'testpass123');

    // 点击登录
    await page.click('form button[type="submit"]');

    // 等待聊天界面出现
    await page.waitForSelector('textarea[placeholder*="输入消息"]', 20000);
  });

  test('should send a message and receive response', async () => {
    const page = await getPage();

    // 确保已登录
    await page.waitForSelector('textarea[placeholder*="输入消息"]', 10000);

    // 输入消息
    await page.fill('textarea[placeholder*="输入消息"]', 'Hello, this is an automated test.');

    // 点击发送
    await page.click('form button[type="submit"]');

    // 等待回复
    await page.waitForSelector('.bg-zinc-900.border p', 30000);

    // 验证有内容
    const content = await page.textContent('.bg-zinc-900.border p');
    expect(content?.length).toBeGreaterThan(5);
  });
});
