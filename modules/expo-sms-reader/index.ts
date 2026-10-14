import { requireNativeModule } from 'expo-modules-core';

export interface NativeSmsRecord {
  id?: string;
  sender: string;
  body: string;
  timestamp: number;
}

let nativeModule: {
  readInbox: (maxCount?: number, sinceTimestamp?: number) => Promise<NativeSmsRecord[]>;
} | null = null;

try {
  nativeModule = requireNativeModule('ExpoSmsReader');
} catch {
  nativeModule = null;
}

export const isNativeSmsReaderAvailable = (): boolean => {
  return nativeModule !== null && typeof nativeModule.readInbox === 'function';
};

export async function readNativeInbox(
  maxCount: number = 100,
  sinceTimestamp: number = 0
): Promise<NativeSmsRecord[]> {
  if (!nativeModule || typeof nativeModule.readInbox !== 'function') {
    return [];
  }
  try {
    return await nativeModule.readInbox(maxCount, sinceTimestamp);
  } catch (error) {
    console.warn('[ExpoSmsReader] Failed to query native inbox:', error);
    return [];
  }
}
