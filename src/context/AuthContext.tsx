import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType } from '../types';
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
    const savedUser = localStorage.getItem('kheticulture_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

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

      // Check if user already exists
      const users = JSON.parse(localStorage.getItem('kheticulture_users') || '[]');
      const existingUser = users.find((u: User) => u.email === email);
      
      if (existingUser) {
        return { success: false, error: 'Email already exists' };
      }

      // Check if contact number already exists
      const existingContact = users.find((u: User) => u.contactNumber === contactNumber.replace(/\D/g, ''));
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

      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        contactNumber: contactNumber.replace(/\D/g, ''), // Store only digits
        userType,
        location,
        dateOfBirth,
        createdAt: new Date().toISOString()
      };

      // Save user
      users.push(newUser);
      localStorage.setItem('kheticulture_users', JSON.stringify(users));
      localStorage.setItem('kheticulture_user', JSON.stringify(newUser));
      localStorage.setItem(`kheticulture_password_${email}`, password);
      
      setUser(newUser);

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
      const users = JSON.parse(localStorage.getItem('kheticulture_users') || '[]');
      const user = users.find((u: User) => u.email === email);
      const savedPassword = localStorage.getItem(`kheticulture_password_${email}`);

      if (user && savedPassword === password) {
        localStorage.setItem('kheticulture_user', JSON.stringify(user));
        setUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    
    // Update in localStorage
    localStorage.setItem('kheticulture_user', JSON.stringify(updatedUser));
    
    // Update in users array
    const users = JSON.parse(localStorage.getItem('kheticulture_users') || '[]');
    const userIndex = users.findIndex((u: User) => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = updatedUser;
      localStorage.setItem('kheticulture_users', JSON.stringify(users));
    }
    
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('kheticulture_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}