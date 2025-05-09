/* src/types/nostr.d.ts */
interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string;
  id?: string;
  sig: string;
}

interface Nostr {
  getPublicKey(): Promise<string>;
  signEvent(event: Omit<NostrEvent, 'pubkey' | 'sig' | 'id'>): Promise<NostrEvent>;
}

interface Window {
  nostr?: Nostr;
}