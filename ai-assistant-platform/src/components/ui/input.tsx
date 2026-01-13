/**
 * Input Component
 * Reusable text input with variants
 */

import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`
            flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm
            text-zinc-900 placeholder-zinc-500
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400
            ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-zinc-300 dark:border-zinc-700'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
