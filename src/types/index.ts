export type UserRole = 'admin' | 'vendor' | 'customer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Vendor extends User {
  store_name: string;
  description?: string;
  is_verified: boolean;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product_id: string;
  quantity: number;
  product: Product & {
    vendor?: {
      store_name: string;
      is_verified: boolean;
    };
  };
}

export interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  items: CartItem[];
  total_amount: number;
  status: 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
  payment_method: 'cod' | 'bank_transfer';
  created_at: string;
  updated_at: string;
}