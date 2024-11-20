// src/App.js
import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext'; 
import AuthService from './components/AuthService';
import Login from './components/Login';
import Navigation from './components/navigation';
import './App.css';
import MergedDocumentTracker from './components/docScanner';

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mergedDocumentTrackerRef = useRef(null);

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

  const handleScanDocuments = () => {
    if (mergedDocumentTrackerRef.current && mergedDocumentTrackerRef.current.handleScan) {
      mergedDocumentTrackerRef.current.handleScan();
    }
  };

  const handleRefreshData = () => {
    if (mergedDocumentTrackerRef.current && mergedDocumentTrackerRef.current.handleRefresh) {
      mergedDocumentTrackerRef.current.handleRefresh();
    }
  };

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
                  <Navigation 
                    onScanDocuments={handleScanDocuments} 
                    onRefreshData={handleRefreshData}
                    isLoading={isLoading}
                  /> 
                  <MergedDocumentTracker 
                    ref={mergedDocumentTrackerRef} 
                    setIsLoading={setIsLoading} 
                  />
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