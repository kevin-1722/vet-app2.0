// src/components/graphService.js 
//import { msalInstance, loginRequest } from './msalInstance';
import AuthService from './AuthService';
import { driveId } from './config'; 

const RATE_LIMIT = {
    maxRetries: 3,
    initialRetryDelay: 2000,
    maxRetryDelay: 10000,
    backoffFactor: 2
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const graphApiFetch = async (url, method = 'GET', body = null, retryCount = 0) => {
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
        
        // Handle rate limiting
        if (graphResponse.status === 429) {
            console.error('Rate limit hit:', {
                url,
                method,
                retryCount,
                headers: Object.fromEntries(graphResponse.headers.entries())
            });
            if (retryCount >= RATE_LIMIT.maxRetries) {
                throw new Error('Maximum retry attempts reached');
            }

            // Get retry-after header or use exponential backoff
            const retryAfter = graphResponse.headers.get('Retry-After');
            const baseDelay = retryAfter ? 
                parseInt(retryAfter) * 1000 : 
                Math.min(
                    RATE_LIMIT.initialRetryDelay * Math.pow(RATE_LIMIT.backoffFactor, retryCount),
                    RATE_LIMIT.maxRetryDelay
                );
            const jitterDelay = baseDelay * (1 + Math.random());
            console.warn(`Rate limited. Retrying in ${jitterDelay/1000} seconds...`);
            await delay(jitterDelay);
            return graphApiFetch(url, method, body, retryCount + 1);
        }

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

export const createStudentFolder = async (driveId, parentFolderId, folderName) => {
    try {
        const accessToken = await AuthService.getAccessToken();
        
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${accessToken}`);
        headers.append('Content-Type', 'application/json');

        const body = {
            name: folderName,
            folder: {}
        };

        const options = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        };

        const graphResponse = await fetch(
            `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentFolderId}/children`, 
            options
        );

        if (!graphResponse.ok) {
            throw new Error(`Graph API folder creation failed with status ${graphResponse.status}`);
        }

        return await graphResponse.json();
    } catch (error) {
        console.error('Error creating student folder:', error);
        throw error;
    }
};

export const fetchAllChildren = async (driveId, itemId) => {
    let allChildren = [];
    let nextLink = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/children`;
    
    try {
        while (nextLink) {
            const accessToken = await AuthService.getAccessToken();
            const headers = new Headers({
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            });
            const response = await fetch(nextLink, { headers });
            if (!response.ok) {
                throw new Error(`Failed to fetch children: ${response.status}`);
            }
            const data = await response.json();
            allChildren = [...allChildren, ...data.value];
            nextLink = data['@odata.nextLink'] || null;
        }
        
        return { value: allChildren };
    } catch (error) {
        console.error('Error in fetchAllChildren:', error);
        throw new Error(`Failed to fetch all children: ${error.message}`);
    }
};

export const createStudentFoldersInBatches = async (driveId, parentFolderId, missingFolders) => {
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000;
    const results = [];
    const errors = [];
    for (let i = 0; i < missingFolders.length; i += BATCH_SIZE) {
        const batch = missingFolders.slice(i, i + BATCH_SIZE);
        
        try {
            const batchResults = await Promise.all(
                batch.map(student => 
                    createStudentFolder(driveId, parentFolderId, `${student.name} ${student.studentId}`)
                    .catch(error => {
                        errors.push({
                            studentName: `${student.name} ${student.studentId}`,
                            error: error.message
                        });
                        return null;
                    })
                )
            );
            results.push(...batchResults.filter(result => result !== null));
            if (i + BATCH_SIZE < missingFolders.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        } catch (error) {
            console.error(`Error processing batch starting at index ${i}:`, error);
        }
    }
    return { results, errors };
};