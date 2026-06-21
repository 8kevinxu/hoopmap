import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Configure by setting these in your .env (EXPO_PUBLIC_* are inlined at build):
//   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
// When unset, `supabase` is null and the app falls back to local check-ins and
// hides account / social features.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // Persist the signed-in session so users stay logged in across
          // launches. AsyncStorage works on native and web (localStorage).
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // Email+password (not magic-link/OAuth), so no URL session to detect.
          detectSessionInUrl: false,
        },
      })
    : null;
