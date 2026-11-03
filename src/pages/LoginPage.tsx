import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const REMEMBER_KEY = 'customer_remembered_email';

const STYLES = `
@keyframes flutua {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes radar-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes login-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .login-anim { animation: none !important; }
}
`;

const FLOATING_CARDS = [
  { icon: 'shopping_bag', title: 'Sacola pronta', detail: 'Seus óculos favoritos', delay: '0s', top: '14%', left: '6%' },
  { icon: 'favorite', title: 'Lista de desejos', detail: 'Itens salvos por você', delay: '1.2s', top: '36%', left: '16%' },
  { icon: 'local_shipping', title: 'Frete grátis', detail: 'Acima de R$ 299', delay: '2.4s', top: '58%', left: '5%' },
  { icon: 'verified', title: 'Garantia estendida', detail: '2 anos em todos os produtos', delay: '3.6s', top: '76%', left: '12%' },
];

interface AccountUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const redirectTo = (location.state as { from?: string })?.from || '/';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    window.history.replaceState({}, '', window.location.pathname);
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
        if (result.user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate(redirectTo, { replace: true });
        }
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);

      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim(), password }),
      });
      const result = await response.json() as { user?: AccountUser; error?: string };
      if (!response.ok || !result.user) {
        setError(result.error || 'Confira seus dados e tente novamente.');
        return;
      }
      if (result.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'h-11 w-full rounded-xl border border-[#051647]/15 bg-white pl-10 text-sm text-[#051647] outline-none transition-all placeholder:text-[#051647]/35 focus:border-[#8c9a00] focus:ring-2 focus:ring-[#C4D600]/35';

  return (
    <main className="relative isolate flex min-h-dvh overflow-hidden bg-[#f4f5f8]">
      <style>{STYLES}</style>
      <div
        aria-hidden="true"
        className="login-anim pointer-events-none absolute inset-0 z-0 bg-[length:300%_300%]"
        style={{
          backgroundImage: 'linear-gradient(55deg, #f4f5f8 0%, #dde5fa 25%, #f4f5f8 50%, #dde5fa 75%, #e6ee9a 135%)',
          animation: 'login-flow 18s ease-in-out infinite',
        }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] hidden lg:block">
        <div className="absolute left-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(196,214,0,0.16)_0%,_transparent_70%)]" />
        <div className="absolute left-[19%] top-1/2 -translate-x-1/2 -translate-y-1/2">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="login-anim absolute inset-0 rounded-full border border-[#8c9a00]/35"
              style={{ animation: `radar-pulse 3s ease-out ${index}s infinite` }}
            />
          ))}
          <div className="relative flex size-40 items-center justify-center rounded-[28%] border border-[#051647]/10 bg-white/70 shadow-xl backdrop-blur-xl">
            <span className="material-symbols-outlined text-[64px] text-[#051647]">storefront</span>
          </div>
        </div>
        {FLOATING_CARDS.map((card) => (
          <div
            key={card.title}
            className="login-anim absolute flex items-center gap-3 rounded-2xl border border-[#051647]/10 bg-white/85 px-5 py-3.5 shadow-lg shadow-[#051647]/10 backdrop-blur-xl"
            style={{ top: card.top, left: card.left, animation: `flutua 4s ease-in-out ${card.delay} infinite` }}
          >
            <span className="material-symbols-outlined shrink-0 text-[20px] text-[#7a8700]">{card.icon}</span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-[#051647]">{card.title}</p>
              <p className="text-[11px] text-[#051647]/60">{card.detail}</p>
            </div>
          </div>
        ))}
        <div className="absolute bottom-12 left-12 max-w-xs text-left">
          <h3 className="text-[26px] font-semibold leading-tight tracking-tight text-[#051647]">Sua experiência Óticas Brasil</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[#051647]/60">
            Acesse sua conta para acompanhar pedidos, salvar favoritos e aproveitar ofertas exclusivas.
          </p>
        </div>
      </div>

      <section className="relative z-10 mx-auto my-auto flex max-w-[440px] items-center rounded-[28px] border border-[#051647]/10 bg-white/85 p-7 shadow-2xl shadow-[#051647]/10 backdrop-blur-[26px] backdrop-saturate-[1.4] sm:p-8 lg:absolute lg:right-0 lg:top-1/2 lg:mx-0 lg:h-[138dvh] lg:w-[min(63vw,1020px)] lg:max-w-none lg:-translate-y-1/2 lg:rounded-none lg:rounded-bl-[69dvh] lg:rounded-tl-[69dvh] lg:border-y-0 lg:border-r-0 lg:border-l lg:p-0 lg:shadow-[-8px_0_40px_-12px_rgba(5,22,71,0.18)]">
        <div className="mx-auto flex w-full max-w-[310px] flex-col gap-6 lg:ml-[clamp(48px,8vw,140px)]">
          <div className="flex flex-col items-start gap-2">
            <img
              src="/logos/logo-blue.png"
              alt="Óticas Brasil"
              className="h-14 w-auto object-contain"
            />
            <span className="text-[10.5px] font-medium uppercase tracking-[0.25em] text-[#6f7c00]">E-commerce · Área do Cliente</span>
          </div>

          <div>
            <h1 className="text-[21px] font-semibold tracking-tight text-[#051647]">
              {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
            </h1>
            <p className="mt-1 text-[13px] text-[#051647]/60">
              {mode === 'login' ? 'Entre para continuar comprando.' : 'Cadastre-se para aproveitar todas as vantagens.'}
            </p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="block space-y-1.5 text-[13px] font-medium text-[#051647]/80">
                Nome completo
                <span className="relative block">
                  <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#051647]/40">person</span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    minLength={2}
                    maxLength={160}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome completo"
                    className={`${inputCls} pr-4`}
                  />
                </span>
              </label>
            )}

            <label className="block space-y-1.5 text-[13px] font-medium text-[#051647]/80">
              E-mail
              <span className="relative block">
                <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#051647]/40">mail</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  className={`${inputCls} pr-4`}
                />
              </span>
            </label>

            <label className="block space-y-1.5 text-[13px] font-medium text-[#051647]/80">
              Senha
              <span className="relative block">
                <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#051647]/40">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'register' ? 10 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'register' ? 'Mínimo de 10 caracteres' : 'Sua senha'}
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[#051647]/40 transition-colors hover:bg-[#051647]/5 hover:text-[#051647]"
                >
                  <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
                {error}
              </p>
            )}

            {mode === 'login' && (
              <label className="group flex cursor-pointer select-none items-center gap-2.5">
                <div className="relative flex items-center">
                  <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="peer sr-only" />
                  <div className="h-5 w-5 rounded-md border-2 border-[#051647]/30 bg-white transition-all group-hover:border-[#051647]/50 peer-checked:border-[#C4D600] peer-checked:bg-[#C4D600] peer-focus-visible:ring-2 peer-focus-visible:ring-[#C4D600]/60 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-white" />
                  <svg
                    className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-[#051647] transition-transform"
                    style={{ transform: remember ? 'scale(1)' : 'scale(0)' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-[13px] font-medium text-[#051647]/60 transition-colors group-hover:text-[#051647]/80">Lembrar de mim</span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C4D600] px-4 text-sm font-bold text-[#051647] shadow-[0_4px_0_0_rgb(142,156,0),0_6px_16px_-4px_rgba(196,214,0,0.4)] transition-all hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_0_rgb(142,156,0),0_3px_8px_-2px_rgba(196,214,0,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0"
            >
              {submitting && <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
              {submitting
                ? (mode === 'login' ? 'Entrando...' : 'Criando conta...')
                : (mode === 'login' ? 'Entrar' : 'Criar conta')}
            </button>
          </form>

          {/* Google OAuth */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#051647]/10" />
            <span className="text-[11px] font-semibold text-[#051647]/40">ou</span>
            <div className="h-px flex-1 bg-[#051647]/10" />
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || submitting}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#051647]/15 bg-white px-4 text-sm font-bold text-[#051647] transition-all hover:bg-[#f4f5f8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
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

          <p className="text-center text-[13px] text-[#051647]/60">
            {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'}{' '}
            <button
              type="button"
              onClick={() => { setMode((current) => current === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-bold text-[#4156b8] hover:text-[#061748] cursor-pointer"
            >
              {mode === 'login' ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-center text-[12px] font-medium text-[#051647]/50 transition-colors hover:text-[#4156b8] cursor-pointer"
          >
            ← Voltar à loja
          </button>

          <div className="space-y-1 border-t border-[#051647]/10 pt-4 text-center">
            <p className="text-[10px] text-[#051647]/45">Óticas Brasil · Loja Online</p>
            <p className="text-[10px] text-[#051647]/45">suporte@oticasbrasil.com.br</p>
          </div>
        </div>
      </section>
    </main>
  );
};