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
import { User, Key, Zap, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

function HomeContent() {
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [relays, setRelays] = useState('');
  const { theme } = useTheme();

  const notifySuccess = (message: string) => {
    toast.dismiss();
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme,
    });
  };

  const notifyError = (message: string) => {
    toast.dismiss();
    toast.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme,
    });
  };

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
    <div className="mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-card-bg p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-input-border"
      >
        <h1 className="text-4xl font-extrabold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600">
          Free NIP-05 Identifiers
        </h1>
        <p className="text-center text-foreground/70 mb-8 font-medium">
          Register your Nostr identity with ease
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
              <input
                type="text"
                id="username"
                value={username}
                onChange={handleUsernameChange}
                className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-foreground/50 transition-all duration-300"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="publicKey" className="block text-sm font-medium text-foreground mb-2">
              Public Key (hex or npub)
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
              <input
                type="text"
                id="publicKey"
                value={publicKey}
                onChange={handlePublicKeyChange}
                className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-foreground/50 transition-all duration-300"
                placeholder="Enter hex, npub, or use extension"
                required
              />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="lightningAddress" className="block text-sm font-medium text-foreground mb-2">
              Lightning Address (optional)
            </label>
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
              <input
                type="text"
                id="lightningAddress"
                value={lightningAddress}
                onChange={(e) => setLightningAddress(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-foreground/50 transition-all duration-300"
                placeholder="user@domain.com"
              />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="relays" className="block text-sm font-medium text-foreground mb-2">
              Relays (comma-separated, optional)
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
              <input
                type="text"
                id="relays"
                value={relays}
                onChange={(e) => setRelays(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-foreground/50 transition-all duration-300"
                placeholder="wss://relay1.com, wss://relay2.com"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white p-3 rounded-lg hover:bg-primary-hover transform hover:scale-105 transition-all duration-300 font-semibold shadow-md"
          >
            Register
          </button>
        </form>
        <button
          onClick={handleRegisterWithExtension}
          className="w-full mt-4 bg-secondary text-white p-3 rounded-lg hover:bg-secondary-hover transform hover:scale-105 transition-all duration-300 font-semibold shadow-md"
        >
          Register with Nostr Extension
        </button>
        <Link href="/account">
          <button className="w-full mt-4 bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 transform hover:scale-105 transition-all duration-300 font-semibold shadow-md">
            Manage Account
          </button>
        </Link>
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Navbar />
        <HomeContent />
        <ToastContainer position="top-right" />
      </div>
    </ThemeProvider>
  );
}