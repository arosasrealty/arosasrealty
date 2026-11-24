'use client';

import { useState } from 'react';

interface Props {
  text: string;
  label?: string;
  className?: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* cae al método alterno */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function CopyAddressButton({ text, label = 'Copiar', className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle');

  if (!text) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyToClipboard(text);
    setState(ok ? 'ok' : 'error');
    setTimeout(() => setState('idle'), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Copiar domicilio al portapapeles"
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition shrink-0 ${
        state === 'ok'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : state === 'error'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-300'
      } ${className}`}
    >
      {state === 'ok' ? '✓ Copiado' : state === 'error' ? 'No se pudo' : `📋 ${label}`}
    </button>
  );
}
