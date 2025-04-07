import React from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

// Define variant styles for the container
const spinnerVariants = cva('flex-col items-center justify-center gap-2', {
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

// Define variant styles for the loader icon
const loaderVariants = cva('animate-spin text-primary', {
  variants: {
    size: {
      small: 'size-6',
      medium: 'size-8',
      large: 'size-12',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

// Spinner component in plain JavaScript
export function Spinner({ size, show, children, className }) {
  return (
    <span className={spinnerVariants({ show })}>
      <Loader2 className={cn(loaderVariants({ size }), className)} />
      {children}
    </span>
  );
}
