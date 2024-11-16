// src/components/graphService.js 
//import { msalInstance, loginRequest } from './msalInstance';
import AuthService from './AuthService';
import { driveId } from './config'; 

export const graphApiFetch = async (url, method = 'GET', body = null) => {
    try {
        const accessToken = await AuthService.getAccessToken();
        
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
        throw error;
    }
};

export const fetchTopLevelItems = async () => {
    const items = await graphApiFetch(`/drives/${driveId}/root/children`);
    return items;
};

export const fetchDigitalFilingCabinetId = async () => {
    const items = await fetchTopLevelItems();
    const folder = items.value.find(item => item.name === "Digital File Cabinet");
    if (!folder) throw new Error('Digital Filing Cabinet folder not found');
    return folder.id;
};

export const fetchChannels = async (teamId) => {
    return graphApiFetch(`/teams/${teamId}/channels`);
};

export const fetchFileCabinetId = async (driveId, parentFolderId) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === "File Cabinet");
    if (!folder) throw new Error('File Cabinet folder not found');
    return folder.id;
};

export const fetchStudentRecordsId = async (driveId, parentFolderId) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === "Student Records");
    if (!folder) throw new Error('Student Records folder not found');
    return folder.id;
};

export const fetchCurrentStudentsId = async (driveId, parentFolderId) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === "01 Current Students");
    if (!folder) throw new Error('01 Current Students folder not found');
    return folder.id;
};

export const fetchStudentFolderId = async (driveId, parentFolderId, studentName) => {
    const children = await fetchChildren(driveId, parentFolderId);
    const folder = children.value.find(item => item.name === studentName);
    if (!folder) throw new Error(`${studentName} folder not found`);
    return folder.id;
};
 
export const fetchStudentFolderContents= async (driveId, studentFolderId) => {
    return fetchChildren(driveId, studentFolderId);
};

export const fetchSubFolderContents = async (driveId, subFolderId) => {
    return fetchChildren(driveId, subFolderId);
};

export const fetchPdfsFromFolder = async (siteId, driveId, folderId) => {
    try {
        const data = await fetchChildren(driveId, folderId);
        const pdfs = data.value.filter(item => item.name.endsWith('.pdf'));
        return pdfs;
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        return [];
    }
};

export const getFileDownloadUrl = async (driveId, fileId) => {
    try {
        const response = await graphApiFetch(`/drives/${driveId}/items/${fileId}`);
        return response['@microsoft.graph.downloadUrl'];
    } catch (error) {
        console.error('Error fetching file download URL:', error);
        return null;
    }
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