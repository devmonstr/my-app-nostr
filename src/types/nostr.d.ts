/* src/types/nostr.d.ts */

// Represents a Nostr event structure before it is signed.
// - `id` and `sig` are not present as they are generated during signing.
// - `pubkey` is optional, as it can be added by the signer or pre-filled.
interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
}

// Represents a Nostr event structure after it has been signed.
// - `id`, `sig`, and `pubkey` are all mandatory string properties.
interface SignedNostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string; // Pubkey is confirmed and present post-signing
  id: string;     // Event ID is present post-signing
  sig: string;    // Signature is present post-signing
}

interface Nostr {
  getPublicKey(): Promise<string>;
  // Takes an event object (matching the redefined NostrEvent structure)
  // and returns a Promise that resolves to a SignedNostrEvent.
  signEvent(event: NostrEvent): Promise<SignedNostrEvent>;
}

interface Window {
  nostr?: Nostr;
}