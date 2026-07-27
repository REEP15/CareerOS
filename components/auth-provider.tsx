"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";

import { getAuth as getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let isMounted = true;
    let hasUnsubscribed = false;

    const handleAuthChange = (currentUser: User | null) => {
      if (isMounted && !hasUnsubscribed) {
        setUser(currentUser);
        setLoading(false);
      }
    };

    try {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, handleAuthChange);

      return () => {
        isMounted = false;
        hasUnsubscribed = true;
        unsubscribe();
      };
    } catch (error) {
      console.error("Auth initialization error:", error);
      setTimeout(() => {
        if (isMounted && !hasUnsubscribed) {
          setLoading(false);
        }
      }, 0);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email: string) => {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
