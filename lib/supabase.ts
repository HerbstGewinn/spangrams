import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

let client: SupabaseClient | null = null;
function getEnv() {
	const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
	const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
	return { url, anon };
}

export function getSupabase(): SupabaseClient | null {
	if (client) return client;
	const { url, anon } = getEnv();
	if (!url || !anon) {
		console.warn('Supabase env not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
		return null;
	}
	client = createClient(url, anon, {
		auth: {
			persistSession: true,
			detectSessionInUrl: false,
			storage: {
				getItem: SecureStore.getItemAsync,
				setItem: SecureStore.setItemAsync,
				removeItem: SecureStore.deleteItemAsync,
			},
		},
	});
	return client;
}

export const supabase = getSupabase();

export async function generateBoardRemote(payload: { title: string; theme: string; author: string; words: string[] }) {
	const { url, anon } = getEnv();
	if (!url || !anon) throw new Error('Supabase is not configured');
	const res = await fetch(`${url}/functions/v1/generate_board`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${anon}`,
		},
		body: JSON.stringify(payload),
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data?.errors?.[0] ?? data?.error ?? 'Failed to generate');
	}
	return data as { slug: string; grid: any; words: string[] };
}

export type Board = {
	id: string;
	slug: string;
	title: string;
	theme: string;
	author: string;
	words: string[];
	grid: any;
	checksum: string;
	created_by: string | null;
	created_at: string;
	completions_count: number;
	plays_count: number;
};

export async function listBoards(): Promise<Board[]> {
	const sb = getSupabase();
	if (!sb) throw new Error('Supabase is not configured');
	const { data, error } = await sb
		.from('boards')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(50);
	if (error) throw error;
	return (data ?? []) as unknown as Board[];
}

export async function listBoardsByUser(userId: string): Promise<Board[]> {
	const sb = getSupabase();
	if (!sb) throw new Error('Supabase is not configured');
	const { data, error } = await sb
		.from('boards')
		.select('*')
		.eq('created_by', userId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data ?? []) as unknown as Board[];
}

export async function sendMagicLink(email: string) {
	const sb = getSupabase();
	if (!sb) throw new Error('Supabase is not configured');
	return sb.auth.signInWithOtp({ email });
}

export async function getSession() {
	const sb = getSupabase();
	if (!sb) return null;
	const { data } = await sb.auth.getSession();
	return data.session ?? null;
}

export async function signOut() {
	const sb = getSupabase();
	if (!sb) return;
	await sb.auth.signOut();
}
