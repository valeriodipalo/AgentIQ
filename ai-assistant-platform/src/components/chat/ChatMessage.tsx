/**
 * ChatMessage Component
 * Displays individual chat messages with styling based on role
 */

'use client';

import { memo, useMemo } from 'react';
import { User, Bot } from 'lucide-react';
import { FeedbackButtons } from './FeedbackButtons';

export interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  isStreaming?: boolean;
  feedback?: 'positive' | 'negative' | null;
  onFeedback?: (messageId: string, rating: 'positive' | 'negative') => void;
}

/**
 * Simple markdown renderer for assistant messages
 * Handles basic formatting: bold, italic, code, code blocks, lists, links
 */
function renderMarkdown(content: string): React.ReactNode {
  // Split content by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // Handle code blocks
    if (part.startsWith('```') && part.endsWith('```')) {
      const codeContent = part.slice(3, -3);
      const lines = codeContent.split('\n');
      const language = lines[0]?.trim() || '';
      const code = language ? lines.slice(1).join('\n') : codeContent;

      return (
        <pre
          key={index}
          className="my-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100 dark:bg-zinc-800"
        >
          {language && (
            <div className="mb-2 text-xs text-zinc-400">{language}</div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Handle inline formatting
    return (
      <span key={index}>
        {part.split('\n').map((line, lineIndex, lines) => (
          <span key={lineIndex}>
            {renderInlineMarkdown(line)}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        ))}
      </span>
    );
  });
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Handle inline code
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm font-mono dark:bg-zinc-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Handle bold and italic
    let result: React.ReactNode = part;

    // Bold: **text**
    result = replacePattern(result, /\*\*([^*]+)\*\*/g, (match, text, idx) => (
      <strong key={`bold-${idx}`} className="font-semibold">
        {text}
      </strong>
    ));

    // Italic: *text*
    result = replacePattern(result, /\*([^*]+)\*/g, (match, text, idx) => (
      <em key={`italic-${idx}`}>{text}</em>
    ));

    // Links: [text](url)
    result = replacePattern(
      result,
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, text, url, idx) => (
        <a
          key={`link-${idx}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {text}
        </a>
      )
    );

    return <span key={index}>{result}</span>;
  });
}

function replacePattern(
  content: React.ReactNode,
  pattern: RegExp,
  replacer: (...args: string[]) => React.ReactNode
): React.ReactNode {
  if (typeof content !== 'string') {
    return content;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let idx = 0;

  const regex = new RegExp(pattern.source, pattern.flags);

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(replacer(match[0], match[1], match[2] || '', String(idx++)));
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ChatMessage = memo(function ChatMessage({
  id,
  role,
  content,
  createdAt,
  isStreaming = false,
  feedback,
  onFeedback,
}: ChatMessageProps) {
  const isUser = role === 'user';

  const renderedContent = useMemo(() => {
    if (isUser) {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
    return <div className="prose prose-sm dark:prose-invert max-w-none">{renderMarkdown(content)}</div>;
  }, [content, isUser]);

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`group flex max-w-[80%] flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          }`}
        >
          {renderedContent}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
          )}
        </div>

        {/* Timestamp and Feedback */}
        <div
          className={`mt-1 flex items-center gap-2 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {createdAt && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatTimestamp(createdAt)}
            </span>
          )}

          {/* Feedback buttons for assistant messages */}
          {!isUser && !isStreaming && onFeedback && (
            <FeedbackButtons
              messageId={id}
              currentFeedback={feedback}
              onFeedback={onFeedback}
            />
          )}
        </div>
      </div>
    </div>
  );
});
