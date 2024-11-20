// frontend/src/components/msalInstance.js
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: '99ca919b-3dd0-488f-b3e6-603c8b351f87',
    authority: 'https://login.microsoftonline.com/64b55024-8293-414d-9162-34e53bb5aa08',
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  }
};

const loginRequest = {
    scopes: [
      'User.Read',
      'Files.Read',
      'Files.Read.All',
      'Files.ReadWrite',
      'Sites.Read.All',
      'Sites.ReadWrite.All',
      'Channel.ReadBasic.All',
      'Team.ReadBasic.All',
      'User.Read.All',
      'Directory.Read.All'
    ]
  };

const msalInstance = new PublicClientApplication(msalConfig);
export { msalInstance, loginRequest };

