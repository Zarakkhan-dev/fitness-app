'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  push: (toast: ToastInput) => void;
  /** Convenience wrappers used constantly across forms. */
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { dot: string; bar: string }> = {
  success: { dot: 'bg-success', bar: 'bg-success' },
  error: { dot: 'bg-danger', bar: 'bg-danger' },
  info: { dot: 'bg-brand', bar: 'bg-brand' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-3), { ...toast, id }]);
      const ttl = toast.tone === 'error' ? 6500 : 4200;
      setTimeout(() => remove(id), ttl);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'error' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const tone = TONE_STYLES[item.tone ?? 'info'];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="card pointer-events-auto w-full max-w-sm overflow-hidden p-0 sm:w-auto"
                role="status"
              >
                <div className="flex items-start gap-3 p-3.5 pr-5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-[13px] leading-relaxed text-sub">{item.description}</p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
