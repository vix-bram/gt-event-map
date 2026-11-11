// Loads the events, keeping the last good download on the phone so the app
// still works offline or when Firebase can't be reached.
import { File, Paths } from 'expo-file-system';

import { downloadEvents, isEventList, type GtEvent } from '@/lib/events';

// In the app's document folder, which the phone doesn't clear on its own.
const savedFile = () => new File(Paths.document, 'events.json');

export type LoadedEvents = {
  events: GtEvent[];
  // When these events were downloaded.
  savedAt: Date;
  // Set when the download failed and the saved copy is shown instead:
  // why the download failed.
  offlineReason?: string;
};

// Downloads the events and saves them. If the download fails, returns the
// saved copy instead. Throws only when there is neither.
export async function loadEvents(): Promise<LoadedEvents> {
  try {
    const events = await downloadEvents();
    const savedAt = new Date();
    // A failed save shouldn't stop the fresh events from showing.
    await savedFile()
      .write(JSON.stringify({ saved_at: savedAt.toISOString(), events }))
      .catch((error: unknown) => console.warn("Couldn't save the events on the phone:", error));
    return { events, savedAt };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const saved = await readSaved();
    if (!saved) throw new Error(reason);
    return { ...saved, offlineReason: reason };
  }
}

// The saved copy, or null if there is none (first start) or it can't be read.
async function readSaved(): Promise<{ events: GtEvent[]; savedAt: Date } | null> {
  try {
    const file = savedFile();
    if (!file.exists) return null;
    const data = JSON.parse(await file.text());
    if (!isEventList(data.events)) return null;
    return { events: data.events, savedAt: new Date(data.saved_at) };
  } catch {
    return null;
  }
}
