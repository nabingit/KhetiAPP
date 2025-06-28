import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, AuthContextType } from '../types';
import { userProfileStorage } from '../utils/supabase-storage';
import { sendWelcomeEmail } from '../utils/email';

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      const profile = await userProfileStorage.getUserProfile(authUser.id);
      if (profile) {
        setUser({
          ...profile,
          email: authUser.email || ''
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const validateContactNumber = (contactNumber: string): boolean => {
    // Remove all non-digit characters
    const cleanNumber = contactNumber.replace(/\D/g, '');
    
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    const indianMobileRegex = /^[6-9]\d{9}$/;
    return indianMobileRegex.test(cleanNumber);
  };

  const signup = async (
    name: string, 
    email: string, 
    password: string, 
    contactNumber: string,
    userType: 'farmer' | 'worker',
    location?: string,
    dateOfBirth?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate contact number
      if (!validateContactNumber(contactNumber)) {
        return { success: false, error: 'Please enter a valid 10-digit mobile number' };
      }

      // Check if contact number already exists
      const allProfiles = await userProfileStorage.getAllUserProfiles();
      const existingContact = allProfiles.find((u: User) => u.contactNumber === contactNumber.replace(/\D/g, ''));
      if (existingContact) {
        return { success: false, error: 'Contact number already registered' };
      }

      // Validate age for workers
      if (userType === 'worker' && dateOfBirth) {
        const age = calculateAge(dateOfBirth);
        if (age < 16) {
          return { success: false, error: 'Workers must be at least 16 years old to register' };
        }
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return { success: false, error: 'Email already exists' };
        }
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      // If we have a session, ensure it's set in the client
      // This is necessary for the profile creation to be authenticated
      if (authData.session) {
        await supabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token
        });
      }

      // Create user profile
      const newUser: User = {
        id: authData.user.id,
        name,
        email,
        contactNumber: contactNumber.replace(/\D/g, ''), // Store only digits
        userType,
        location,
        dateOfBirth,
        createdAt: new Date().toISOString()
      };

      const profileCreated = await userProfileStorage.createUserProfile(newUser);
      
      if (!profileCreated) {
        return { success: false, error: 'Failed to create user profile' };
      }

      // Send welcome email
      await sendWelcomeEmail(name, email);

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const success = await userProfileStorage.updateUserProfile(user.id, updates);
      
      if (success) {
        setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}