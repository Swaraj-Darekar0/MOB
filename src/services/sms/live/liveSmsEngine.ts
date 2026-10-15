import { AppState, AppStateStatus } from 'react-native';
import { readDeviceSmsInbox } from '../native/smsReader';
import { processIncomingSms } from '../ingestion/smsIngestionService';
import { useAppStore } from '../../../store/useAppStore';

export const LIVE_POLL_INTERVAL_MS = 5000; // 5-second polling interval as per specification

export interface LiveSmsEngineStatus {
  isRunning: boolean;
  isPolling: boolean;
  lastPolledAt: number | null;
  totalProcessedInSession: number;
}

class LiveSmsEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private isRunning: boolean = false;
  private isPollingMutex: boolean = false;
  private lastPolledAt: number | null = null;
  private totalProcessedInSession: number = 0;
  private listeners: Set<(status: LiveSmsEngineStatus) => void> = new Set();

  /**
   * Starts the 5-second live SMS polling engine.
   * Runs an immediate catch-up scan, then establishes the 5s interval.
   * Pauses automatically when app is closed/backgrounded, and catches up on resume.
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.notifyStatus();

    // 1. Immediate catch-up poll on start
    this.pollNow();

    // 2. Set 5-second interval timer
    this.timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        this.pollNow();
      }
    }, LIVE_POLL_INTERVAL_MS);

    // 3. Listen to AppState transitions
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App resumed to foreground: immediate catch-up poll
        this.pollNow();
      } else if (nextState.match(/inactive|background/)) {
        // App backgrounded or closing: stop ongoing operations
        // (Interval will naturally skip when AppState !== 'active')
      }
    });
  }

  /**
   * Stops the live polling engine and cleans up timers and listeners.
   */
  public stop(): void {
    if (!this.isRunning) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isRunning = false;
    this.isPollingMutex = false;
    this.notifyStatus();
  }

  /**
   * Triggers an immediate poll execution (mutex-guarded).
   * Used for cold start catch-up, app resume, or manual refresh.
   */
  public async pollNow(): Promise<{ processedCount: number; scannedCount: number }> {
    if (this.isPollingMutex) {
      return { processedCount: 0, scannedCount: 0 };
    }

    this.isPollingMutex = true;
    this.notifyStatus();

    try {
      // 1. Fetch latest messages without requesting permission popups during polling
      const scanResult = await readDeviceSmsInbox({
        maxCount: 30,
        requestPermissionIfMissing: false,
      });

      const messages = scanResult.messages || [];
      let processedCount = 0;

      // 2. Sort chronologically (oldest to newest) to process transactions in authentic sequence
      const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

      for (const msg of sorted) {
        const result = processIncomingSms(msg.body, msg.sender, msg.timestamp);
        if (result.status === 'PROCESSED') {
          processedCount++;
        }
      }

      this.lastPolledAt = Date.now();
      this.totalProcessedInSession += processedCount;

      // 3. If any financial SMS was processed (expense, income, refund, or review queue addition),
      // update the Zustand reactive store immediately so all UI tabs reflect changes live!
      if (processedCount > 0) {
        await useAppStore.getState().loadInitialData();
      }

      return { processedCount, scannedCount: messages.length };
    } catch (error) {
      console.warn('[Live SMS Engine] Polling error:', error);
      return { processedCount: 0, scannedCount: 0 };
    } finally {
      this.isPollingMutex = false;
      this.notifyStatus();
    }
  }

  /**
   * Returns current engine status telemetry.
   */
  public getStatus(): LiveSmsEngineStatus {
    return {
      isRunning: this.isRunning,
      isPolling: this.isPollingMutex,
      lastPolledAt: this.lastPolledAt,
      totalProcessedInSession: this.totalProcessedInSession,
    };
  }

  /**
   * Subscribes to status updates.
   */
  public subscribe(callback: (status: LiveSmsEngineStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.error('[Live SMS Engine] Listener error:', e);
      }
    });
  }
}

export const liveSmsEngine = new LiveSmsEngine();
