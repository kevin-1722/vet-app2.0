// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext'; 
import { msalInstance } from './components/msalInstance';
import Login from './components/Login';
import SecurePage from './components/checklist';
import Navigation from './components/navigation';
import './App.css';
import ScanTest from './components/scanTest';
import Testing from './components/testing';

const App = () => {
  useEffect(() => {
    const initializeMsal = async () => {
      await msalInstance.initialize();
    };
    initializeMsal();
  }, []);


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
                  <SecurePage />
                  <ScanTest />
                  <Testing/>
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