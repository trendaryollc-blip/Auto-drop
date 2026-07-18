import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { CSP_NONCE_VALUE, installCspNonceBridge } from '../csp-bridge.js';

describe('CSP nonce bridge', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="inline-style" style="display:none"></div>';
  });

  it('applies a nonce to existing elements with inline styles', () => {
    installCspNonceBridge();

    const el = document.getElementById('inline-style');
    expect(el.getAttribute('nonce')).toBe(CSP_NONCE_VALUE);
  });

  it('adds a nonce to dynamically created elements with inline styles', () => {
    installCspNonceBridge();

    const el = document.createElement('div');
    el.style.display = 'none';
    expect(el.getAttribute('nonce')).toBe(CSP_NONCE_VALUE);
  });

  it('keeps the CSP policy secure and avoids hardcoded nonces', () => {
    const htmlPath = resolve(process.cwd(), 'index.html');
    const html = readFileSync(htmlPath, 'utf8');

    expect(html).toContain('Content-Security-Policy');
    // Should not contain hardcoded nonce (security risk)
    expect(html).not.toContain("'nonce-huntdrop-csp-nonce'");
    // Should use unsafe-inline for styles (acceptable for client-side apps)
    expect(html).toContain('unsafe-inline');
  });
});
