import { Stack } from 'expo-router';

export default function GameLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Remove all headers in game screens
      }}
    />
  );
}
