// frontend/src/components/msalInstance.js
import { PublicClientApplication } from '@azure/msal-browser';
import { clientId, tenantId } from './config';

// MSAL configuration for Entra ID authentication
// Defines client ID, tenant, redirect URI, and cache settings
const msalConfig = {
  auth: {
    clientId: clientId, // Unique application ID from Entra ID registration
    authority: tenantId, // Entra ID tenant/directory ID
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin // Redirect URL after authentication
  },
  cache: {
    cacheLocation: 'localStorage', // Store authentication tokens in browser's local storage
    storeAuthStateInCookie: false // Avoid storing auth state in cookies for security
  }
};

// Define the authentication scopes required for Microsoft Graph API access
// These scopes determine the level of access and resources the app can interact with
const loginRequest = {
    scopes: [
      'User.Read', // Basic user profile information
      'Files.Read', // Read access to files
      'Files.Read.All', // Read access to all files
      'Files.ReadWrite', // Read and write access to files
      'Sites.Read.All', // Read access to all SharePoint sites
      'Sites.ReadWrite.All', // Read and write access to all SharePoint sites
      'Channel.ReadBasic.All', // Read basic channel information
      'Team.ReadBasic.All', // Read basic team information
      'User.Read.All', // Read all user profiles
      'Directory.Read.All'  // Read directory information
    ]
  };
  
// Create a MSAL PublicClientApplication instance for handling authentication
const msalInstance = new PublicClientApplication(msalConfig);

// Export MSAL instance and login request for use in other components
export { msalInstance, loginRequest };

