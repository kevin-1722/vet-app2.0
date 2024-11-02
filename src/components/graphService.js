// src/components/graphService.js 
import { msalInstance, loginRequest } from './msalInstance';

export const graphApiFetch = async (url, method = 'GET', body = null) => {
    try {
        const account = msalInstance.getAllAccounts()[0];
        if (!account) throw new Error('No active account! Please log in.');

        const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: account,
        });

        const accessToken = response.accessToken;
        if (!accessToken) throw new Error('Access token could not be acquired. Please log in.');

        const headers = new Headers();
        headers.append('Authorization', `Bearer ${accessToken}`);
        headers.append('Content-Type', 'application/json');

        const options = {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        };

        const graphResponse = await fetch(`https://graph.microsoft.com/v1.0${url}`, options);
        if (!graphResponse.ok) {
            throw new Error(`Graph API request failed with status ${graphResponse.status}`);
        }

        return await graphResponse.json();
    } catch (error) {
        console.error('Error in graphApiFetch:', error);
        throw new Error('Could not fetch data from Graph API. Please try again.');
    }
};

//export const fetchChannels = async (teamId) => {
    //return graphApiFetch(`/teams/${teamId}/channels`);
//};

//export const fetchFolders = async (driveId) => {
    //return graphApiFetch(`/drives/${driveId}/root/children`);
//};

export const fetchChildren = async (driveId, itemId) => {
    return graphApiFetch(`/drives/${driveId}/items/${itemId}/children`);
};

//export const fetchFolderContents = async (folderId) => {
    //return graphApiFetch(`/drives/{driveId}/items/${folderId}/children`);
//};

export const getExcelFileDownloadUrl = async (driveId, folderId) => {
    const response = await fetchChildren(driveId, folderId);
    const fileItem = response.value.find(file => file.name === "RFC Dummy v2.xlsx");
    if (!fileItem) throw new Error('File not found');
    return fileItem["@microsoft.graph.downloadUrl"];
};
