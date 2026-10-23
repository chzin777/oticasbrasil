export type PaymentMethod = 'pix' | 'card' | 'boleto';

export type DeliveryMethod = 'sedex' | 'boutique';

export type AppPage = 'home' | 'product' | 'checkout' | 'frames' | 'sunglasses' | 'lenses' | 'wishlist' | 'allProducts' | 'about' | 'profile' | 'taxas';

export interface PrescriptionData {
  file: File | null;
  filePreviewUrl?: string;
  fileName?: string;
  sendViaWhatsApp: boolean;
  manualEntered: boolean;
  odSph: string;
  odCyl: string;
  odAxis: string;
  oeSph: string;
  oeCyl: string;
  oeAxis: string;
  dnp: string;
}

export interface CustomerData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
}

export interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface OrderItem {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  size: string;
  lensType: string;
  price: number;
  image: string;
  quantity: number;
}

export interface ProductColorOption {
  name: string;
  hex: string;
}

export interface EyewearProduct {
  id: string;
  name: string;
  category: 'armacoes' | 'oculos-de-sol' | 'lentes-de-grau' | 'rayban-meta';
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  gallery: string[];
  colorName: string;
  colorHex: string;
  availableColors: ProductColorOption[];
  material: string;
  shape: string;
  calibre: string;
  availableCalibres: string[];
  description: string;
  fullStory?: string;
  specs: {
    lensWidth: string;
    bridgeWidth: string;
    templeLength: string;
    weight: string;
    hingeType: string;
    origin: string;
  };
  badge?: string;
}

export interface OpticalStore {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  hours: string;
  phone: string;
  hasLab: boolean;
}
