'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [relays, setRelays] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9a-f]{64}$/i.test(publicKey)) {
      setMessage('Error: Public key must be a 64-character hex string');
      return;
    }
    try {
      const relaysArray = relays ? relays.split(',').map((r) => r.trim()) : null;
      const { error } = await supabase
        .from('registered_users')
        .insert({
          username,
          public_key: publicKey,
          lightning_address: lightningAddress || null,
          relays: relaysArray,
        });
      if (error) throw error;
      setMessage('Registration successful!');
      setUsername('');
      setPublicKey('');
      setLightningAddress('');
      setRelays('');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Nostr Address Provider</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="publicKey" className="block text-sm font-medium text-gray-700">
              Public Key (hex)
            </label>
            <input
              type="text"
              id="publicKey"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="lightningAddress" className="block text-sm font-medium text-gray-700">
              Lightning Address (optional)
            </label>
            <input
              type="text"
              id="lightningAddress"
              value={lightningAddress}
              onChange={(e) => setLightningAddress(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="relays" className="block text-sm font-medium text-gray-700">
              Relays (comma-separated, optional)
            </label>
            <input
              type="text"
              id="relays"
              value={relays}
              onChange={(e) => setRelays(e.target.value)}
              className="mt-1 p-2 w-full border rounded-md"
              placeholder="wss://relay1.com,wss://relay2.com"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
          >
            Register
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  );
}