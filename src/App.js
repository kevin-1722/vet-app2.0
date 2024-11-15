// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext'; 
//import { msalInstance } from './components/msalInstance';
import AuthService from './components/AuthService';
import Login from './components/Login';
import SecurePage from './components/checklist';
import Navigation from './components/navigation';
import './App.css';
import ScanTest from './components/scanTest';
import Testing from './components/testing';
import MergedDocumentTracker from './components/docScanner';

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await AuthService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };

    initializeAuth();
  }, []);

  if (!isInitialized) {
    return <div>Initializing...</div>;
  }

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route 
              path="/secure" 
              element={
                <ProtectedRoute>
                  <Navigation /> 
                  {/* <SecurePage />
                  <ScanTest />
                  <Testing /> */}
                  <MergedDocumentTracker />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
};


export default App;