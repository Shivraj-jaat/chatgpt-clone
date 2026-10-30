'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isFirebaseConfigured: false,
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  loginWithGoogle: async () => {},
  loginAsGuest: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to map FirebaseUser to UserProfile
  const mapUser = (fbUser: FirebaseUser | null): UserProfile | null => {
    if (!fbUser) return null;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Guest User'),
      photoURL: fbUser.photoURL,
      isAnonymous: fbUser.isAnonymous,
    };
  };

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(mapUser(fbUser));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized. Please check your .env keys.');
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    setUser(mapUser(result.user));
  };

  const signupWithEmail = async (email: string, password: string, displayName?: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized. Please check your .env keys.');
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && displayName.trim()) {
      await updateProfile(result.user, { displayName: displayName.trim() });
    }
    setUser(mapUser(result.user));
  };

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Firebase Auth / Google Provider not initialized.');
    }
    const result = await signInWithPopup(auth, googleProvider);
    setUser(mapUser(result.user));
  };

  const loginAsGuest = async () => {
    if (auth) {
      try {
        const result = await signInAnonymously(auth);
        setUser(mapUser(result.user));
        return;
      } catch (err) {
        console.warn('Anonymous sign-in failed, using mock guest session:', err);
      }
    }
    // Fallback local guest
    setUser({
      uid: 'guest_' + Date.now(),
      email: null,
      displayName: 'Guest User',
      photoURL: null,
      isAnonymous: true,
    });
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

