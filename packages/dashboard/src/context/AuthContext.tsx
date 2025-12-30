import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { userService, authService } from '../api/services';
import { LoginRequest } from '../types';

interface AuthContextType {
  user: User | null;
  apiKey: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(
    localStorage.getItem('apiKey')
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (apiKey) {
        try {
          const profile = await userService.getProfile();
          setUser(profile);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          localStorage.removeItem('apiKey');
          setApiKey(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [apiKey]);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.success && response.data.user.apiKey) {
        localStorage.setItem('apiKey', response.data.user.apiKey);
        setApiKey(response.data.user.apiKey);

        // After login, fetch the full user profile
        const profile = await userService.getProfile();
        setUser(profile);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('apiKey');
    setApiKey(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        apiKey,
        login,
        logout,
        isLoading,
        isAuthenticated: !!apiKey && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
