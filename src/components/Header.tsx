'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';

export default function Header() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="w-full bg-[#0F2238] border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <Link href={isAdmin ? '/admin/dashboard' : '/'}>
          <Logo className="h-10 w-auto" />
        </Link>

        {/* NAVEGACIÓN EN SECCIÓN ADMIN */}
        {isAdmin ? (
          <nav className="flex items-center gap-4">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Panel Administrativo
            </span>
            <Link
              href="/admin"
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition border border-slate-700"
            >
              Dashboard
            </Link>
          </nav>
        ) : (
          /* NAVEGACIÓN PÚBLICA ORIGINAL */
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6 text-slate-200 text-xs font-semibold">
              <Link href="/" className="hover:text-[#C5A059] transition-colors uppercase">
                INICIO
              </Link>
              <Link href="/catalogue" className="hover:text-[#C5A059] transition-colors uppercase">
                PROPIEDADES
              </Link>
            </nav>

            <div className="h-4 w-[1px] bg-slate-700 hidden md:block" />

            {/* Contacto Directo */}
            <div className="hidden md:flex items-center gap-6 text-slate-300 font-semibold text-[11px]">
              <a 
                href="mailto:dcalexrosas@gmail.com" 
                className="hover:text-white transition-colors"
              >
                dcalexrosas@gmail.com
              </a>
              <span className="text-slate-600 font-normal">|</span>
              <a 
                href="tel:+525544857098" 
                className="text-[#C5A059] font-bold hover:text-amber-300 transition-colors"
              >
                +52 55 4485 7098
              </a>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}