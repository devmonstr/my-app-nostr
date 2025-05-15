/* src/app/page.tsx */
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { nip19, verifyEvent } from 'nostr-tools';

function HomeContent() {
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [relays, setRelays] = useState('');
  const { theme } = useTheme();

  const notifySuccess = (message: string) =>
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme,
    });

  const notifyError = (message: string) =>
    toast.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme,
    });

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9]*$/.test(value)) {
      setUsername(value);
    } else {
      notifyError('Username must contain only letters and numbers');
    }
  };

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPublicKey(value);
  };

  const validateAndConvertPublicKey = (input: string): string | null => {
    if (/^[a-fA-F0-9]{64}$/.test(input)) {
      return input.toLowerCase();
    }

    if (input.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(input);
        if (decoded.type === 'npub') {
          return decoded.data;
        }
      } catch (error) {
        return null;
      }
    }

    return null;
  };

  const handleRegisterWithExtension = async () => {
    if (!window.nostr) {
      notifyError('Nostr extension not detected. Please install Alby, Nos2x, or Nostore.');
      return;
    }

    try {
      const pubkey = await window.nostr.getPublicKey();
      if (!pubkey || !/^[a-fA-F0-9]{64}$/.test(pubkey)) {
        notifyError('Invalid public key received from extension');
        return;
      }

      // Create a simple Nostr event for verification
      const event: NostrEvent = {
        kind: 1,
        content: `Registering with Nostr Address Provider at ${new Date().toISOString()}`,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await window.nostr.signEvent(event);
      const isValid = verifyEvent(signedEvent);

      if (!isValid || signedEvent.pubkey !== pubkey) {
        notifyError('Failed to verify Nostr event signature');
        return;
      }

      setPublicKey(pubkey);
      notifySuccess('Public key verified with Nostr extension. Please complete the form to register.');
    } catch (error: any) {
      notifyError(`Failed to register with extension: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      notifyError('Username must contain only letters and numbers');
      return;
    }

    const convertedPublicKey = validateAndConvertPublicKey(publicKey);
    if (!convertedPublicKey) {
      notifyError('Public key must be a 64-character hexadecimal string or a valid npub');
      return;
    }

    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('registered_users')
        .select('username, public_key')
        .or(`username.eq.${username},public_key.eq.${convertedPublicKey}`);

      if (checkError) {
        notifyError(`Failed to check existing data: ${checkError.message}`);
        return;
      }

      if (existingUser && existingUser.length > 0) {
        if (existingUser.some((user) => user.username === username)) {
          notifyError('Username is already taken');
          return;
        }
        if (existingUser.some((user) => user.public_key === convertedPublicKey)) {
          notifyError('Public key is already registered');
          return;
        }
      }

      const relaysArray = relays ? relays.split(',').map((r) => r.trim()) : null;
      const { error } = await supabase
        .from('registered_users')
        .insert({
          username,
          public_key: convertedPublicKey,
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
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="bg-card-bg p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-md transform transition-all hover:scale-105">
        <h1 className="text-3xl font-bold mb-6 text-center">Free NIP-05 Identifiers</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleUsernameChange}
              className="mt-1 p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary transition bg-input-bg border-input-border text-foreground"
              required
            />
          </div>
          <div>
            <label htmlFor="publicKey" className="block text-sm font-medium">
              Public Key (hex or npub)
            </label>
            <input
              type="text"
              id="publicKey"
              value={publicKey}
              onChange={handlePublicKeyChange}
              className="mt-1 p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary transition bg-input-bg border-input-border text-foreground"
              placeholder="Enter hex, npub, or use extension"
              required
            />
          </div>
          <div>
            <label htmlFor="lightningAddress" className="block text-sm font-medium">
              Lightning Address (optional)
            </label>
            <input
              type="text"
              id="lightningAddress"
              value={lightningAddress}
              onChange={(e) => setLightningAddress(e.target.value)}
              className="mt-1 p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary transition bg-input-bg border-input-border text-foreground"
            />
          </div>
          <div>
            <label htmlFor="relays" className="block text-sm font-medium">
              Relays (comma-separated, optional)
            </label>
            <input
              type="text"
              id="relays"
              value={relays}
              onChange={(e) => setRelays(e.target.value)}
              className="mt-1 p-3 w-full border rounded-lg focus:ring-2 focus:ring-primary transition bg-input-bg border-input-border text-foreground"
              placeholder="wss://relay1.com,wss://relay2.com"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white p-3 rounded-lg hover:bg-primary-hover transition"
          >
            Register
          </button>
        </form>
        <button
          onClick={handleRegisterWithExtension}
          className="w-full mt-4 bg-secondary text-white p-3 rounded-lg hover:bg-secondary-hover transition"
        >
          Register with Nostr Extension
        </button>
        <Link href="/account">
          <button className="w-full mt-4 bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 transition">
            Manage Account
          </button>
        </Link>
        <ToastContainer position="top-center" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Navbar />
        <HomeContent />
      </div>
    </ThemeProvider>
  );
}