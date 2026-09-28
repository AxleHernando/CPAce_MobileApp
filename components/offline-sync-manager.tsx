import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '@/lib/context/auth-context';
import { syncPendingQuizzes } from '@/lib/offline-quizzes';
import { refreshOfflineQuestionBankIfStale } from '@/lib/offline-question-bank';

export function OfflineSyncManager() {
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (!user) return;

    let syncing = false;
    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const state = await NetInfo.fetch();
        if (state.isConnected && state.isInternetReachable !== false) {
          const count = await syncPendingQuizzes(user.id);
          if (count > 0) await refreshUser();
          await refreshOfflineQuestionBankIfStale(user.id);
        }
      } catch {
        // Connectivity can disappear between the reachability check and sync.
      } finally {
        syncing = false;
      }
    };

    sync();
    const unsubscribeNetwork = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) sync();
    });
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });

    return () => {
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, [user, refreshUser]);

  return null;
}
