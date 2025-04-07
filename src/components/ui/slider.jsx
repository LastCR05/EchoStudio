'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef(
  ({ className, variant = 'default', ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex w-full select-none items-center cursor-pointer',
        variant === 'small' ? 'h-2' : 'h-6', // Smaller height for small variant
        className
      )}
      {...props}
    >
      {/* Track (the visible bar) */}
      <SliderPrimitive.Track
        className={cn(
          'relative w-full grow overflow-hidden rounded-full bg-[#2F3335]',
          variant === 'small' ? 'h-[2px]' : 'h-[4px]' // Thinner track for small variant
        )}
      >
        {/* Range (the filled portion) */}
        <SliderPrimitive.Range className="absolute h-full bg-[#2B44DD]" />
      </SliderPrimitive.Track>

      {/* Thumb (the draggable circle) */}
      <SliderPrimitive.Thumb
        className={cn(
          'z-50 block rounded-full border border-[#FFFFFF] bg-[#FFFFFF] shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variant === 'small' ? 'h-3 w-3' : 'h-5 w-5' // Smaller thumb (12x12px) for small variant
        )}
      />
    </SliderPrimitive.Root>
  )
);

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
