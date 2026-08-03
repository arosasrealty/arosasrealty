'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('Credenciales inválidas. Verifica tu correo y contraseña.');
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full space-y-6">
        <div>
          <span className="text-xs font-black tracking-wider text-slate-400 block uppercase">Acceso Privado</span>
          <h1 className="text-2xl font-black text-slate-900">Panel de Control</h1>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              placeholder="admin@arosasrealty.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-3.5 rounded-xl transition shadow-sm"
          >
            {loading ? 'Iniciando Sesión...' : 'Ingresar al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}