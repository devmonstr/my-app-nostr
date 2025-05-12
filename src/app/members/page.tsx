/* src/app/members/page.tsx */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Search } from 'lucide-react';

interface Member {
  username: string;
  public_key: string;
  created_at?: string;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('registered_users')
          .select('username, public_key, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setMembers(data || []);
        setFilteredMembers(data || []);
      } catch (error: any) {
        console.error('Error fetching members:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  useEffect(() => {
    const filtered = members.filter(
      (member) =>
        member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.public_key.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

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
                placeholder="Search by username or public key..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-primary transition bg-input-bg border-input-border text-foreground"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60" size={20} />
            </div>
          </div>
          {loading ? (
            <p className="text-center text-foreground/80">Loading members...</p>
          ) : (
            <div className="max-w-3xl mx-auto">
              {filteredMembers.length === 0 ? (
                <p className="text-center text-foreground/80">No members found.</p>
              ) : (
                <div className="space-y-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.public_key}
                      className="bg-card-bg p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-semibold text-primary">{member.username}</p>
                          <p className="text-sm text-foreground/80 break-all">
                            {member.public_key}
                          </p>
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
              )}
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}