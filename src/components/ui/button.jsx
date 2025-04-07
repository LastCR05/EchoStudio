import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        selected:
          'bg-white shadow-md animate-button-pop text-black hover:bg-white ',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-gray-500 bg-transparent shadow-sm hover:border-[#2b44dd] hover:text-white aria-selected:bg-[#2b44dd]',
        secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        player:
          'hover:bg-[#1E2022] rounded-full [&_svg]:h-auto [&_svg]:w-auto ',
      },
      size: {
        default: 'h-9 px-4 py-2',
        xs: 'h-6 rounded-md px-2 text-[8px]',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        player: 'h-14 w-14',
        icon: 'h-10 w-10',
        fluid:
          'h-[clamp(2rem,5vw,3rem)] px-[clamp(0.75rem,2vw,1.5rem)] py-[clamp(0.5rem,1vw,1rem)] text-[clamp(0.75rem,2vw,1rem)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
