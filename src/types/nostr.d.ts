/* src/types/nostr.d.ts */
interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
  id?: string;
  sig?: string;
}

interface Nostr {
  getPublicKey(): Promise<string>;
  signEvent(event: NostrEvent): Promise<NostrEvent>;
}

interface Window {
  nostr?: Nostr;
}