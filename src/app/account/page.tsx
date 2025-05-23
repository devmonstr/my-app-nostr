/* src/app/account/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '@/components/Navbar';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { nip19, verifyEvent } from 'nostr-tools';
import { User, Key, Zap, Link as LinkIcon, LogOut, Trash2, Clock, Share2, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [lastLoginTime, setLastLoginTime] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    const storedPublicKey = localStorage.getItem('publicKey');
    const storedUserData = localStorage.getItem('userData');
    const storedLastLogin = localStorage.getItem('lastLoginTime');
    if (storedPublicKey && storedUserData) {
      setPublicKey(storedPublicKey);
      setUserData(JSON.parse(storedUserData));
      setUsername(JSON.parse(storedUserData).username);
      setLightningAddress(JSON.parse(storedUserData).lightning_address || '');
      setRelays(JSON.parse(storedUserData).relays ? JSON.parse(storedUserData).relays.join(',') : '');
    }
    if (storedLastLogin) {
      setLastLoginTime(storedLastLogin);
    }
  }, []);

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
      className: 'rounded-xl shadow-lg',
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
      className: 'rounded-xl shadow-lg',
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

  const validateLightningAddress = (address: string): boolean => {
    if (!address) return true;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(address);
  };

  const handleShareProfile = () => {
    if (!userData) return;
    const profileUrl = `${window.location.origin}/profile/${userData.username}`;
    copyToClipboard(profileUrl, 'Profile URL');
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

      const event: NostrEvent = {
        kind: 1,
        content: `Logging into Nostr Address Provider at ${new Date().toISOString()}`,
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

      localStorage.setItem('publicKey', pubkey);
      localStorage.setItem('userData', JSON.stringify(data));
      
      const loginTime = new Date().toLocaleString();
      setLastLoginTime(loginTime);
      localStorage.setItem('lastLoginTime', loginTime);

      notifySuccess('Logged in successfully with Nostr extension!');
    } catch (error: any) {
      notifyError(`Failed to login with extension: ${error.message}`);
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    setUserData(null);
    setPublicKey('');
    setUsername('');
    setLightningAddress('');
    setRelays('');
    setLastLoginTime(null);
    localStorage.removeItem('publicKey');
    localStorage.removeItem('userData');
    localStorage.removeItem('lastLoginTime');
    notifySuccess('Logged out successfully!');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) {
      notifyError('Please login first');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      notifyError('Username must contain only letters and numbers');
      return;
    }

    if (!validateLightningAddress(lightningAddress)) {
      notifyError('Invalid Lightning Address format. Use user@domain.com');
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

      const updatedUserData = { username, lightning_address: lightningAddress || null, relays: relaysArray };
      setUserData(updatedUserData);
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      notifySuccess('Account updated successfully!');
    } catch (error: any) {
      notifyError(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userData) {
      notifyError('No account data to delete');
      return;
    }

    if (confirmUsername !== userData.username) {
      notifyError('Username does not match. Please try again.');
      return;
    }

    try {
      const { error } = await supabase
        .from('registered_users')
        .delete()
        .eq('public_key', publicKey);

      if (error) {
        notifyError(`Failed to delete account: ${error.message}`);
        return;
      }

      setUserData(null);
      setUsername('');
      setPublicKey('');
      setLightningAddress('');
      setRelays('');
      setLastLoginTime(null);
      setShowDeleteModal(false);
      setConfirmUsername('');
      localStorage.removeItem('publicKey');
      localStorage.removeItem('userData');
      localStorage.removeItem('lastLoginTime');
      notifySuccess('Account deleted successfully!');
    } catch (error: any) {
      notifyError(error.message);
    }
  };

  return (
    <>
      <div className="mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-card-bg p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-input-border"
        >
          <h1 className="text-4xl font-extrabold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600">
            Manage Account
          </h1>
          <p className="text-center text-foreground/70 mb-8 font-medium">
            Update or manage your Nostr identity
          </p>
          {!userData ? (
            <div className="space-y-4">
              <p className="text-center text-foreground/70 font-medium">
                Please install a Nostr extension like Alby, Nos2x, or Nostore to login.
              </p>
              <button
                onClick={handleLoginWithExtension}
                className="w-full bg-secondary text-white p-3 rounded-lg hover:bg-secondary-hover transform hover:scale-105 transition-all duration-300 font-semibold shadow-md flex items-center justify-center gap-2"
              >
                <Key size={18} />
                Login with Nostr Extension
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleUpdate} className="space-y-6">
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
                  <div className="mt-3 p-4 bg-input-bg border border-input-border rounded-lg shadow-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2">
                        <div className="flex items-center gap-2">
                          <Key className="text-foreground/50" size={16} />
                          <div>
                            <p className="text-sm font-medium text-foreground">Public Key (hex)</p>
                            <p className="text-xs text-foreground/70 break-all">{publicKey}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(publicKey, 'Public Key (hex)')}
                          className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transform hover:scale-105 transition-all duration-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <Copy size={14} />
                          Copy
                        </button>
                      </div>
                      <div className="flex justify-between items-center p-2">
                        <div className="flex items-center gap-2">
                          <Key className="text-foreground/50" size={16} />
                          <div>
                            <p className="text-sm font-medium text-foreground">Public Key (npub)</p>
                            <p className="text-xs text-foreground/70 break-all">{getNpubFromHex(publicKey)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(getNpubFromHex(publicKey), 'Public Key (npub)')}
                          className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transform hover:scale-105 transition-all duration-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <Copy size={14} />
                          Copy
                        </button>
                      </div>
                      {lastLoginTime && (
                        <div className="flex items-center gap-2 p-2">
                          <Clock className="text-foreground/50" size={16} />
                          <div>
                            <p className="text-sm font-medium text-foreground">Last Login</p>
                            <p className="text-xs text-foreground/70">{lastLoginTime}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-2">
                        <div className="flex items-center gap-2">
                          <Share2 className="text-foreground/50" size={16} />
                          <div>
                            <p className="text-sm font-medium text-foreground">Share Profile</p>
                            <p className="text-xs text-foreground/70">Copy your profile URL to share</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleShareProfile}
                          className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transform hover:scale-105 transition-all duration-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <Copy size={14} />
                          Share
                        </button>
                      </div>
                    </div>
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
                  className="w-full bg-primary text-white p-3 rounded-lg hover:bg-primary-hover transform hover:scale-105 transition-all duration-300 font-semibold shadow-md flex items-center justify-center gap-2"
                >
                  <User size={18} />
                  Update Account
                </button>
              </form>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 transform hover:scale-105 transition-all duration-300 font-semibold shadow-md flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </button>
              <div className="mt-6 p-4 border border-red-500/30 rounded-lg bg-red-500/5">
                <h2 className="text-lg font-semibold text-red-500 flex items-center gap-2">
                  <Trash2 size={18} />
                  Danger Zone
                </h2>
                <p className="text-sm text-foreground/70 mt-1">
                  Actions in this section are irreversible. Proceed with caution.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full mt-4 bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300 font-semibold shadow-md flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card-bg p-6 rounded-2xl shadow-2xl w-full max-w-md border border-input-border"
          >
            <h2 className="text-xl font-semibold text-red-500 mb-4 flex items-center gap-2">
              <Trash2 size={18} />
              Confirm Account Deletion
            </h2>
            <p className="text-foreground/70 mb-4">
              To confirm, please type your username (<strong>{userData?.username}</strong>) below. This action cannot be undone.
            </p>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={18} />
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground placeholder-foreground/50 transition-all duration-300 mb-4"
                placeholder="Enter your username"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmUsername('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transform hover:scale-105 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

export default function Account() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
        <Navbar />
        <AccountContent />
        <ToastContainer position="top-right" />
      </div>
    </ThemeProvider>
  );
}