import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || '_';

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