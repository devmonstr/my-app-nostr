'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '@/components/Navbar';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { nip19 } from 'nostr-tools';

function AccountContent() {
  const [publicKey, setPublicKey] = useState('');
  const [userData, setUserData] = useState<{
    username: string;
    lightning_address: string | null;
    relays: string | null;
  } | null>(null);
  const [username, setUsername] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [relays, setRelays] = useState('');
  const { theme } = useTheme();

  const notifySuccess = (message: string) =>
    toast.success(message, {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme,
    });

  const notifyError = (message: string) =>
    toast.error(message, {
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme,
    });

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPublicKey(value);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9]*$/.test(value)) {
      setUsername(value);
    } else {
      notifyError('Username must contain only letters and numbers');
    }
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

  const getNpubFromHex = (hex: string): string => {
    try {
      return nip19.npubEncode(hex);
    } catch (error) {
      return 'Error converting to npub';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      notifySuccess(`${label} copied to clipboard!`);
    }).catch(() => {
      notifyError(`Failed to copy ${label}`);
    });
  };

  const handleLoginWithExtension = async () => {
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

      setPublicKey(pubkey);

      const { data, error } = await supabase
        .from('registered_users')
        .select('username, lightning_address, relays')
        .eq('public_key', pubkey)
        .single();

      if (error || !data) {
        notifyError('User not found');
        return;
      }

      setUserData(data);
      setUsername(data.username);
      setLightningAddress(data.lightning_address || '');
      setRelays(data.relays ? data.relays.join(',') : '');
      notifySuccess('Logged in successfully with Nostr extension!');
    } catch (error: any) {
      notifyError(`Failed to login with extension: ${error.message}`);
    }
  };

  const handleFetchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const convertedPublicKey = validateAndConvertPublicKey(publicKey);
    if (!convertedPublicKey) {
      notifyError('Public key must be a 64-character hexadecimal string or a valid npub');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('registered_users')
        .select('username, lightning_address, relays')
        .eq('public_key', convertedPublicKey)
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

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      notifyError('Username must contain only letters and numbers');
      return;
    }

    try {
      const convertedPublicKey = validateAndConvertPublicKey(publicKey);
      if (!convertedPublicKey) {
        notifyError('Invalid public key');
        return;
      }

      const { data: existingUser, error: checkError } = await supabase
        .from('registered_users')
        .select('username')
        .eq('username', username)
        .neq('public_key', convertedPublicKey);

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
        .eq('public_key', convertedPublicKey);

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

  const handleDeleteAccount = async () => {
    if (!userData) {
      notifyError('No account data to delete');
      return;
    }

    const convertedPublicKey = validateAndConvertPublicKey(publicKey);
    if (!convertedPublicKey) {
      notifyError('Invalid public key');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from('registered_users')
        .delete()
        .eq('public_key', convertedPublicKey);

      if (error) {
        notifyError(`Failed to delete account: ${error.message}`);
        return;
      }

      notifySuccess('Account deleted successfully!');
      setUserData(null);
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
        <h1 className="text-3xl font-bold mb-6 text-center">Manage Account</h1>
        {!userData ? (
          <>
            <form onSubmit={handleFetchUser} className="space-y-4">
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
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white p-3 rounded-lg hover:bg-primary-hover transition"
              >
                Fetch Account
              </button>
            </form>
            <button
              onClick={handleLoginWithExtension}
              className="w-full mt-4 bg-secondary text-white p-3 rounded-lg hover:bg-secondary-hover transition"
            >
              Login with Nostr Extension
            </button>
          </>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
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
              <div className="mt-3 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg shadow-sm">
                <div className="space-y-2">
                  <div
                    className="flex justify-between items-center cursor-pointer hover:bg-primary/20 p-2 rounded-md transition"
                    onClick={() => copyToClipboard(publicKey, 'Public Key (hex)')}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">Public Key (hex)</p>
                      <p className="text-xs text-foreground/80 break-all">{publicKey}</p>
                    </div>
                    <span className="text-primary text-xs font-semibold">Copy</span>
                  </div>
                  <div
                    className="flex justify-between items-center cursor-pointer hover:bg-secondary/20 p-2 rounded-md transition"
                    onClick={() => copyToClipboard(getNpubFromHex(publicKey), 'Public Key (npub)')}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">Public Key (npub)</p>
                      <p className="text-xs text-foreground/80 break-all">{getNpubFromHex(publicKey)}</p>
                    </div>
                    <span className="text-secondary text-xs font-semibold">Copy</span>
                  </div>
                </div>
              </div>
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
              Update Account
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="w-full mt-4 bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition"
            >
              Delete Account
            </button>
          </form>
        )}
        <ToastContainer position="top-center" />
      </div>
    </div>
  );
}

export default function Account() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Navbar />
        <AccountContent />
      </div>
    </ThemeProvider>
  );
}