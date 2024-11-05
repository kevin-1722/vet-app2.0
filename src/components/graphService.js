// src/components/graphService.js 
import { msalInstance, loginRequest } from './msalInstance';
import { driveId } from './config'; 

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

export const fetchTopLevelItems = async () => {
    const items = await graphApiFetch(`/drives/${driveId}/root/children`); // Fetch the top-level items
    return items; // Return the fetched items
};


export const fetchDigitalFilingCabinetId = async () => {
    const items = await fetchTopLevelItems();
    const folder = items.value.find(item => item.name === "Digital File Cabinet");
    if (!folder) throw new Error('Digital Filing Cabinet folder not found');
    return folder.id; // Return the ID of the folder
};

export const fetchChannels = async (teamId) => {
    return graphApiFetch(`/teams/${teamId}/channels`);
};

export const fetchFileCabinetId = async (driveId, parentFolderId) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === "File Cabinet");
    if (!folder) throw new Error('File Cabinet folder not found');
    return folder.id; // Return the ID of the File Cabinet folder
};

export const fetchStudentRecordsId = async (driveId, parentFolderId) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === "Student Records");
    if (!folder) throw new Error('Student Records folder not found');
    return folder.id; // Return the ID of the Student Records folder
};

export const fetchCurrentStudentsId = async (driveId, parentFolderId) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === "01 Current Students");
    if (!folder) throw new Error('01 Current Students folder not found');
    return folder.id; // Return the ID of the 01 Current Students folder
};


export const fetchStudentFolderId = async (driveId, parentFolderId, studentName) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === studentName);
    if (!folder) throw new Error(`${studentName} folder not found`);
    return folder.id; // Return the ID of the student's folder
};
 
export const fetchStudentFolderContents= async (driveId, studentFolderId) => {
    return fetchChildren(driveId, studentFolderId); // Fetch contents of the student's folder
};

export const fetchSubFolderContents = async (driveId, subFolderId) => {
    return fetchChildren(driveId, subFolderId); // Fetch contents of a subfolder
};





export const fetchChildren = async (driveId, itemId) => {
    return graphApiFetch(`/drives/${driveId}/items/${itemId}/children`);
};
export const getExcelFileDownloadUrl = async (driveId, folderId) => {
    const response = await fetchChildren(driveId, folderId);
    const fileItem = response.value.find(file => file.name === "RFC Dummy v2.xlsx");
    if (!fileItem) throw new Error('File not found');
    return fileItem["@microsoft.graph.downloadUrl"];
};
