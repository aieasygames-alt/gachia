import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MainContentBoundary } from '../components/layout/main-content-boundary';

describe('main content reconciliation boundary candidate', () => {
  it('returns the original child without inspecting or replacing it', () => {
    const child = createElement('nav', { 'aria-label': 'Game' }, 'Weapons');
    expect(MainContentBoundary({ children: child })).toBe(child);
    expect(MainContentBoundary({ children: null })).toBeNull();
  });

  it('adds no DOM, fallback, or additional main landmark', () => {
    const children = [createElement('nav', { key: 'nav' }, 'Game'),
      createElement('div', { key: 'content' }, 'Weapons')];
    const plain = renderToStaticMarkup(createElement('main', { className: 'flex-1' }, children));
    const wrapped = renderToStaticMarkup(createElement('main', { className: 'flex-1' },
      createElement(MainContentBoundary, null, ...children)));
    expect(wrapped).toBe(plain);
    expect(wrapped.match(/<main\b/g)).toHaveLength(1);
  });

  it('keeps the existing layout landmark and places the client boundary inside it', () => {
    const layout = readFileSync(new URL('../app/[lang]/layout.tsx', import.meta.url), 'utf8');
    const boundary = readFileSync(new URL('../components/layout/main-content-boundary.tsx', import.meta.url), 'utf8');
    expect(layout).toContain('<main className="flex-1"><MainContentBoundary>{children}</MainContentBoundary></main>');
    expect(layout.match(/<main\b/g)).toHaveLength(1);
    expect(boundary.startsWith("'use client';")).toBe(true);
    expect(boundary).not.toContain('suppressHydrationWarning');
    expect(boundary).not.toContain('Suspense');
  });
});
