import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'Inventory Manager' | 'Warehouse Staff';
  rawRole?: 'manager' | 'staff';
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password?: string, rolePreset?: 'Inventory Manager' | 'Warehouse Staff') => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'stocksense_session_auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse auth from storage', e);
    }
    return null;
  });

  // Re-verify session with backend on load
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        // Safe check: clear storage if 401
        if (!res.ok) {
          if (res.status === 401) {
            setUser(null);
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && data.user) {
          const isManager = data.user.role === 'manager';
          const authUser: AuthUser = {
            id: String(data.user.id),
            name: data.user.name,
            email: data.user.email,
            role: isManager ? 'Inventory Manager' : 'Warehouse Staff',
            rawRole: data.user.role,
            avatar: isManager
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
              : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          };
          setUser(authUser);
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        }
      })
      .catch(() => {
        // keep sessionStorage state on network failure
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isAuthenticated = Boolean(user);

  const login = async (
    email: string,
    password?: string,
    rolePreset: 'Inventory Manager' | 'Warehouse Staff' = 'Inventory Manager'
  ) => {
    const cleanEmail = email.trim();
    // Use matching password preset if not provided
    const effectivePassword =
      password ||
      (cleanEmail === 'staff@stocksense.dev'
        ? 'Staff@123'
        : cleanEmail === 'manager@stocksense.dev'
        ? 'Manager@123'
        : 'Manager@123');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password: effectivePassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Login failed. Invalid credentials.');
      }

      const backendUser = data.user;
      const isManager = backendUser.role === 'manager';
      const newUser: AuthUser = {
        id: String(backendUser.id),
        name: backendUser.name,
        email: backendUser.email,
        role: isManager ? 'Inventory Manager' : 'Warehouse Staff',
        rawRole: backendUser.role,
        avatar: isManager
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      };

      setUser(newUser);
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch (err: any) {
      console.warn('Backend login error:', err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout error', e);
    }
    setUser(null);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove auth from storage', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
