import React, { useEffect, useState } from 'react';
import { useToast } from './ToastContext';
import type { AddressData } from '../types';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  cpf?: string;
  phone?: string;
  address?: AddressData;
}

interface CheckoutAccountProps {
  onAuthenticated: (user: AccountUser) => void;
  context?: 'checkout' | 'profile';
}

export const CheckoutAccount: React.FC<CheckoutAccountProps> = ({ onAuthenticated, context = 'checkout' }) => {
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    // Remove code from URL to avoid re-processing
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    let cancelled = false;
    setGoogleLoading(true);

    fetch('/api/auth/google/callback', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (response) => {
        const result = await response.json() as { user?: AccountUser; error?: string };
        if (cancelled) return;
        if (!response.ok || !result.user) {
          toast.error('Falha no login com Google', result.error || 'Tente novamente.');
          setGoogleLoading(false);
          return;
        }
        onAuthenticated(result.user);
        toast.success('Login com Google realizado', 'Bem-vindo!');
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Serviço indisponível', 'Não foi possível conectar ao servidor.');
          setGoogleLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const response = await fetch('/api/auth/google/url', { credentials: 'same-origin' });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        toast.error('Google OAuth não disponível', result.error || 'Verifique a configuração do servidor.');
        setGoogleLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      toast.error('Serviço indisponível', 'Não foi possível obter URL de autenticação.');
      setGoogleLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json() as { user?: AccountUser; error?: string };
      if (!response.ok || !result.user) {
        toast.error('Não foi possível acessar sua conta', result.error || 'Confira seus dados e tente novamente.');
        return;
      }
      onAuthenticated(result.user);
      toast.success(
        mode === 'register' ? 'Conta criada' : 'Login realizado',
        'Agora você pode continuar sua compra.',
      );
    } catch {
      toast.error('Serviço indisponível', 'Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-lg rounded-3xl border border-[#e0e3e5] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#4156b8]">
        <span className="material-symbols-outlined text-[25px]">account_circle</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#061748]">
        {context === 'profile' ? 'Acesse sua conta' : 'Entre na sua conta'}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#767680]">
        {context === 'profile'
          ? 'Entre ou crie uma conta para consultar seus dados e pedidos.'
          : 'Para acompanhar seu pedido, entre ou crie uma conta antes de finalizar a compra.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#45464f]">Nome completo</span>
            <input
              required
              autoComplete="name"
              minLength={2}
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-[#d7dbe3] bg-[#f8f9fb] px-4 py-3 text-sm text-[#191c1e] outline-none transition focus:border-[#4156b8] focus:bg-white focus:ring-2 focus:ring-[#4156b8]/20"
              placeholder="Seu nome completo"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#45464f]">E-mail</span>
          <input
            required
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-[#d7dbe3] bg-[#f8f9fb] px-4 py-3 text-sm text-[#191c1e] outline-none transition focus:border-[#4156b8] focus:bg-white focus:ring-2 focus:ring-[#4156b8]/20"
            placeholder="voce@exemplo.com"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#45464f]">Senha</span>
          <input
            required
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? 10 : undefined}
            maxLength={256}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[#d7dbe3] bg-[#f8f9fb] px-4 py-3 text-sm text-[#191c1e] outline-none transition focus:border-[#4156b8] focus:bg-white focus:ring-2 focus:ring-[#4156b8]/20"
            placeholder={mode === 'register' ? 'Mínimo de 10 caracteres' : 'Sua senha'}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#061748] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0a2060] disabled:cursor-wait disabled:opacity-60"
        >
          {submitting
            ? 'Aguarde...'
            : mode === 'register'
              ? context === 'profile' ? 'Criar conta' : 'Criar conta e continuar'
              : context === 'profile' ? 'Entrar' : 'Entrar e continuar'}
          {!submitting && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
        </button>
      </form>

      {/* Google OAuth */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e0e3e5]" />
        <span className="text-xs font-semibold text-[#767680]">ou</span>
        <div className="h-px flex-1 bg-[#e0e3e5]" />
      </div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || submitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d7dbe3] bg-white px-5 py-3 text-sm font-bold text-[#191c1e] transition hover:bg-[#f8f9fb] disabled:cursor-wait disabled:opacity-60"
      >
        {googleLoading ? (
          <>
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            Conectando...
          </>
        ) : (
          <>
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </>
        )}
      </button>

      <p className="mt-5 text-center text-sm text-[#767680]">
        {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}{' '}
        <button
          type="button"
          onClick={() => setMode((current) => current === 'login' ? 'register' : 'login')}
          className="font-bold text-[#4156b8] hover:text-[#061748]"
        >
          {mode === 'login' ? 'Criar conta' : 'Fazer login'}
        </button>
      </p>
    </section>
  );
};
