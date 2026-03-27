import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: { id: number; name: string }[];
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, permissions: string[]) => void;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // The request interceptor automatically attaches the Bearer token
          const response = await api.get('/auth/me');
          setUser(response.data.data.user);
          setPermissions(response.data.data.permissions || []);
        } catch (error) {
          // Token is invalid or expired — clean up
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, userData: User, userPermissions: string[]) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setPermissions(userPermissions);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setPermissions([]);
    }
  };

  const hasRole = (role: string) => {
    return user?.roles.some(r => r.name === role) ?? false;
  };

  const hasPermission = (permission: string) => {
    return permissions.includes(permission) || hasRole('admin');
  };

  return (
    <AuthContext.Provider value={{ user, permissions, isAuthenticated: !!user, isLoading, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
