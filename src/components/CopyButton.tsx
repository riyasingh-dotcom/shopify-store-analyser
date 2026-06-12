'use client';

import { useState, useCallback, useRef } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Copy to clipboard"
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 transition-all ${
        copied
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}
