import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import axe from 'axe-core';

function parseHtmlSection(html, tag) {
  var match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1] : '';
}

function parseHtmlAttr(html, tag, attr) {
  var match = html.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

function parseTitle(html) {
  var match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1] : '';
}

describe('Accessibility audit', () => {
  it('index.html should have no critical accessibility violations', async () => {
    var html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');
    
    // Set lang attribute on html element
    var langAttr = parseHtmlAttr(html, 'html', 'lang');
    if (langAttr) {
      document.documentElement.setAttribute('lang', langAttr);
    }
    
    // Set title
    var title = parseTitle(html);
    if (title) {
      document.title = title;
    }
    
    document.head.innerHTML = parseHtmlSection(html, 'head');
    document.body.innerHTML = parseHtmlSection(html, 'body');
    
    // Re-set title after innerHTML (head.innerHTML may clear it)
    if (title) {
      document.title = title;
    }

    var results = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    if (results.violations.length) {
      var violationMessages = results.violations.map(function(v) {
        return `${v.id}: ${v.description}\n  Nodes:\n    ${v.nodes.map(function(node) {
      return `${node.html}`;
    }).join('\n    ')}`;
      }).join('\n\n');
      console.error('\nAccessibility violations found:\n', violationMessages);
    }

    expect(results.violations).toEqual([]);
  });
});
