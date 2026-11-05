import React, { ReactNode } from "react";

interface SafeMarkdownProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Parses inline formatting:
 * - ***bold-italic***
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `inline code`
 * - raw text (auto-escaped by React, 100% XSS safe)
 */
function parseInline(text: string, isUser: boolean = false): ReactNode[] {
  if (!text) return [];

  const nodes: ReactNode[] = [];
  // Tokenizer regex: matches inline code, bold-italic, bold, italic
  const tokenRegex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Add text preceding the token
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token.slice(0, 10)}`;

    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      nodes.push(
        <code
          key={key}
          className={`rounded px-1 py-0.5 font-mono text-[11px] ${
            isUser ? "bg-blue-700/60 text-white" : "bg-slate-100 text-slate-800"
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("***") && token.endsWith("***") && token.length >= 6) {
      nodes.push(
        <strong key={key} className={isUser ? "font-bold text-white" : "font-bold text-slate-900"}>
          <em className="italic">{token.slice(3, -3)}</em>
        </strong>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**") && token.length >= 4) ||
      (token.startsWith("__") && token.endsWith("__") && token.length >= 4)
    ) {
      nodes.push(
        <strong key={key} className={isUser ? "font-bold text-white" : "font-bold text-slate-900"}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*") && token.length >= 2) ||
      (token.startsWith("_") && token.endsWith("_") && token.length >= 2)
    ) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/**
 * Safe, zero-dependency Markdown renderer for Elvora Assistant.
 * Renders bold, italic, inline code, headings, bullet lists, numbered lists, and paragraphs.
 * Completely eliminates raw asterisks and guarantees XSS protection by outputting pure React nodes.
 */
export function SafeMarkdown({ content, className = "", isUser = false }: SafeMarkdownProps) {
  if (!content) return null;

  // Split into lines while preserving sequence
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];

  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const text = paragraphLines.join("\n");
      const blockKey = `p-${blocks.length}-${text.slice(0, 15)}`;
      
      // Split by newline inside paragraph to handle single line breaks
      const subLines = text.split("\n");
      const renderedSubLines: ReactNode[] = [];
      
      subLines.forEach((sub, idx) => {
        if (idx > 0) renderedSubLines.push(<br key={`br-${idx}`} />);
        renderedSubLines.push(...parseInline(sub, isUser));
      });

      blocks.push(
        <p key={blockKey} className="mb-2 last:mb-0 leading-relaxed">
          {renderedSubLines}
        </p>
      );
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      const listKey = `list-${blocks.length}`;
      if (currentList.type === "ul") {
        blocks.push(
          <ul
            key={listKey}
            className={`my-2 list-disc space-y-1 pl-4.5 text-xs ${
              isUser ? "text-white" : "text-slate-700"
            }`}
          >
            {currentList.items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {parseInline(item, isUser)}
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol
            key={listKey}
            className={`my-2 list-decimal space-y-1 pl-4.5 text-xs ${
              isUser ? "text-white" : "text-slate-700"
            }`}
          >
            {currentList.items.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {parseInline(item, isUser)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line: paragraph separator
    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    // 2. Heading: e.g. ### Title or ## Title or # Title
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const hKey = `h-${blocks.length}-${headingText.slice(0, 10)}`;

      if (level <= 2) {
        blocks.push(
          <h3
            key={hKey}
            className={`mt-3 mb-1.5 text-sm font-bold tracking-tight ${
              isUser ? "text-white" : "text-slate-900"
            }`}
          >
            {parseInline(headingText, isUser)}
          </h3>
        );
      } else {
        blocks.push(
          <h4
            key={hKey}
            className={`mt-2 mb-1 text-xs font-bold ${
              isUser ? "text-white" : "text-slate-900"
            }`}
          >
            {parseInline(headingText, isUser)}
          </h4>
        );
      }
      continue;
    }

    // 3. Bullet list item: - or * followed by space
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (currentList && currentList.type !== "ul") {
        flushList();
      }
      if (!currentList) {
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // 4. Numbered list item: 1. 2. etc.
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (currentList && currentList.type !== "ol") {
        flushList();
      }
      if (!currentList) {
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numberedMatch[2]);
      continue;
    }

    // 5. Normal text line -> add to paragraph
    flushList();
    paragraphLines.push(rawLine);
  }

  flushParagraph();
  flushList();

  return <div className={`safe-markdown leading-relaxed ${className}`}>{blocks}</div>;
}
