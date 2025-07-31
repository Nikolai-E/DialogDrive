import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export const useCopyToClipboard = () => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string, duration = 2000) => {
    if (isCopied) return;

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Copied to clipboard!');

      setTimeout(() => {
        setIsCopied(false);
      }, duration);
    } catch (err) {
      toast.error('Failed to copy text.');
      console.error('Failed to copy: ', err);
    }
  }, [isCopied]);

  return { isCopied, copyToClipboard };
};
