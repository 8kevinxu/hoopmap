// Sign in / create account sheet, plus a signed-in account panel.
// One modal handles both states (the header button opens it either way).
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';

export default function AuthModal({ visible, onClose }) {
  const { user, displayName, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const reset = () => {
    setError(null);
    setInfo(null);
  };
  const close = () => {
    reset();
    setPassword('');
    onClose();
  };

  const submit = async () => {
    reset();
    const e = email.trim();
    if (!e || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    const res =
      mode === 'signin'
        ? await signIn(e, password)
        : await signUp(e, password, name);
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    // If email confirmation is on, sign-up returns no session yet.
    if (mode === 'signup' && !res.data?.session) {
      setInfo('Check your email to confirm your account, then sign in.');
      setMode('signin');
      setPassword('');
      return;
    }
    close();
  };

  const doSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {user ? 'Account' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
            <Pressable hitSlop={10} onPress={close}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {user ? (
            <>
              <Text style={styles.signedInAs}>
                Signed in as{' '}
                <Text style={styles.signedInName}>{displayName || user.email}</Text>
              </Text>
              {!!displayName && <Text style={styles.signedInEmail}>{user.email}</Text>}
              <Pressable
                style={[styles.submit, styles.signOutBtn, busy && styles.submitDisabled]}
                disabled={busy}
                onPress={doSignOut}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Sign out</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {mode === 'signup' && (
                <TextInput
                  style={styles.input}
                  placeholder="Display name"
                  placeholderTextColor="#9aa7b4"
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  autoCapitalize="words"
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9aa7b4"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                inputMode="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9aa7b4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {!!error && <Text style={styles.error}>{error}</Text>}
              {!!info && <Text style={styles.info}>{info}</Text>}

              <Pressable
                style={[styles.submit, busy && styles.submitDisabled]}
                disabled={busy}
                onPress={submit}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  reset();
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                }}
              >
                <Text style={styles.switch}>
                  {mode === 'signin'
                    ? "No account? Create one"
                    : 'Have an account? Sign in'}
                </Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,27,42,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0d1b2a' },
  close: { fontSize: 18, color: '#90a0b0' },

  input: {
    fontSize: 15,
    color: '#0d1b2a',
    backgroundColor: '#f4f6f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  error: { color: '#c0392b', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  info: { color: '#1f6f43', fontSize: 13, marginBottom: 8, fontWeight: '600' },

  submit: {
    backgroundColor: '#2f74d6',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  signOutBtn: { backgroundColor: '#c0392b', marginTop: 6 },

  switch: {
    textAlign: 'center',
    color: '#2f74d6',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 14,
  },

  signedInAs: { fontSize: 15, color: '#2a3a4a', marginBottom: 2 },
  signedInName: { fontWeight: '800', color: '#0d1b2a' },
  signedInEmail: { fontSize: 13, color: '#7a8a9a', marginBottom: 6 },
});
