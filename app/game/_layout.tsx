import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getSession } from '@/lib/supabase';

export default function GameLayout() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session?.user) {
        router.replace('/auth/sign-in');
      }
    })();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
