import React, { createContext, useContext, useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, testSupabaseConnection } from "../lib/supabase";
import { User, AuthContextType } from "../types";
import { userProfileStorage } from "../utils/supabase-storage";
import { sendWelcomeEmail } from "../utils/email";

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test Supabase connection first
    testSupabaseConnection().then(isConnected => {
      if (!isConnected) {
        console.error('Failed to connect to Supabase');
      }
    });

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
      console.log('Auth state change:', event, session?.user?.id);
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
          email: authUser.email || "",
        });
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const validateContactNumber = (contactNumber: string): boolean => {
    // Remove all non-digit characters
    const cleanNumber = contactNumber.replace(/\D/g, "");

    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    const indianMobileRegex = /^[6-9]\d{9}$/;
    return indianMobileRegex.test(cleanNumber);
  };
  /////

  ////

  /////

  const signup = async (
    name: string,
    email: string,
    password: string,
    contactNumber: string,
    userType: "farmer" | "worker",
    location?: string,
    dateOfBirth?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Starting signup process for:', email);
      
      // Step 1: Sign up the user with metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            contact_number: contactNumber,
            user_type: userType,
            location,
            date_of_birth: dateOfBirth,
          },
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        return {
          success: false,
          error: signUpError.message || "Signup failed",
        };
      }

      if (!data?.user) {
        console.error('No user data returned from signup');
        return {
          success: false,
          error: "No user data returned from signup",
        };
      }

      console.log('User created successfully:', data.user.id);

      // Step 2: Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Get the current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return { success: false, error: "Failed to get session after signup" };
      }

      const session = sessionData?.session;
      if (!session) {
        console.log('No active session, user may need email confirmation');
        // Check if email confirmation is required
        if (data.user && !data.user.email_confirmed_at) {
          return { 
            success: false, 
            error: "Please check your email and confirm your account before logging in" 
          };
        }
        return { success: false, error: "No active session after signup" };
      }

      console.log('Session established, inserting profile...');

      // Step 4: Insert into user_profiles with retry logic
      let insertError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error } = await supabase
          .from("user_profiles")
          .insert([
            {
              id: data.user.id,
              name,
              contact_number: contactNumber,
              user_type: userType,
              location: location || null,
              date_of_birth: dateOfBirth || null,
            },
          ]);

        if (!error) {
          console.log('Profile inserted successfully on attempt', attempt);
          break;
        }

        insertError = error;
        console.error(`Profile insert attempt ${attempt} failed:`, error);
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (insertError) {
        console.error('All profile insert attempts failed:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log('Signup completed successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      return { success: false, error: err.message || "Unexpected error during signup" };
    }
  };

  ///
  /////
  ////
  /////

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        return false;
      }

      if (!data.user) {
        console.error("No user data returned from login");
        return false;
      }

      console.log('Login successful for user:', data.user.id);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const success = await userProfileStorage.updateUserProfile(
        user.id,
        updates
      );

      if (success) {
        setUser((prevUser) => (prevUser ? { ...prevUser, ...updates } : null));
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, loading, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
