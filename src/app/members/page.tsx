/* src/app/members/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Search, Loader2, User, Calendar } from 'lucide-react';
import { SimplePool, Event, nip19 } from 'nostr-tools';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';

interface Member {
  username: string;
  public_key: string;
  created_at?: string;
  name?: string;
  about?: string;
  picture?: string;
  metadata_updated_at?: string;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 10;
  const TTL_SECONDS = 24 * 60 * 60; // 24 hours in seconds

  const notifyError = (message: string) =>
    toast.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: 'rounded-xl shadow-lg',
    });

  const getNpubFromHex = (hex: string): string => {
    try {
      return nip19.npubEncode(hex);
    } catch (error) {
      console.error('Error converting hex to npub:', error);
      return hex;
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('registered_users')
          .select('username, public_key, created_at, relays, name, about, picture, metadata_updated_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const initialMembers = data || [];

        const now = new Date();
        const expiredMembers = initialMembers.filter(
          (member) =>
            member.metadata_updated_at &&
            (now.getTime() - new Date(member.metadata_updated_at).getTime()) / 1000 > TTL_SECONDS
        );

        if (expiredMembers.length > 0) {
          const publicKeys = expiredMembers.map((member) => member.public_key);
          await supabase
            .from('registered_users')
            .update({
              name: null,
              about: null,
              picture: null,
              metadata_updated_at: null,
            })
            .in('public_key', publicKeys);
        }

        const updatedMembers = initialMembers.map((member) =>
          expiredMembers.some((expired) => expired.public_key === member.public_key)
            ? { ...member, name: null, about: null, picture: null, metadata_updated_at: null }
            : member
        );

        setMembers(updatedMembers);
        setFilteredMembers(updatedMembers);

        const membersNeedingMetadata = updatedMembers.filter(
          (member) => !member.name && !member.about && !member.picture
        );

        if (membersNeedingMetadata.length > 0) {
          setFetchingMetadata(true);
          const pool = new SimplePool();
          const pubkeys = membersNeedingMetadata.map((member) => member.public_key);
          const relays = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.nostr.band',
          ];

          const userRelays = updatedMembers
            .filter((member) => member.relays)
            .flatMap((member) => member.relays || []);

          const allRelays = [...new Set([...relays, ...userRelays])];

          const sub = pool.subscribeMany(
            allRelays,
            [{ kinds: [0], authors: pubkeys }],
            {
              async onevent(event: Event) {
                try {
                  const metadata = JSON.parse(event.content);
                  const updatedMember = {
                    name: metadata.name,
                    about: metadata.about,
                    picture: metadata.picture,
                    metadata_updated_at: new Date().toISOString(),
                  };

                  await supabase
                    .from('registered_users')
                    .update(updatedMember)
                    .eq('public_key', event.pubkey);

                  setMembers((prevMembers) =>
                    prevMembers.map((member) =>
                      member.public_key === event.pubkey
                        ? { ...member, ...updatedMember }
                        : member
                    )
                  );
                  setFilteredMembers((prevMembers) =>
                    prevMembers.map((member) =>
                      member.public_key === event.pubkey
                        ? { ...member, ...updatedMember }
                        : member
                    )
                  );
                } catch (e) {
                  console.error('Error parsing metadata:', e);
                }
              },
              oneose() {
                pool.close(allRelays);
                setFetchingMetadata(false);
              },
              onerror: (error: Error) => {
                console.error('Error fetching metadata:', error);
                notifyError('Failed to fetch metadata from relays. Some data may be outdated.');
                pool.close(allRelays);
                setFetchingMetadata(false);
              },
            } as any
          );

          setTimeout(() => {
            sub.close();
            pool.close(allRelays);
            if (fetchingMetadata) {
              notifyError('Metadata fetch timed out. Some data may be missing.');
              setFetchingMetadata(false);
            }
          }, 10000);
        }
      } catch (error: any) {
        console.error('Error fetching members:', error.message);
        notifyError('Failed to load members. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  useEffect(() => {
    const filtered = members.filter(
      (member) =>
        (member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
         member.public_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
         getNpubFromHex(member.public_key).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.name && member.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredMembers(filtered);
    setCurrentPage(1);
  }, [searchQuery, members]);

  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-extrabold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-600">
            Community Members
          </h1>
          <p className="text-center text-foreground/70 mb-8 font-medium">
            Discover members of our Nostr community
          </p>
          <div className="max-w-3xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/50" size={20} />
              <input
                type="text"
                placeholder="Search by username, name, or public key..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-foreground/50 transition-all duration-300"
              />
            </div>
          </div>
          {loading ? (
            <div className="text-center text-foreground/70">
              <Loader2 className="animate-spin mx-auto text-primary" size={32} />
              <p className="mt-2 font-medium">Loading members...</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {fetchingMetadata && (
                <div className="flex items-center justify-center mb-4">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <span className="ml-2 text-foreground/70 font-medium">Fetching metadata...</span>
                </div>
              )}
              {filteredMembers.length === 0 ? (
                <p className="text-center text-foreground/70 font-medium">No members found.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentMembers.map((member, index) => (
                      <motion.div
                        key={member.public_key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="bg-card-bg p-4 rounded-lg shadow-md hover:shadow-lg border border-input-border transition-all duration-300"
                      >
                        <div className="flex items-start space-x-4">
                          {member.picture ? (
                            <img
                              src={member.picture}
                              alt={member.name || member.username}
                              className="w-16 h-16 rounded-full object-cover border border-primary/20"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/64';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-foreground/50">
                              <span className="text-xl font-semibold">
                                {member.name?.[0] || member.username[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="text-foreground/50" size={16} />
                              <p className="text-lg font-semibold text-primary">
                                {member.name || member.username}
                              </p>
                            </div>
                            <p className="text-sm text-foreground/70 break-all mt-1">
                              {getNpubFromHex(member.public_key)}
                            </p>
                            {member.about && (
                              <p className="text-sm text-foreground/70 mt-1">{member.about}</p>
                            )}
                            {member.created_at && (
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="text-foreground/50" size={14} />
                                <p className="text-xs text-foreground/60">
                                  Joined: {new Date(member.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-8 flex justify-center items-center space-x-4">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg transform transition-all duration-300 font-semibold shadow-md ${
                        currentPage === 1
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary-hover hover:scale-105'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-foreground font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg transform transition-all duration-300 font-semibold shadow-md ${
                        currentPage === totalPages
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary-hover hover:scale-105'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <ToastContainer position="top-right" />
        </div>
      </div>
    </ThemeProvider>
  );
}