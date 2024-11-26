// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { msalInstance, loginRequest } from './msalInstance';
import { useAuth } from './AuthContext';
import './login.css';

function Login() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false); 


    const handleMsalLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
    
        try {
            const response = await msalInstance.loginPopup(loginRequest);
            if (response && response.account) {
                localStorage.setItem('msalAccount', response.account.username);
                login();
                setSuccess('Microsoft login successful!');
                navigate('/secure'); 
            }
        } catch (error) {
            console.error('Microsoft login failed:', error);
            setError('Microsoft login failed. Please try again.');
        } finally {
            setIsLoggingIn(false);
        }
    };
    
    return (
        <div className="login-container">
            <img src="https://i.imgur.com/SROEj2Q.jpeg" alt="Logo" className="logo" />
            <h2>Login</h2>
            <button onClick={handleMsalLogin} className="login-button">Login with Microsoft</button>
            {success && <p className="success-message">{success}</p>}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default Login;