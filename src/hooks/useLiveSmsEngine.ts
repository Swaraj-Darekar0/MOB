import { useState, useEffect } from 'react';
import { liveSmsEngine, LiveSmsEngineStatus } from '../services/sms/live/liveSmsEngine';

/**
 * React hook to observe and interact with the Live SMS Polling Engine.
 */
export function useLiveSmsEngine() {
  const [status, setStatus] = useState<LiveSmsEngineStatus>(liveSmsEngine.getStatus());

  useEffect(() => {
    const unsubscribe = liveSmsEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return {
    ...status,
    start: () => liveSmsEngine.start(),
    stop: () => liveSmsEngine.stop(),
    pollNow: () => liveSmsEngine.pollNow(),
  };
}
