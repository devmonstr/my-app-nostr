'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Home() {
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [relays, setRelays] = useState('');

  const notifySuccess = (message: string) => toast.success(message, {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "light",
  });

  const notifyError = (message: string) => toast.error(message, {
    position: "top-center",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "light",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9a-f]{64}$/i.test(publicKey)) {
      notifyError('Public key must be a 64-character hex string');
      return;
    }

    try {
      // ตรวจสอบ username และ public_key ซ้ำ
      const { data: existingUser, error: checkError } = await supabase
        .from('registered_users')
        .select('username, public_key')
        .or(`username.eq.${username},public_key.eq.${publicKey}`);

      if (checkError) {
        notifyError(`Failed to check existing data: ${checkError.message}`);
        return;
      }

      if (existingUser && existingUser.length > 0) {
        if (existingUser.some((user) => user.username === username)) {
          notifyError('Username is already taken');
          return;
        }
        if (existingUser.some((user) => user.public_key === publicKey)) {
          notifyError('Public key is already registered');
          return;
        }
      }

      const relaysArray = relays ? relays.split(',').map((r) => r.trim()) : null;
      const { error } = await supabase
        .from('registered_users')
        .insert({
          username,
          public_key: publicKey,
          lightning_address: lightningAddress || null,
          relays: relaysArray,
        });

      if (error) {
        if (error.code === '23505') {
          notifyError('Username or Public key is already taken');
        } else {
          notifyError(error.message);
        }
        return;
      }

      notifySuccess('Registration successful!');
      setUsername('');
      setPublicKey('');
      setLightningAddress('');
      setRelays('');
    } catch (error: any) {
      notifyError(error.message);
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
        <ToastContainer />
      </div>
    </div>
  );
}