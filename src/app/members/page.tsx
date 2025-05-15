/* src/app/members/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Search, Loader2 } from 'lucide-react';
import { SimplePool, Event, nip19 } from 'nostr-tools';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
      position: 'top-center',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

  const getNpubFromHex = (hex: string): string => {
    try {
      return nip19.npubEncode(hex);
    } catch (error) {
      console.error('Error converting hex to npub:', error);
      return hex; // Fallback to hex if conversion fails
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

        // Check TTL and reset metadata if expired
        const now = new Date();
        const expiredMembers = initialMembers.filter(
          (member) =>
            member.metadata_updated_at &&
            (now.getTime() - new Date(member.metadata_updated_at).getTime()) / 1000 > TTL_SECONDS
        );

        if (expiredMembers.length > 0) {
          // Batch update to reset expired metadata
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

        // Refresh members after resetting expired metadata
        const updatedMembers = initialMembers.map((member) =>
          expiredMembers.some((expired) => expired.public_key === member.public_key)
            ? { ...member, name: null, about: null, picture: null, metadata_updated_at: null }
            : member
        );

        setMembers(updatedMembers);
        setFilteredMembers(updatedMembers);

        // Fetch metadata for members that need it
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

                  // Update Supabase with metadata and timestamp
                  await supabase
                    .from('registered_users')
                    .update(updatedMember)
                    .eq('public_key', event.pubkey);

                  // Update local state
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
          }, 10000); // 10 seconds timeout
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
    setCurrentPage(1); // Reset to first page on search
  }, [searchQuery, members]);

  // Pagination logic
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
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Community Members
          </h1>
          <div className="max-w-3xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by username, name, or public key..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-primary transition bg-input-bg border-input-border text-foreground"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60" size={20} />
            </div>
          </div>
          {loading ? (
            <div className="text-center text-foreground/80">
              <Loader2 className="animate-spin mx-auto" size={32} />
              <p className="mt-2">Loading members...</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {fetchingMetadata && (
                <div className="flex items-center justify-center mb-4">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <span className="ml-2 text-foreground/80">Fetching metadata...</span>
                </div>
              )}
              {filteredMembers.length === 0 ? (
                <p className="text-center text-foreground/80">No members found.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentMembers.map((member) => (
                      <div
                        key={member.public_key}
                        className="bg-card-bg p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
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
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-foreground/60">
                              <span className="text-xl font-semibold">
                                {member.name?.[0] || member.username[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-primary">
                              {member.name || member.username}
                            </p>
                            <p className="text-sm text-foreground/80 break-all">
                              {getNpubFromHex(member.public_key)}
                            </p>
                            {member.about && (
                              <p className="text-sm text-foreground/70 mt-1">{member.about}</p>
                            )}
                            {member.created_at && (
                              <p className="text-xs text-foreground/60 mt-1">
                                Joined: {new Date(member.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex justify-center items-center space-x-4">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg transition ${
                        currentPage === 1
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary-hover'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg transition ${
                        currentPage === totalPages
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary-hover'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <ToastContainer position="top-center" />
        </div>
      </div>
    </ThemeProvider>
  );
}
