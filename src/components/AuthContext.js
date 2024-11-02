import React, { createContext, useContext, useState } from 'react';
import { msalInstance } from './msalInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('msalAccount'));

    const login = () => {
        setIsAuthenticated(true);
    };

    const logout = async () => {
        msalInstance.logout();
        localStorage.removeItem('msalAccount');
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);