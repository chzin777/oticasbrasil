import React, { useEffect, useMemo, useState } from 'react';

interface StoreFromApi {
  id: string;
  name: string;
  address: string | null;
  address_number: string | null;
  complement: string | null;
  postal_code: string | null;
  city: string | null;
  state: string | null;
  neighborhoods: string[] | null;
  kind: string | null;
  lat: number | null;
  lng: number | null;
  number: number;
}

interface StoresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const StoresModal: React.FC<StoresModalProps> = ({ isOpen, onClose }) => {
  const [stores, setStores] = useState<StoreFromApi[]>([]);
  const [search, setSearch] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStores(data.stores || []);
      })
      .catch(() => {
        if (!cancelled) setStores([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGeoStatus('granted');
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  };

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = stores.map((s) => ({
      ...s,
      distanceKm:
        userLat != null && userLng != null && s.lat != null && s.lng != null
          ? haversineKm(userLat, userLng, s.lat, s.lng)
          : null,
    }));

    if (term) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.city || '').toLowerCase().includes(term) ||
          (s.state || '').toLowerCase().includes(term) ||
          (s.neighborhoods || []).some((n) => n.toLowerCase().includes(term)) ||
          (s.address || '').toLowerCase().includes(term) ||
          (s.postal_code || '').includes(term),
      );
    }

    list.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return a.number - b.number;
    });

    return list;
  }, [stores, search, userLat, userLng]);

  if (!isOpen) return null;

  const formatAddress = (s: StoreFromApi) => {
    const parts = [s.address, s.address_number].filter(Boolean).join(', ');
    const comp = s.complement ? ` - ${s.complement}` : '';
    return `${parts}${comp}`;
  };

  const formatNeighborhoods = (s: StoreFromApi) => {
    const nb = (s.neighborhoods || []).join(', ');
    const cityState = [s.city, s.state].filter(Boolean).join(' - ');
    return [nb, cityState].filter(Boolean).join(' • ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#c6c5d0]/30 max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#061748] text-white p-4 sm:p-6 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#dbee2c]">
              Atendimento Presencial
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Nossas Lojas</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Search + Geo */}
        <div className="p-4 sm:px-6 sm:pt-5 pb-2 flex flex-col gap-3 border-b border-[#e0e3e5]">
          <p className="text-xs text-[#45464f]">
            Visite nossas unidades para ajuste anatômico gratuito da sua armação, medição digital de DNP por vídeo-computação e consultoria com ópticos diplomados.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8d97] text-lg">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, cidade, bairro ou CEP..."
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-[#d5d8dc] bg-[#f8f9fa] focus:outline-none focus:ring-2 focus:ring-[#061748]/20 focus:border-[#061748] placeholder:text-[#8b8d97]"
              />
            </div>

            <button
              onClick={requestLocation}
              disabled={geoStatus === 'locating'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all whitespace-nowrap ${
                geoStatus === 'granted'
                  ? 'bg-[#dbee2c] text-[#061748] border-[#dbee2c]'
                  : geoStatus === 'denied'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-white text-[#061748] border-[#d5d8dc] hover:border-[#061748]'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {geoStatus === 'locating' ? 'progress_activity' : 'my_location'}
              </span>
              {geoStatus === 'idle' && 'Usar minha localização'}
              {geoStatus === 'locating' && 'Localizando...'}
              {geoStatus === 'granted' && 'Localização ativa'}
              {geoStatus === 'denied' && 'Localização bloqueada'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#6b6d76]">
            <span>
              {filteredStores.length} {filteredStores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
            </span>
            {userLat != null && userLng != null && (
              <span className="flex items-center gap-1 text-[#061748] font-medium">
                <span className="material-symbols-outlined text-[13px]">near_me</span>
                Ordenando por distância
              </span>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-4 flex flex-col gap-3">
          {loading && (
            <div className="py-12 text-center text-sm text-[#6b6d76] flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
              Carregando lojas...
            </div>
          )}

          {!loading && filteredStores.length === 0 && (
            <div className="py-12 text-center text-sm text-[#6b6d76] flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl">storefront</span>
              Nenhuma loja encontrada para &quot;{search}&quot;.
            </div>
          )}

          {!loading &&
            filteredStores.map((store) => (
              <div
                key={store.id}
                className="bg-[#f2f4f6] p-4 rounded-2xl border border-[#e0e3e5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-[#061748] truncate">{store.name}</h4>
                    {store.kind === 'Otica' && (
                      <span className="text-[10px] bg-[#dde1ff] text-[#001257] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-[13px]">lens</span> Ótica
                      </span>
                    )}
                    {store.distanceKm != null && (
                      <span className="text-[10px] bg-[#dbee2c] text-[#061748] font-bold px-2 py-0.5 rounded-full shrink-0">
                        {store.distanceKm < 1
                          ? `${Math.round(store.distanceKm * 1000)} m`
                          : `${store.distanceKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#191c1e] font-medium truncate">{formatAddress(store)}</p>
                  <p className="text-xs text-[#45464f] truncate">{formatNeighborhoods(store)}</p>
                  {store.postal_code && (
                    <p className="text-[11px] text-[#6b6d76]">CEP: {store.postal_code}</p>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${store.name} ${store.address || ''} ${store.city || ''} ${store.state || ''}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none bg-[#061748] text-white text-xs font-bold px-4 py-2 rounded-full hover:brightness-125 text-center cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">map</span>
                    Ver no Mapa
                  </a>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-[#f2f4f6] border-t border-[#e0e3e5] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#061748] text-white text-xs font-bold px-5 py-2 rounded-full cursor-pointer hover:brightness-125 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};