import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, getDocFromServer, Firestore } from 'firebase/firestore';
import { AppState } from '../types';
import { mergeStates, loadState, mergeOrdersList, mergeExpensesList, mergeShiftsList } from './storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const SHOP_ID = 'hongkong_cotran';
const STORE_DOC = 'shared_state';

export type SyncStatus = 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

let currentSyncStatus: SyncStatus = 'connecting';
let syncStatusListeners: ((status: SyncStatus, error?: string) => void)[] = [];
let lastSyncError = '';

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function getLastSyncError(): string {
  return lastSyncError;
}

export function onSyncStatusChange(listener: (status: SyncStatus, error?: string) => void): () => void {
  syncStatusListeners.push(listener);
  listener(currentSyncStatus, lastSyncError);
  return () => {
    syncStatusListeners = syncStatusListeners.filter(l => l !== listener);
  };
}

function notifySyncStatus(status: SyncStatus, error?: string) {
  currentSyncStatus = status;
  if (error) lastSyncError = error;
  syncStatusListeners.forEach(l => l(status, error));
}

// Validate connection to Firestore as required by Firebase skill
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    notifySyncStatus('synced');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline:', error);
      notifySyncStatus('offline', 'Thiết bị đang ngoại tuyến hoặc không có mạng');
    } else {
      console.warn('Firestore test connection note:', error);
      notifySyncStatus('synced'); // test doc may not exist yet, but connection is alive
    }
    return false;
  }
}

/**
 * Subscribes to real-time updates from Firestore across all devices and networks
 */
export function subscribeToCloudState(
  onStateReceived: (cloudState: AppState) => void,
  initialLocalState: AppState
): () => void {
  const storeRef = doc(db, 'shops', SHOP_ID, 'store', STORE_DOC);

  notifySyncStatus('connecting');

  const unsubscribe = onSnapshot(
    storeRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        notifySyncStatus('synced');
        if (data && data.state) {
          const cloudState = data.state as AppState;
          const currentLocal = loadState();

          const combinedDeletedOrderIds = Array.from(new Set([
            ...(currentLocal.deletedOrderIds || []),
            ...(cloudState.deletedOrderIds || [])
          ]));
          const combinedDeletedExpenseIds = Array.from(new Set([
            ...(currentLocal.deletedExpenseIds || []),
            ...(cloudState.deletedExpenseIds || [])
          ]));

          // Cloud state is the single source of truth for catalog (menu, categories, configs, users, settings)
          // Transactional data (orders, expenses, shifts) is merged with tombstone filtering
          const merged: AppState = {
            ...currentLocal,
            ...cloudState,
            deletedOrderIds: combinedDeletedOrderIds,
            deletedExpenseIds: combinedDeletedExpenseIds,
            menu: (cloudState.menu && Array.isArray(cloudState.menu) && cloudState.menu.length > 0)
              ? cloudState.menu
              : currentLocal.menu,
            categories: (cloudState.categories && Array.isArray(cloudState.categories) && cloudState.categories.length > 0)
              ? cloudState.categories
              : currentLocal.categories,
            categoryConfigs: (cloudState.categoryConfigs && Array.isArray(cloudState.categoryConfigs) && cloudState.categoryConfigs.length > 0)
              ? cloudState.categoryConfigs
              : currentLocal.categoryConfigs,
            users: (cloudState.users && Array.isArray(cloudState.users) && cloudState.users.length > 0)
              ? cloudState.users
              : currentLocal.users,
            orders: mergeOrdersList(currentLocal.orders, cloudState.orders, combinedDeletedOrderIds),
            expenses: mergeExpensesList(currentLocal.expenses, cloudState.expenses, combinedDeletedExpenseIds),
            shifts: mergeShiftsList(currentLocal.shifts, cloudState.shifts),
            currentShift: cloudState.currentShift || currentLocal.currentShift,
          };
          onStateReceived(merged);
        }
      } else {
        // First time initialization: ONLY seed with current local state if store does not exist
        try {
          notifySyncStatus('syncing');
          const localCurrent = loadState();
          await setDoc(storeRef, {
            state: localCurrent,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system_init',
          });
          notifySyncStatus('synced');
        } catch (err) {
          console.error('Error seeding initial Firestore state:', err);
          notifySyncStatus('error', (err as Error).message);
        }
      }
    },
    (error) => {
      console.error('Firestore onSnapshot error:', error);
      notifySyncStatus('error', error.message);
    }
  );

  return unsubscribe;
}

/**
 * Pushes state updates to Firestore so all other devices receive them instantly.
 * Merges transactional orders/expenses with latest Firestore document prior to write,
 * while preserving catalog and menu item deletions from newState!
 */
export async function pushStateToCloud(newState: AppState, updatedBy: string = 'client'): Promise<boolean> {
  try {
    notifySyncStatus('syncing');
    const storeRef = doc(db, 'shops', SHOP_ID, 'store', STORE_DOC);

    let stateToWrite = newState;
    try {
      const snap = await getDoc(storeRef);
      if (snap.exists()) {
        const cloudData = snap.data();
        if (cloudData && cloudData.state) {
          const cloudState = cloudData.state as AppState;

          const combinedDeletedOrderIds = Array.from(new Set([
            ...(newState.deletedOrderIds || []),
            ...(cloudState.deletedOrderIds || [])
          ]));
          const combinedDeletedExpenseIds = Array.from(new Set([
            ...(newState.deletedExpenseIds || []),
            ...(cloudState.deletedExpenseIds || [])
          ]));

          // Transactional data (orders, expenses, shifts) are merged with tombstone filtering
          // Catalog data (menu, categories, configs, users, settings) ARE TAKEN DIRECTLY FROM newState!
          // This allows users to add, edit, and DELETE items without them being resurrected!
          stateToWrite = {
            ...cloudState,
            ...newState, // newState takes priority for menu, categories, users, settings
            deletedOrderIds: combinedDeletedOrderIds,
            deletedExpenseIds: combinedDeletedExpenseIds,
            menu: newState.menu,
            categories: newState.categories,
            categoryConfigs: newState.categoryConfigs,
            users: newState.users,
            printerSettings: newState.printerSettings,
            billTemplate: newState.billTemplate,
            labelTemplate: newState.labelTemplate,
            homepage: newState.homepage,
            orders: mergeOrdersList(newState.orders, cloudState.orders, combinedDeletedOrderIds),
            expenses: mergeExpensesList(newState.expenses, cloudState.expenses, combinedDeletedExpenseIds),
            shifts: mergeShiftsList(newState.shifts, cloudState.shifts),
            currentShift: newState.currentShift || cloudState.currentShift,
          };
        }
      }
    } catch (e) {
      console.warn('Could not pre-fetch cloud doc for merge, proceeding with stateToWrite:', e);
    }

    await setDoc(storeRef, {
      state: stateToWrite,
      updatedAt: new Date().toISOString(),
      updatedBy,
    });
    notifySyncStatus('synced');
    return true;
  } catch (error) {
    console.error('Error pushing state to Firestore:', error);
    notifySyncStatus('error', (error as Error).message);
    return false;
  }
}

// Initial connection test
validateFirestoreConnection();
