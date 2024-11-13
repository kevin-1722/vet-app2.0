// src/services/authService.js
import { msalInstance, loginRequest } from '../components/msalInstance';

class AuthService {
    static isInitialized = false;
    static initializationPromise = null;

    static async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = msalInstance.initialize()
            .then(() => {
                this.isInitialized = true;
                console.log('MSAL initialized successfully');
            })
            .catch(error => {
                console.error('MSAL initialization failed:', error);
                this.isInitialized = false;
                throw error;
            });

        return this.initializationPromise;
    }

    static async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    static async getAccessToken() {
        await this.ensureInitialized();

        const account = msalInstance.getAllAccounts()[0];
        if (!account) {
            throw new Error('No active account! Please log in.');
        }

        try {
            const response = await msalInstance.acquireTokenSilent({
                ...loginRequest,
                account: account
            });
            return response.accessToken;
        } catch (error) {
            console.error('Silent token acquisition failed:', error);

            if (error.name === "InteractionRequiredAuthError") {
                try {
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

    static async handlePageLoad() {
        await this.ensureInitialized();
        const accounts = msalInstance.getAllAccounts();
        return accounts.length > 0;
    }
}

export default AuthService;