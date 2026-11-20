'use client';

/** Page-level motion helpers. Route changes animate via `app/template.tsx`. */

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

export function FadeIn({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0.15 }
          : { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Children rise in sequence — used for lists of cards and stats. */
export function Stagger({
  children,
  className,
  gap = 0.06,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: reduce ? { duration: 0 } : { staggerChildren: gap, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
        show: reduce
          ? { opacity: 1, transition: { duration: 0.15 } }
          : { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Tap feedback for interactive cards. */
export function Pressable({ children, className, ...rest }: HTMLMotionProps<'button'>) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** Shared wrapper so every screen fades in the same way. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduce ? { duration: 0.15 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
