import React, { useEffect, useState } from 'react';

const REMEMBER_KEY = 'admin_remembered_email';

const FLOATING_CARDS = [
  { icon: 'shopping_bag', title: 'Novo pedido', detail: 'Loja online · agora', delay: '0s', top: '12%', left: '8%' },
  { icon: 'payments', title: 'Pagamento confirmado', detail: 'Pix · R$ 1.240', delay: '1.2s', top: '34%', left: '18%' },
  { icon: 'inventory_2', title: 'Catálogo atualizado', detail: 'Produtos sincronizados', delay: '2.4s', top: '58%', left: '4%' },
  { icon: 'local_shipping', title: 'Pedido enviado', detail: 'Rastreio disponível', delay: '3.6s', top: '76%', left: '14%' },
];

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

interface AdminLoginProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);
      await onSubmit(email.trim(), password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.');
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
          <div className="relative flex size-40 items-center justify-center           rounded-[28%] border border-[#051647]/10 bg-white/70 shadow-xl backdrop-blur-xl">
                      <span className="material-symbols-outlined text-[64px] text-[#051647]">storefront</span>
          </div>
        </div>
        {FLOATING_CARDS.map((card) => (
          <div
            key={card.title}
            className="login-anim absolute flex items-center gap-3             rounded-2xl border border-[#051647]/10 bg-white/85 px-5 py-3.5 shadow-lg shadow-[#051647]/10 backdrop-blur-xl"
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
          <h3 className="          text-[26px] font-semibold leading-tight tracking-tight text-[#051647]">Gestão completa da loja</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#051647]/60">
            Pedidos, clientes, catálogo e configurações do seu e-commerce em um único painel.
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
            <span className="text-[10.5px] font-medium uppercase tracking-[0.25em] text-[#6f7c00]">E-commerce · Painel Administrativo</span>
          </div>

          <div>
            <h1 className="            text-[21px] font-semibold tracking-tight text-[#051647]">Acesse sua conta</h1>
                        <p className="mt-1 text-[13px] text-[#051647]/60">Entre para continuar no painel da loja.</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
                  placeholder="voce@oticasbrasil.com.br"
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
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

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C4D600] px-4 text-sm font-bold text-[#051647] shadow-[0_4px_0_0_rgb(142,156,0),0_6px_16px_-4px_rgba(196,214,0,0.4)] transition-all hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_0_rgb(142,156,0),0_3px_8px_-2px_rgba(196,214,0,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0"
            >
              {submitting && <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <a href="/" className="text-center text-[12px] font-medium text-[#051647]/50 transition-colors hover:text-[#4156b8]">
            ← Voltar ao site
          </a>

          <div className="space-y-1           border-t border-[#051647]/10 pt-4 text-center">
                      <p className="text-[10px] text-[#051647]/45">Ambiente interno · Acesso restrito</p>
                      <p className="text-[10px] text-[#051647]/45">suporte@oticasbrasil.com.br</p>
          </div>
        </div>
      </section>
    </main>
  );
};
