/**
 * ChatInput Component
 * Text input with send button and keyboard shortcuts
 */

'use client';

import { useRef, useCallback, type KeyboardEvent, type FormEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = 'Type your message...',
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for newline
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading && !disabled && value.trim()) {
          // Create and dispatch a synthetic form submit event
          const form = textareaRef.current?.form;
          if (form) {
            form.requestSubmit();
          }
        }
      }
    },
    [isLoading, disabled, value]
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Auto-resize textarea
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      handleInput();
    },
    [onChange, handleInput]
  );

  const isSubmitDisabled = isLoading || disabled || !value.trim();

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-3">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className="
            w-full resize-none rounded-xl border border-zinc-300 bg-white
            px-4 py-3 pr-12 text-zinc-900 placeholder-zinc-500
            transition-colors
            focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500
            disabled:cursor-not-allowed disabled:opacity-50
            dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100
            dark:placeholder-zinc-400 dark:focus:border-zinc-500
          "
          style={{ maxHeight: '200px' }}
          aria-label="Message input"
        />
        <div className="absolute bottom-2 right-2 text-xs text-zinc-400">
          {value.length > 0 && (
            <span className="hidden sm:inline">
              Press Enter to send, Shift+Enter for new line
            </span>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitDisabled}
        size="lg"
        className="shrink-0"
        aria-label={isLoading ? 'Sending...' : 'Send message'}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        <span className="sr-only">{isLoading ? 'Sending...' : 'Send'}</span>
      </Button>
    </form>
  );
}
