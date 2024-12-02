// src/services/authService.js
import { msalInstance, loginRequest } from '../components/msalInstance';

// Static service class to manage MSAL authentication initialization and token acquisition
class AuthService {
    // Track MSAL initialization status to prevent redundant initialization
    static isInitialized = false;
    static initializationPromise = null;

    static async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        // Attempt to initialize MSAL instance
        this.initializationPromise = msalInstance.initialize()
            .then(() => {
                // Mark initialization as successful
                this.isInitialized = true;
            })
            .catch(error => {
                // Log initialization failure and update status
                console.error('MSAL initialization failed:', error);
                this.isInitialized = false;
                throw error;
            });

        return this.initializationPromise;
    }
    // Makes sure that MSAL is initialized before performing authentication operations
    static async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }
    // Acquire an access token for Microsoft Graph API calls
    static async getAccessToken() {
         // First verify MSAL is initialized
        await this.ensureInitialized();

        // Retrieve the first logged-in account
        const account = msalInstance.getAllAccounts()[0];
        if (!account) {
            throw new Error('No active account! Please log in.');
        }

        try {
            // Attempt to acquire token silently behind the scenes
            const response = await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: account
            });
            return response.accessToken;
        } catch (error) {
            console.error('Silent token acquisition failed:', error);
            // If silent token acquisition fails interaction required
            if (error.name === "InteractionRequiredAuthError") {
                try {
                    // Fallback to interactive token acquisition via popup
                    const response = await msalInstance.acquireTokenPopup(loginRequest);
                    return response.accessToken;
                } catch (popupError) {
                    console.error('Popup token acquisition failed:', popupError);
                    throw popupError;
                }
            }
            throw error;
        }
    }
    // Checks for existing logged-in accounts on page load
    static async handlePageLoad() {
        await this.ensureInitialized();
        const accounts = msalInstance.getAllAccounts();
        return accounts.length > 0;
    }
}

export default AuthService;