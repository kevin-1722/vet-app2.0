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
  const [isInitialized, setIsInitialized] = useState(false); // State to track authentication initialization
  const [isLoading, setIsLoading] = useState(false); // State to track loading status
  const mergedDocumentTrackerRef = useRef(null); // Ref to access the MergedDocumentTracker component

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize authentication service
        await AuthService.initialize();
        setIsInitialized(true); // Set initialization state to true if successful
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };

    initializeAuth(); // Call the initialization function when the component mounts
  }, []);

  // Handles document scanning by calling the handleScan method of MergedDocumentTracker
  const handleScanDocuments = () => {
    if (mergedDocumentTrackerRef.current && mergedDocumentTrackerRef.current.handleScan) {
      mergedDocumentTrackerRef.current.handleScan();
    }
  };
  // Handles document scanning by calling the handleRefresh method of MergedDocumentTracker
  const handleRefreshData = () => {
    if (mergedDocumentTrackerRef.current && mergedDocumentTrackerRef.current.handleRefresh) {
      mergedDocumentTrackerRef.current.handleRefresh();
    }
  };
  // Display an initializing message while authentication is being initialized
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
// Protect routes based on authentication status
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default App;