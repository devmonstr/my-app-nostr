'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from './ThemeProvider';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    const fetchMemberCount = async () => {
      try {
        const { count, error } = await supabase
          .from('registered_users')
          .select('*', { count: 'exact', head: true });
        if (error) throw error;
        setMemberCount(count || 0);
      } catch (error: any) {
        console.error('Error fetching member count:', error.message);
      }
    };
    fetchMemberCount();
  }, []);

  return (
    <nav className="bg-nostr text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold">
              Monstr
            </Link>
            <span className="ml-3 text-sm bg-primary text-white rounded-full px-2 py-1">
              {memberCount} Members
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/" className="hover:bg-nostr-hover px-3 py-2 rounded-md">
              Home
            </Link>
            <Link href="/account" className="hover:bg-nostr-hover px-3 py-2 rounded-md">
              Account
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-nostr-hover focus:outline-none"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={toggleTheme} className="p-2 mr-2 focus:outline-none">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={toggleMenu} className="focus:outline-none">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-primary">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="block hover:bg-nostr-hover px-3 py-2 rounded-md"
              onClick={toggleMenu}
            >
              Home
            </Link>
            <Link
              href="/account"
              className="block hover:bg-nostr-hover px-3 py-2 rounded-md"
              onClick={toggleMenu}
            >
              Account
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}