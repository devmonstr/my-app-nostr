/* src/app/profile/[username]/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { User, Key, Zap, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { nip19, SimplePool, Event } from 'nostr-tools';
import { motion } from 'framer-motion';
import React from 'react';

interface ProfileParams {
  params: Promise<{ username: string }>;
}

interface ProfileData {
  username: string;
  public_key: string;
  lightning_address: string | null;
  relays: string[] | null;
  picture: string | null;
  banner: string | null;
  metadata_updated_at: string | null;
}

export default function Profile({ params }: ProfileParams) {
  const { username } = React.use(params);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const TTL_SECONDS = 24 * 60 * 60; // 24 hours in seconds

  const getNpubFromHex = (hex: string): string => {
    try {
      return nip19.npubEncode(hex);
    } catch (error) {
      return hex;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        // ดึงข้อมูลจาก Supabase ก่อน
        const { data, error } = await supabase
          .from('registered_users')
          .select('username, public_key, lightning_address, relays, picture, banner, metadata_updated_at')
          .eq('username', username)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        let profile = data;

        // ตรวจสอบ TTL และรีเซ็ต metadata ถ้าหมดอายุ
        const now = new Date();
        const metadataExpired =
          profile.metadata_updated_at &&
          (now.getTime() - new Date(profile.metadata_updated_at).getTime()) / 1000 > TTL_SECONDS;

        if (metadataExpired) {
          await supabase
            .from('registered_users')
            .update({
              picture: null,
              banner: null,
              metadata_updated_at: null,
            })
            .eq('public_key', profile.public_key);

          profile = { ...profile, picture: null, banner: null, metadata_updated_at: null };
        }

        setProfileData(profile);

        // หากไม่มี picture หรือ banner ให้ดึงจาก Nostr
        if (!profile.picture || !profile.banner) {
          const pool = new SimplePool();
          const relays = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.nostr.band',
          ];

          const userRelays = profile.relays || [];
          const allRelays = [...new Set([...relays, ...userRelays])];

          const sub = pool.subscribeMany(
            allRelays,
            [{ kinds: [0], authors: [profile.public_key] }],
            {
              async onevent(event: Event) {
                try {
                  const metadata = JSON.parse(event.content);
                  const updatedMember = {
                    picture: metadata.picture || null,
                    banner: metadata.banner || null,
                    metadata_updated_at: new Date().toISOString(),
                  };

                  // อัปเดต Supabase
                  await supabase
                    .from('registered_users')
                    .update(updatedMember)
                    .eq('public_key', event.pubkey);

                  // อัปเดต state
                  setProfileData((prev) =>
                    prev ? { ...prev, ...updatedMember } : prev
                  );
                } catch (e) {
                  console.error('Error parsing metadata:', e);
                }
              },
              oneose() {
                pool.close(allRelays);
              },
              onerror: (error: Error) => {
                console.error('Error fetching metadata:', error);
                pool.close(allRelays);
              },
            } as any
          );

          setTimeout(() => {
            sub.close();
            pool.close(allRelays);
          }, 10000); // 10 seconds timeout
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error.message);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 font-sans">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          {loading ? (
            <div className="text-center text-[var(--foreground)]/[0.7]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <svg className="w-8 h-8 mx-auto text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9H0m0 0v5h.582A8.001 8.001 0 0019.356 11H24m-12 1a8 8 0 110-16 8 8 0 010 16z" />
                </svg>
              </motion.div>
              <p className="mt-2 font-medium">Loading profile...</p>
            </div>
          ) : notFound ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="bg-[var(--card-bg)] p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--card-border)] text-center"
            >
              <AlertCircle className="mx-auto text-red-500" size={48} />
              <h1 className="text-2xl font-semibold mt-4 text-[var(--foreground)]">ไม่พบผู้ใช้งานนี้</h1>
              <p className="text-[var(--foreground)]/[0.7] mt-2 font-medium">
                ไม่พบผู้ใช้งานชื่อ "{username}" ในระบบ กรุณาตรวจสอบชื่อผู้ใช้งานอีกครั้ง
              </p>
            </motion.div>
          ) : profileData ? (
            <div className="w-full max-w-lg">
              {/* Banner Section - แสดงเฉพาะเมื่อมี banner */}
              {profileData.banner ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="relative w-full h-40 rounded-t-2xl border border-[var(--card-border)]"
                >
                  <img
                    src={profileData.banner}
                    alt={`${profileData.username}'s banner`}
                    className="w-full h-full object-cover rounded-t-2xl"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/640x160?text=Banner+Not+Available';
                    }}
                  />
                  {/* Avatar ตำแหน่งกึ่งกลางขอบล่างของ banner */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                    {profileData.picture ? (
                      <img
                        src={profileData.picture}
                        alt={profileData.username}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[var(--primary)] shadow-md bg-[var(--card-bg)]"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/96';
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-[var(--primary)]/[0.1] flex items-center justify-center text-[var(--foreground)]/[0.5] shadow-md">
                        <span className="text-3xl font-semibold">
                          {profileData.username[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : null}

              {/* Profile Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                className={`bg-[var(--card-bg)] p-8 rounded-b-2xl shadow-2xl w-full border border-[var(--card-border)] border-t-0 ${
                  profileData.banner ? 'pt-16' : 'rounded-t-2xl pt-16'
                }`} // ใช้สีจาก Theme
              >
                <div className="flex flex-col items-center mb-6">
                  {/* Avatar หากไม่มี banner ให้แสดงตรงนี้ */}
                  {!profileData.banner ? (
                    profileData.picture ? (
                      <img
                        src={profileData.picture}
                        alt={profileData.username}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[var(--primary)] mb-4"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/96';
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-[var(--primary)]/[0.1] flex items-center justify-center text-[var(--foreground)]/[0.5] mb-4">
                        <span className="text-3xl font-semibold">
                          {profileData.username[0]}
                        </span>
                      </div>
                    )
                  ) : null}
                  <h1 className="text-4xl font-extrabold text-center text-[var(--foreground)]">
                    {profileData.username}'s Profile
                  </h1>
                  <p className="text-center text-[var(--foreground)]/[0.7] mt-2 font-medium">
                    Public Nostr Identity
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-2">
                    <User className="text-[var(--primary)]" size={18} />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">Username</p>
                      <p className="text-[var(--foreground)]/[0.7]">{profileData.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2">
                    <Key className="text-[var(--primary)]" size={18} />
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">Public Key (npub)</p>
                      <p className="text-[var(--foreground)]/[0.7] break-all">{getNpubFromHex(profileData.public_key)}</p>
                    </div>
                  </div>
                  {profileData.lightning_address && (
                    <div className="flex items-center gap-3 p-2">
                      <Zap className="text-[var(--primary)]" size={18} />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Lightning Address</p>
                        <p className="text-[var(--foreground)]/[0.7]">{profileData.lightning_address}</p>
                      </div>
                    </div>
                  )}
                  {profileData.relays && profileData.relays.length > 0 && (
                    <div className="flex items-center gap-3 p-2">
                      <LinkIcon className="text-[var(--primary)]" size={18} />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Relays</p>
                        <p className="text-[var(--foreground)]/[0.7]">{profileData.relays.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          ) : null}
        </div>
      </div>
    </ThemeProvider>
  );
}