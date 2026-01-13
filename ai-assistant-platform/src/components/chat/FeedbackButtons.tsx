/**
 * FeedbackButtons Component
 * Thumbs up/down buttons for assistant message feedback
 */

'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback?: 'positive' | 'negative' | null;
  onFeedback: (messageId: string, rating: 'positive' | 'negative') => void;
}

export function FeedbackButtons({
  messageId,
  currentFeedback,
  onFeedback,
}: FeedbackButtonsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<'positive' | 'negative' | null>(
    currentFeedback || null
  );

  const handleFeedback = async (rating: 'positive' | 'negative') => {
    if (isSubmitting || localFeedback === rating) return;

    setIsSubmitting(true);
    setLocalFeedback(rating);

    try {
      onFeedback(messageId, rating);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        onClick={() => handleFeedback('positive')}
        disabled={isSubmitting}
        className={`rounded-md p-1 transition-colors ${
          localFeedback === 'positive'
            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        aria-label="Good response"
        title="Good response"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleFeedback('negative')}
        disabled={isSubmitting}
        className={`rounded-md p-1 transition-colors ${
          localFeedback === 'negative'
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        aria-label="Bad response"
        title="Bad response"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
