import React, { createContext, useContext, useState } from 'react';
import { msalInstance } from './msalInstance';
import { redirectUri } from './config';

// Create a context for managing authentication state across the application
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Initialize authentication state based on existing MSAL account in local storage
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('msalAccount'));

    const login = () => {
        // Login method to update authentication state and persist login status
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
    };

    // Logout method to handle user sign-out process
    const logout = async () => {
        try {
            // Use configured redirect URI or default to current origin
            // Supports both local testing and production environments
            const uri = window.location.origin;
            // Perform logout using MSAL popup method
            // Specify post-logout redirect URIs
            await msalInstance.logoutPopup({
                postLogoutRedirectUri: uri,
                mainWindowRedirectUri: uri,
            });
            // Clear authentication-related local storage items
            localStorage.removeItem('msalAccount');
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
            localStorage.setItem('isAuthenticated', 'false');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    // Provide authentication context to child components
    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
// Custom hook to easily access authentication context in components
export const useAuth = () => useContext(AuthContext);