import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find((i) => i.product_id === item.product_id);

        if (existingItem) {
          const newItems = items.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
          set({
            items: newItems,
            total: newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
          });
        } else {
          const newItems = [...items, item];
          set({ 
            items: newItems,
            total: newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
          });
        }
      },
      removeItem: (productId) => {
        const newItems = get().items.filter((item) => item.product_id !== productId);
        set({
          items: newItems,
          total: newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
        });
      },
      updateQuantity: (productId, quantity) => {
        const newItems = get().items.map((item) =>
          item.product_id === productId ? { ...item, quantity } : item
        );
        set({
          items: newItems,
          total: newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
        });
      },
      clearCart: () => set({ items: [], total: 0 }),
      total: 0,
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.total = state.items.reduce(
            (sum, item) => sum + (item.product.price * item.quantity),
            0
          );
        }
      },
    }
  )
);