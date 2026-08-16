export const cf_captcha_status = [403, 503, 429];
export const cf_signatures = [
  'window._cf_chl_opt',
  '<title>Just a moment...</title>',
  '<title>Attention Required! | Cloudflare</title>',
  'id="challenge-form"',
  '__cf_chl_tk'
];

import { ensureBrowserRuntime } from './browser-runtime-bootstrap.js';

interface ClearanceResult {
  success: boolean;
  cfClearance?: string;
  userAgent?: string;
  ttl?: number;      
  allCookies?: any[]; 
  error?: string;
  html?: string;
}

const TIMEOUT = 30_000; 

let browserInstance: any = null;
let pageInstance: any = null;
let bypassQueue: Promise<void> = Promise.resolve();

export async function getCloudflareClearance(targetUrl: string): Promise<ClearanceResult> {
  let releaseLock: () => void;
  const nextInLine = new Promise<void>(resolve => { releaseLock = resolve; });
  
  const waitForPrevious = bypassQueue;
  bypassQueue = bypassQueue.then(() => nextInLine);

  await waitForPrevious;

  try {
    let connect: any = null;
    try {
      const mod = await import('puppeteer-real-browser');
      connect = mod.connect;
    } catch {
      throw new Error('puppeteer-real-browser is not available.');
    }

    if (!browserInstance || !browserInstance.isConnected() || !pageInstance || pageInstance.isClosed()) {
      if (browserInstance) await browserInstance.close().catch(() => {});
      const runtime = ensureBrowserRuntime();

      if (!runtime.chromePath) {
        throw new Error(
          'No Chrome/Chromium executable found. Set CHROME_PATH or enable auto install.'
        );
      }
      
      const { browser, page } = await connect({
        headless: 'new' as any,       
        turnstile: true,       
        disableXvfb: !runtime.hasXvfb,
        ignoreAllFlags: false  
      });
      
      browserInstance = browser;
      pageInstance = page;
    }

    await pageInstance.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    const extractionData = await new Promise<{ cookies: any[], cfClearance: string, userAgent: string, ttl: number }>((resolve, reject) => {
      let checkInterval: NodeJS.Timeout;
      
      const timeoutId = setTimeout(async () => {
        clearInterval(checkInterval);
        try {
          const fallbackHtml = await pageInstance.content();
          if (fallbackHtml && fallbackHtml.length > 500) {
            resolve({
              cookies: [],
              cfClearance: '__fallback__',
              userAgent: await pageInstance.evaluate((): string => navigator.userAgent).catch(() => ''),
              ttl: 60
            });
            return;
          }
        } catch (_) {}
        reject(new Error('Timeout: cf_clearance cookie never appeared and no usable fallback HTML.'));
      }, TIMEOUT);

      checkInterval = setInterval(async () => {
        try {
          if (pageInstance.isClosed()) return;
          
          const title = await pageInstance.evaluate(() => document.title).catch(() => '');
          if (title.includes('Just a moment') || title.includes('Cloudflare') || title.includes('Attention Required')) {
            return; 
          }

          const cookies = await pageInstance.cookies();
          const cfCookie = cookies.find((c: any) => c.name === 'cf_clearance');
          
          if (cfCookie) {
            let userAgent = '';
            try {
              userAgent = await pageInstance.evaluate((): string => navigator.userAgent);
            } catch (err) {
              return; 
            }

            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            
            let ttlSeconds = 3600; 
            if (cfCookie.expires && cfCookie.expires > 0) {
              const currentUnixTime = Math.floor(Date.now() / 1000);
              ttlSeconds = Math.floor(cfCookie.expires) - currentUnixTime;
              if (ttlSeconds <= 0) ttlSeconds = 3600; 
            }
            
            resolve({ 
              cookies, 
              cfClearance: cfCookie.value, 
              userAgent, 
              ttl: ttlSeconds 
            });
          }
        } catch (err) {
        }
      }, 50); 
    });
    
    await new Promise(r => setTimeout(r, 2000)); 
    const html = await pageInstance.content();

    return {
      success: true,
      cfClearance: extractionData.cfClearance,
      userAgent: extractionData.userAgent,
      ttl: extractionData.ttl, 
      allCookies: extractionData.cookies,
      html
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  } finally {
    releaseLock!(); 
  }
}

export function getCfPageInstance() {
  return pageInstance;
}
