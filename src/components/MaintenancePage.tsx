import React from 'react';
import './MaintenancePage.css';

interface MaintenancePageProps {
  storeName: string;
  message: string;
}

const STAR_POSITIONS = [1, 2, 3, 4, 5, 6, 7];

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ storeName, message }) => (
  <main className="mt-page">
    {[1, 2, 3, 4].map((layer) => (
      <div key={layer} className={`mt-stars ${layer > 1 ? `mt-stars-${layer}` : ''}`} aria-hidden="true">
        {STAR_POSITIONS.map((position) => (
          <div key={position} className={`mt-star mt-p${position}`} />
        ))}
      </div>
    ))}

    <div className="mt-astro-wrap" aria-hidden="true">
      <div className="mt-astro">
        <div className="mt-head" />
        <div className="mt-arm mt-arm-l" />
        <div className="mt-arm mt-arm-r" />
        <div className="mt-body"><div className="mt-panel" /></div>
        <div className="mt-leg mt-leg-l" />
        <div className="mt-leg mt-leg-r" />
        <div className="mt-bag" />
      </div>
    </div>

    <div className="mt-content">
      <img src="/logos/logo-blue.png" alt={storeName} className="mt-logo" />
      <span className="mt-badge"><span className="mt-dot" />Voltamos em breve</span>
      <h1 className="mt-title">Loja em manutenção</h1>
      <p className="mt-message">{message}</p>
      <p className="mt-footer">Estamos deixando tudo pronto para você.</p>
    </div>
  </main>
);
