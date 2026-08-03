'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <footer className="w-full bg-[#0B1726] border-t border-slate-800/80 text-slate-400 text-xs py-6">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Copyright genérico para ambos */}
        <p className="text-slate-500">
          © {new Date().getFullYear()} <strong className="text-slate-300">ARosas Realty</strong>. Todos los derechos reservados.
        </p>

        {/* SI NO ES ADMIN -> Muestra Privacidad y Enlaces Públicos */}
        {!isAdmin && (
          <div className="flex items-center gap-6">
            <a href="/privacidad" className="hover:text-slate-200 transition">
              Aviso de Privacidad
            </a>
          </div>
        )}

        {/* SI ES ADMIN -> Indicador de sesión limpia */}
        {isAdmin && (
          <span className="text-[11px] text-slate-600 font-mono">
            Módulo Administrativo
          </span>
        )}

      </div>
    </footer>
  );
}