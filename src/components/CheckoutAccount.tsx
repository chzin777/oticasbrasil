import React, { useState } from 'react';
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
