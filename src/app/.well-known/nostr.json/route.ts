import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || '_';

  // กำหนด CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*', // หรือระบุ origin เช่น 'http://192.168.1.96:3001'
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': true,
  };

  // จัดการคำขอ OPTIONS (สำหรับ preflight requests)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (name === '_') {
    return NextResponse.json({
      names: {},
      relays: {},
    });
  }

  const { data, error } = await supabase
    .from('registered_users')
    .select('username, public_key, lightning_address, relays')
    .eq('username', name)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const response: {
    names: Record<string, string>;
    relays?: Record<string, string[]>;
    lnurl?: Record<string, string>;
  } = {
    names: {
      [data.username]: data.public_key,
    },
  };

  if (data.relays) {
    response.relays = {
      [data.public_key]: data.relays,
    };
  }

  if (data.lightning_address) {
    response.lnurl = {
      [data.public_key]: data.lightning_address,
    };
  }

  return NextResponse.json(response);
}