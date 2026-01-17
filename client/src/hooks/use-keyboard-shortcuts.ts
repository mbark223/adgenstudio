import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if focused on input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Build key combination string
      const modifiers = [];
      if (e.metaKey || e.ctrlKey) modifiers.push('Cmd');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');

      const key = e.key === ' ' ? 'Space' : e.key;
      const combination = [...modifiers, key].join('+');

      if (handlers[combination]) {
        e.preventDefault();
        handlers[combination]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
