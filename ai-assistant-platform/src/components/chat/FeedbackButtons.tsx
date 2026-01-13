/**
 * FeedbackButtons Component
 * Thumbs up/down buttons for assistant message feedback with optional notes
 */

'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback?: 'positive' | 'negative' | null;
  onFeedback: (messageId: string, rating: 'positive' | 'negative', notes?: string) => void;
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
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [pendingRating, setPendingRating] = useState<'positive' | 'negative' | null>(null);
  const [notes, setNotes] = useState('');

  const handleFeedbackClick = (rating: 'positive' | 'negative') => {
    if (isSubmitting || localFeedback === rating) return;

    // For negative feedback, show notes input first
    if (rating === 'negative') {
      setPendingRating(rating);
      setShowNotesInput(true);
    } else {
      // For positive feedback, submit immediately
      submitFeedback(rating);
    }
  };

  const submitFeedback = async (rating: 'positive' | 'negative', feedbackNotes?: string) => {
    setIsSubmitting(true);
    setLocalFeedback(rating);
    setShowNotesInput(false);
    setPendingRating(null);

    try {
      onFeedback(messageId, rating, feedbackNotes);
    } finally {
      setIsSubmitting(false);
      setNotes('');
    }
  };

  const handleNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingRating) {
      submitFeedback(pendingRating, notes.trim() || undefined);
    }
  };

  const handleCancelNotes = () => {
    setShowNotesInput(false);
    setPendingRating(null);
    setNotes('');
  };

  const handleAddNotes = () => {
    if (localFeedback) {
      setPendingRating(localFeedback);
      setShowNotesInput(true);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => handleFeedbackClick('positive')}
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
          onClick={() => handleFeedbackClick('negative')}
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

        {/* Add notes button - shows when feedback is given */}
        {localFeedback && !showNotesInput && (
          <button
            type="button"
            onClick={handleAddNotes}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="Add notes"
            title="Add notes to feedback"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Notes input popover */}
      {showNotesInput && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <form onSubmit={handleNotesSubmit}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {pendingRating === 'negative' ? 'What could be improved?' : 'Add feedback notes'}
              </span>
              <button
                type="button"
                onClick={handleCancelNotes}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Tell us more about this response..."
              className="mb-2 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelNotes}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                <Send className="mr-1 h-3 w-3" />
                Submit
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
