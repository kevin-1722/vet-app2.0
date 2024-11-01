// src/components/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { msalInstance, loginRequest } from './msalInstance';
import { useAuth } from './AuthContext';
import './login.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false); 

    useEffect(() => {
        const initializeMsal = async () => {
            await msalInstance.initialize();
        };
        initializeMsal();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                login();
                setSuccess('Login successful!');
                navigate('/secure');
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        }
    };

    const handleMsalLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
    
        try {
            const response = await msalInstance.loginPopup(loginRequest);
            console.log('Login response:', response); 
    
            if (response && response.account) {
                localStorage.setItem('msalAccount', response.account.username);
                console.log('Bearer Access Token:', response.accessToken);
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
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" className="login-button">Submit</button>
            </form>
            <button onClick={handleMsalLogin} className="login-button">Login with Microsoft</button>
        </div>
    );
}

export default Login;