import React from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { XCircle } from 'lucide-react';

// Container variants for showing/hiding the error
const errorVariants = cva('flex flex-col items-center justify-center', {
  variants: {
    show: {
      true: 'flex',
      false: 'hidden',
    },
  },
  defaultVariants: {
    show: true,
  },
});

// Icon variants without the bouncing animation
const iconVariants = cva('text-red-500', {
  variants: {
    size: {
      small: 'w-6 h-6',
      medium: 'w-8 h-8',
      large: 'w-12 h-12',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

export function ErrorAnimation({ size, show, className, children }) {
  return (
    <div className={errorVariants({ show })}>
      <XCircle className={cn(iconVariants({ size }), className)} />
      <span className="mt-2 text-red-500 font-bold">
        {children || 'Something went wrong'}
      </span>
    </div>
  );
}
