// src/types/nostr.d.ts
interface Nostr {
    getPublicKey(): Promise<string>;
  }
  
  interface Window {
    nostr?: Nostr;
  }