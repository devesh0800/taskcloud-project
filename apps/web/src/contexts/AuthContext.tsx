'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/axios';
import { User, Role } from '@/types';
import { toast } from 'sonner';

function extractErrorMessage(err: any, fallback: string): string {
  const data = err.response?.data;
  if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map((e: any) => e.message).join(' • ');
  }
  return data?.message || err.message || fallback;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { email: string; password: string; rememberMe?: boolean }) => Promise<string>;
  registerTeacher: (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    teacherId?: string;
    department?: string;
  }) => Promise<void>;
  registerStudent: (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    studentId: string;
    course: string;
    semester?: string;
    section?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load authenticated user on mount via token / cookie
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (data: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        user: User;
        accessToken?: string;
        refreshToken?: string;
        redirectPath: string;
      }>('/auth/login', data);

      if (typeof window !== 'undefined') {
        if (response.data.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
        }
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }

      setUser(response.data.user);
      toast.success(response.data.message || 'Login successful!');
      return response.data.redirectPath;
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Login failed.');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const registerTeacher = async (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    teacherId?: string;
    department?: string;
  }) => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        user: User;
      }>('/auth/register', {
        ...data,
        role: 'TEACHER',
      });

      toast.success(response.data.message || 'Account created! Please verify your email.');
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Registration failed.');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const registerStudent = async (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    studentId: string;
    course: string;
    semester?: string;
    section?: string;
  }) => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        user: User;
      }>('/auth/register', {
        ...data,
        role: 'STUDENT',
      });

      toast.success(response.data.message || 'Account created! Please verify your email.');
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Registration failed.');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setUser(null);
      toast.info('You have been signed out.');
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        registerTeacher,
        registerStudent,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
