'use client';

import React, { createElement, useMemo, type ReactNode } from 'react';
import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

// Render only basic formatting as React elements. AI output must never become
// executable HTML, external images, or clickable model-generated URLs.
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true })
  .disable(['image', 'link', 'autolink']);

const styles: Record<string, string> = {
  p: 'mb-3 last:mb-0',
  h1: 'mb-3 mt-4 text-lg font-semibold first:mt-0',
  h2: 'mb-2 mt-4 text-base font-semibold first:mt-0',
  h3: 'mb-2 mt-3 font-semibold first:mt-0',
  h4: 'mb-2 mt-3 font-semibold first:mt-0',
  h5: 'mb-2 mt-3 font-semibold first:mt-0',
  h6: 'mb-2 mt-3 font-semibold first:mt-0',
  strong: 'font-semibold text-white',
  em: 'italic',
  s: 'line-through',
  ul: 'mb-3 list-disc space-y-1 pl-5',
  ol: 'mb-3 list-decimal space-y-1 pl-5',
  li: 'pl-1',
  blockquote: 'mb-3 border-l-2 border-purple-400/50 pl-3 text-gray-300',
  code: 'rounded bg-black/20 px-1 font-mono text-xs',
};

function renderTokens(tokens: Token[]): ReactNode[] {
  let index = 0;
  function read(): ReactNode[] {
    const children: ReactNode[] = [];
    while (index < tokens.length) {
      const token = tokens[index++];
      const key = index;
      if (token.nesting === -1) break;
      if (token.nesting === 1) {
        const nested = read();
        if (token.hidden) children.push(...nested);
        else {
          const tag = Object.prototype.hasOwnProperty.call(styles, token.tag) ? token.tag : 'span';
          // Chat headings must not add another page-level H1.
          const element = /^h[1-6]$/.test(tag) ? 'h3' : tag;
          children.push(createElement(element, { key, className: styles[tag] }, nested));
        }
      } else if (token.type === 'inline') {
        children.push(...renderTokens(token.children || []));
      } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
        children.push(createElement('br', { key }));
      } else if (token.type === 'code_inline') {
        children.push(createElement('code', { key, className: styles.code }, token.content));
      } else if (token.type === 'fence' || token.type === 'code_block') {
        children.push(createElement('pre', { key, className: 'mb-3 max-w-full overflow-x-auto rounded bg-black/20 p-3 text-xs' }, createElement('code', null, token.content)));
      } else if (token.type === 'hr') {
        children.push(createElement('hr', { key, className: 'my-3 border-white/15' }));
      } else {
        children.push(token.content);
      }
    }
    return children;
  }
  return read();
}

export default function ChatMessageContent({ content }: { content: string }) {
  const nodes = useMemo(() => renderTokens(markdown.parse(content, {})), [content]);
  return <div className="min-w-0 break-words text-sm leading-relaxed">{nodes}</div>;
}
