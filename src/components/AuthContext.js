import React, { createContext, useContext, useState } from 'react';
import { msalInstance } from './msalInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('msalAccount'));

    const login = () => {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
    };

    const logout = async () => {
        try {
            const redirectUri = process.env.REACT_APP_LOGOUT_URI || window.location.origin;
            await msalInstance.logoutPopup({
                postLogoutRedirectUri: redirectUri, // Dynamic redirect URI
                mainWindowRedirectUri: redirectUri,
            });
            localStorage.removeItem('msalAccount');
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
            localStorage.setItem('isAuthenticated', 'false');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);