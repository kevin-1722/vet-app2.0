import React, { createContext, useContext, useState } from 'react';
import { msalInstance } from './msalInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('msalAccount'));

    const login = () => {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
    };

    //const logout = async () => {
        //msalInstance.logout();
        //localStorage.removeItem('msalAccount');
        //setIsAuthenticated(false);
    //};

    const logout = async () => {
        try {
            await msalInstance.logoutPopup({
                postLogoutRedirectUri: 'http://localhost:3001',
                mainWindowRedirectUri: 'http://localhost:3001',
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