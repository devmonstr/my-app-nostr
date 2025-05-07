'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Account() {
  const [publicKey, setPublicKey] = useState('');
  const [userData, setUserData] = useState<{
    username: string;
    lightning_address: string | null;
    relays: string | null;
  } | null>(null);
  const [username, setUsername] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [relays, setRelays] = useState('');

  const notifySuccess = (message: string) =>
    toast.success(message, {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: 'light',
    });

  const notifyError = (message: string) =>
    toast.error(message, {
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: 'light',
    });

  const handleFetchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9a-f]{64}$/i.test(publicKey)) {
      notifyError('Public key must be a 64-character hex string');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('registered_users')
        .select('username, lightning_address, relays')
        .eq('public_key', publicKey)
        .single();

      if (error || !data) {
        notifyError('User not found');
        return;
      }

      setUserData(data);
      setUsername(data.username);
      setLightningAddress(data.lightning_address || '');
      setRelays(data.relays ? data.relays.join(',') : '');
    } catch (error: any) {
      notifyError(error.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) {
      notifyError('Please fetch user data first');
      return;
    }

    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('registered_users')
        .select('username')
        .eq('username', username)
        .neq('public_key', publicKey);

      if (checkError) {
        notifyError(`Failed to check username: ${checkError.message}`);
        return;
      }

      if (existingUser && existingUser.length > 0) {
        notifyError('Username is already taken');
        return;
      }

      const relaysArray = relays ? relays.split(',').map((r) => r.trim()) : null;
      const { error } = await supabase
        .from('registered_users')
        .update({
          username,
          lightning_address: lightningAddress || null,
          relays: relaysArray,
        })
        .eq('public_key', publicKey);

      if (error) {
        if (error.code === '23505') {
          notifyError('Username is already taken');
        } else {
          notifyError(error.message);
        }
        return;
      }

      notifySuccess('Account updated successfully!');
      setUserData({ username, lightning_address: lightningAddress || null, relays });
    } catch (error: any) {
      notifyError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Manage Account</h1>
        {!userData ? (
          <form onSubmit={handleFetchUser} className="space-y-4">
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
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
            >
              Fetch Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
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
              className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
            >
              Update Account
            </button>
          </form>
        )}
        <ToastContainer position="top-center" />
      </div>
    </div>
  );
}