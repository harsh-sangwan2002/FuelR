import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, Role, isProfileComplete } from '../types/user';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: Role;
  profileComplete: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const profileUnsubRef = useRef<(() => void) | null>(null);

  const role: Role = (userProfile?.role ?? 'user') as Role;
  const profileComplete = isProfileComplete(userProfile);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (u) {
        const userRef = doc(db, 'users', u.uid);
        let firstSnap = true;
        profileUnsubRef.current = onSnapshot(userRef, (snap) => {
          setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
          if (firstSnap) {
            firstSnap = false;
            setLoading(false);
          }
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser, { displayName: name.trim() });
    await setDoc(doc(db, 'users', newUser.uid), {
      uid: newUser.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'user',
      createdAt: serverTimestamp(),
    });
    setUser({ ...newUser, displayName: name.trim() } as User);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    } else {
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName ?? '',
        email: user.email ?? '',
        role: 'user',
        createdAt: serverTimestamp(),
        ...data,
        updatedAt: serverTimestamp(),
      });
    }
    // Also sync displayName in Firebase Auth if name changed
    if (data.name && user.displayName !== data.name) {
      await updateProfile(user, { displayName: data.name });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        profileComplete,
        loading,
        signIn,
        signUp,
        logOut,
        resetPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
