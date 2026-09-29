import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Order, VietQRConfig } from '../types';

const SHOP_ID = 'hongkong_cotran';
const DISPLAY_DOC = 'customer_display';
const CHANNEL_NAME = 'hk_pos_customer_display_channel';
const STORAGE_KEY = 'hk_pos_customer_display_state';

export interface CustomerDisplayState {
  order: Order | null;
  status: 'idle' | 'ordering' | 'completed';
  lastUpdated: number;
  cashierName?: string;
  completedAt?: number;
  storeName?: string;
  storeAddress?: string;
  storeHotline?: string;
  wifiSsid?: string;
  wifiPass?: string;
  vietQr?: VietQRConfig;
  lastAction?: 'item_added' | 'item_removed' | 'quantity_changed' | 'order_cleared' | 'order_completed' | 'initial';
  lastActionItemName?: string;
}

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

let firestoreDebounceTimer: any = null;

/**
 * Broadcast current order state from Cashier POS to Customer Facing Display
 * Realtime: 0ms on local multi-monitor via BroadcastChannel & LocalStorage,
 * and < 200ms across network/tablets via Firestore onSnapshot
 */
export function broadcastToCustomerDisplay(displayState: CustomerDisplayState): void {
  try {
    // 1. Local Storage for persistence and cross-tab storage events
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(displayState));
      // Dispatch internal window event
      window.dispatchEvent(new CustomEvent('hk_customer_display_update', { detail: displayState }));
    }

    // 2. BroadcastChannel for instant 0ms latency across windows/monitors
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'DISPLAY_UPDATE',
        payload: displayState,
      });
    }

    // 3. Debounced Firestore sync for secondary iPad/tablet across Wi-Fi
    if (firestoreDebounceTimer) {
      clearTimeout(firestoreDebounceTimer);
    }
    firestoreDebounceTimer = setTimeout(async () => {
      try {
        const displayDocRef = doc(db, 'shops', SHOP_ID, 'store', DISPLAY_DOC);
        await setDoc(displayDocRef, {
          displayState,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore display sync note:', err);
      }
    }, 150);
  } catch (err) {
    console.error('Error broadcasting to customer display:', err);
  }
}

/**
 * Register POS as responder to display pings
 */
export function listenForDisplayRequests(getCurrentState: () => CustomerDisplayState): () => void {
  if (!broadcastChannel) return () => {};

  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'REQUEST_DISPLAY_STATE') {
      const current = getCurrentState();
      broadcastToCustomerDisplay(current);
    }
  };

  broadcastChannel.addEventListener('message', handleMessage);
  return () => {
    broadcastChannel?.removeEventListener('message', handleMessage);
  };
}

/**
 * Subscribe to Customer Display state changes (used by CustomerDisplayView)
 */
export function subscribeToCustomerDisplay(
  onUpdate: (displayState: CustomerDisplayState) => void
): () => void {
  // 1. Initial local load
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as CustomerDisplayState;
      onUpdate(parsed);
    }
  } catch (err) {
    console.warn('Could not read cached display state:', err);
  }

  // 2. BroadcastChannel listener (Instant 0ms)
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'DISPLAY_UPDATE' && event.data.payload) {
      onUpdate(event.data.payload);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBcMessage);
    // Request current state from any active POS window
    broadcastChannel.postMessage({ type: 'REQUEST_DISPLAY_STATE' });
  }

  // 3. LocalStorage storage event listener (for secondary windows)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as CustomerDisplayState;
        onUpdate(parsed);
      } catch (e) {
        console.error('Error parsing storage event:', e);
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  // 4. CustomEvent listener
  const handleCustom = (event: any) => {
    if (event.detail) {
      onUpdate(event.detail);
    }
  };
  window.addEventListener('hk_customer_display_update', handleCustom);

  // 5. Cloud Firestore Realtime listener (for Wi-Fi / separate tablet or phone)
  let unsubFirestore = () => {};
  try {
    const displayDocRef = doc(db, 'shops', SHOP_ID, 'store', DISPLAY_DOC);
    unsubFirestore = onSnapshot(
      displayDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.displayState) {
            onUpdate(data.displayState as CustomerDisplayState);
          }
        }
      },
      (err) => {
        console.warn('Firestore display listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Firestore subscription failed:', err);
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('hk_customer_display_update', handleCustom);
    unsubFirestore();
  };
}
