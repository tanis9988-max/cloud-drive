import React, { createContext, useContext, useState } from 'react';
import { api } from '../api/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('clouddrive_user');
    return stored ? JSON.parse(stored) : null;
  });

  function persist(token, user) {
    localStorage.setItem('clouddrive_token', token);
    localStorage.setItem('clouddrive_user', JSON.stringify(user));
    setUser(user);
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    persist(data.token, data.user);
  }

  async function register(name, email, password) {
    const data = await api.register(name, email, password);
    persist(data.token, data.user);
  }

  function logout() {
    localStorage.removeItem('clouddrive_token');
    localStorage.removeItem('clouddrive_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
