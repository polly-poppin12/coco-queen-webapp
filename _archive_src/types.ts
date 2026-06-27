export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  ingredients: string;
  benefits: string;
  usage: string;
  category: string;
  price: number;
  images: string[];
  stock: number;
  rating: number;
  reviews: Review[];
  status: 'Draft' | 'Published';
  skinType?: string;
  hairType?: string;
  isRecurring?: boolean; // For Stripe subscription options
}

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'owner';
  isVerified: boolean;
  loyaltyPoints: number;
  referralCode: string;
  referredBy?: string;
  addresses: Address[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isRecurring?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  paymentMethodId?: string;
  pointsEarned: number;
  pointsRedeemed: number;
  total: number;
  shippingAddress: Address;
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  shippingStatus: 'Pending' | 'Shipped' | 'Delivered';
  createdAt: string;
}

export interface Blog {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  image: string;
  readTime: string;
  date: string;
}

export interface Career {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string[];
}

export interface Promotion {
  code: string;
  discountPercent: number;
  description: string;
  minSpend?: number;
  maxDiscount?: number;
  expiresAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  isRecurring?: boolean;
}
