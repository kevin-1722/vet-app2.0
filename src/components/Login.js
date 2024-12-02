// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { msalInstance, loginRequest } from './msalInstance';
import { useAuth } from './AuthContext';
import './login.css';

function Login() {
    // State management for error handling and login process
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
     // Prevent multiple simultaneous login attempts
    const [isLoggingIn, setIsLoggingIn] = useState(false); 

    // Handles Microsoft OAuth2.0 authentication via popup login
    const handleMsalLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
    
        try {
            // Attempt login using MSAL popup method with scopes
            const response = await msalInstance.loginPopup(loginRequest);
            // Verify successful authentication
            if (response && response.account) {
                localStorage.setItem('msalAccount', response.account.username);
                login();
                // Show success message and navigate to secure route
                setSuccess('Microsoft login successful!');
                navigate('/secure'); 
            }
        } catch (error) {
            // Log and display error if login fails
            console.error('Microsoft login failed:', error);
            setError('Microsoft login failed. Please try again.');
        } finally {
            setIsLoggingIn(false);
        }
    };
    
    return (
        <div className="login-container">
            {/* App logo */}
            <img src="https://i.imgur.com/SROEj2Q.jpeg" alt="Logo" className="logo" />
            <h2>Login</h2>
            {/* Microsoft login button */}
            <button onClick={handleMsalLogin} className="login-button">Login with Microsoft</button>
            {/* Display success or error messages */}
            {success && <p className="success-message">{success}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default Login;