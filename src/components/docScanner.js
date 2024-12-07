// src/components/docScanner.js
import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as XLSX from 'xlsx';
import { 
    fetchDigitalFilingCabinetId, fetchChildren, fetchFileCabinetId, fetchStudentRecordsId, 
    fetchCurrentStudentsId,getExcelFileDownloadUrl, createStudentFoldersInBatches, fetchAllChildren, renameFolderById
} from './graphService';
import { driveId, studentTrackersFolderId } from './config';
import Search from './search';
import DataTable from './dataTable';
import './docScanner.css';

// Component for tracking and validating student documents
const MergedDocumentTracker = forwardRef(({ setIsLoading }, ref) => {
    const [showCompleted, setShowCompleted] = useState(false);
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [checkedDocuments, setCheckedDocuments] = useState({});
    const [editingBenefits, setEditingBenefits] = useState({});
    const [loading, setLoading] = useState(false);
    const [fileCabinetContents, setFileCabinetContents] = useState([]);
    const [studentRecordsContents, setStudentRecordsContents] = useState([]);
    const [currentStudentsContents, setCurrentStudentsContents] = useState([]);
    const [studentFoldersMap, setStudentFoldersMap] = useState({});
    const [subFolderContentMap, setSubFolderContentMap] = useState({}); 
    const [validationResultsMap, setValidationResultsMap] = useState({});
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [hasScanned, setHasScanned] = useState(() => {
        // Check if this is a browser refresh
        const isFirstLoad = sessionStorage.getItem('isFirstLoad') === null;
        
        if (isFirstLoad) {
            // This is the first load of the session
            sessionStorage.setItem('isFirstLoad', 'false');
            return false;  // Show initial message
        } else {
            // This is a refresh or subsequent load within the same session
            return localStorage.getItem('hasScanned') === 'true';
        }
    });
    const [studentBenefitsMap, setStudentBenefitsMap] = useState({});
    const [missingFolders, setMissingFolders] = useState([]);
    const [isCreatingFolders, setIsCreatingFolders] = useState(false);
    const [idToLastCheckedFolderMap, setIdToLastCheckedFolderMap] = useState({});

    // Mapping of required documents for different benefit types
    const requiredDocsMapping = {
        'Chapter 30': ['COE', 'Enrollment Manager', 'Schedule'],
        'Chapter 31': ['Enrollment Manager', 'Schedule'],
        'Chapter 33 Post 9/11': ['COE', 'Enrollment Manager', 'Schedule'],
        'Chapter 35': ['COE', 'Enrollment Manager', 'Schedule'],
        'Fed TA': ['TAR', 'Enrollment Manager', 'Schedule'],
        'State TA': ['Award Letter', 'Enrollment Manager', 'Schedule'],
        'Missouri Returning Heroes': ['DD214', 'Enrollment Manager', 'Schedule'],
        'Chapter 1606': ['COE', 'Enrollment Manager', 'Schedule'],
    };
    // Retrieve previously checked documents from local storage when the component mounts
    useEffect(() => {
        const storedCheckedDocs = localStorage.getItem('checkedDocuments');
        if (storedCheckedDocs) {
            setCheckedDocuments(JSON.parse(storedCheckedDocs));
        }
    }, []);

    // Function to standardize benefit names
    const cleanBenefit = (benefit) => {
        // Normalize benefit names to a standard format
        if (!benefit) return '';
        if (benefit.includes("Missouri Returning Heroes")) return "Missouri Returning Heroes";
        if (benefit.includes("Chapter 33 Post 9/11")) return "Chapter 33 Post 9/11";
        if (benefit.includes("Chapter 31 VocRehab")) return "Chapter 31";
        if (benefit.includes("State Tuition Assistance Deadline")) return "State TA";
        if (benefit.includes("Chapter 35")) return "Chapter 35";
        if (benefit.includes("Chapter 30 MGIB")) return "Chapter 30";
        if (benefit.includes("Federal Tuition Assistance Deadline")) return "Fed TA";
        if (benefit.includes("Chapter 1606")) return "Chapter 1606";
        return benefit;
    };

    // Check if a student has completed all required documents for their benefit
    const isStudentComplete = (studentId, benefit) => {
        const requiredDocs = requiredDocsMapping[benefit] || [];
        return requiredDocs.every(doc => {
            const scanStatus = getDocumentStatus(studentId, doc);
            return scanStatus;
        });
    };
        // Fetch student data from Excel file in SharePoint
        const fetchExcelData = async () => {
            try {
                 // Retrieve and parse Excel file from specified drive and folder
                const downloadUrl = await getExcelFileDownloadUrl(driveId, studentTrackersFolderId);
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const fileData = await blob.arrayBuffer();
                const workbook = XLSX.read(fileData);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
                const rows = json.slice(1);
                // Fetches Excel data for their name, id, and benefit
                const excelData = rows.map(row => ({
                    name: row[10],
                    studentId: row[13],
                    benefit: row[23],
                })).filter(item => item.name);
                // Update data state with parsed student data
                setData(excelData);
                // Create a mapping of student IDs to their benefits
                const benefitsMap = {};
                excelData.forEach(student => {
                    benefitsMap[student.studentId] = cleanBenefit(student.benefit || '');
                });
                setStudentBenefitsMap(benefitsMap);
                
            } catch (err) {
                setError('Failed to fetch Excel file');
            }
        };

        // Load contents of SharePoint folder path
        const loadFolderContents = async () => {
            setLoading(true);
            try {
                // Navigate through SharePoint folder hierarchy to fetch student records
                const folderId = await fetchDigitalFilingCabinetId();
                const fileCabinetId = await fetchFileCabinetId(driveId, folderId);
                const fileCabinetContents = await fetchChildren(driveId, fileCabinetId);
                setFileCabinetContents(fileCabinetContents.value);
        
                const studentRecordsId = await fetchStudentRecordsId(driveId, fileCabinetId);
                const studentRecordsChildren = await fetchChildren(driveId, studentRecordsId);
                setStudentRecordsContents(studentRecordsChildren.value);
        
                const currentStudentsId = await fetchCurrentStudentsId(driveId, studentRecordsId);
                const currentStudentsChildren = await fetchChildren(driveId, currentStudentsId);
                setCurrentStudentsContents(currentStudentsChildren.value);

                // Awaits all student folders
                await loadAllStudentFolders(currentStudentsId, currentStudentsChildren.value);
                
                setIsDataLoaded(true);
            } catch (error) {
                setError('Failed to fetch contents. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        

        const handleRefresh = async () => {
            // Set loading state to true to indicate data is being refreshed
            setLoading(true);
            setError(null);
            
            try {
                // Create copies of the current validation results and checked documents
                const previousValidationResultsMap = { ...validationResultsMap };
                const previousCheckedDocuments = { ...checkedDocuments };
                // Fetch updated data from Excel and SharePoint folder contents
                await Promise.all([
                    fetchExcelData(),
                    loadFolderContents()
                ]);
                // Reset validation results and checked documents
                setValidationResultsMap(previousValidationResultsMap);
                setCheckedDocuments(previousCheckedDocuments);
                setHasScanned(hasScanned);
            } catch (error) {
                setError('Failed to refresh data. Please try again.');
            } finally {
                // Set loading state back to false once refresh is complete
                setLoading(false);
            }
        };
    
            // Fetches the Excel and Folder data on component mount
            useEffect(() => {
                const loadInitialData = async () => {
                    if (data.length === 0) {
                        await fetchExcelData();
                    }
                    await loadFolderContents();
                };
        
                loadInitialData();
            }, []);

        // Function to load contents of a subfolder given its ID
        const loadSubFolderContents = async (subFolderId) => {
            try {
                // Fetch the contents of the subfolder from SharePoint
                const subFolderContent = await fetchChildren(driveId, subFolderId);
                // Update the state with the contents
                setSubFolderContentMap(prev => ({
                    ...prev,
                    [subFolderId]: subFolderContent.value
                }));
                // Return the subfolder contents
                return subFolderContent.value;
            } catch (error) {
                console.error(`Error loading subfolder contents for ${subFolderId}:`, error);
                return [];
            }
        };

        const loadAllStudentFolders = async (currentStudentsId, students) => {
            const newStudentFoldersMap = {}; // Map to store folder contents by student name
            const newIdToLastCheckedFolderMap = {}; // New map for Last Checked folders
            const processedFolders = new Set(); // Set to track processed student folders
            const CHUNK_SIZE = 30; // Folders processed in each batch
            const CONCURRENT_CHUNKS = 2;
            const DELAY_BETWEEN_CHUNKS = 500;
            
            try {
                // Fetch all student folders from the SharePoint drive
                const allStudentFolders = await fetchAllChildren(driveId, currentStudentsId);
                // Process student folders in batches
                for (let startIndex = 0; startIndex < allStudentFolders.value.length; startIndex += CHUNK_SIZE * CONCURRENT_CHUNKS) {
                    const chunkPromises = [];
                    for (let i = 0; i < CONCURRENT_CHUNKS; i++) {
                        const chunkStartIndex = startIndex + (i * CHUNK_SIZE);
                        if (chunkStartIndex >= allStudentFolders.value.length) break;
                        
                        const folderChunk = allStudentFolders.value.slice(
                            chunkStartIndex,
                            Math.min(chunkStartIndex + CHUNK_SIZE, allStudentFolders.value.length)
                        );
                        chunkPromises.push(processChunk(folderChunk));
                    }
                    await Promise.all(chunkPromises);
                    if (startIndex + CHUNK_SIZE * CONCURRENT_CHUNKS < allStudentFolders.value.length) {
                        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
                    }
                }
                
                // Update the state with the maps of student folders and last checked folders
                setStudentFoldersMap(newStudentFoldersMap);
                setIdToLastCheckedFolderMap(newIdToLastCheckedFolderMap);
                
                // Rest of the existing code...
            } catch (error) {
                console.error('Error in loadAllStudentFolders:', error);
                setError('Failed to load student folders. Please try again.');
                throw error;
            }
        
            async function processChunk(folderChunk) {
                return Promise.all(folderChunk.map(async (student) => {
                    try {
                        if (processedFolders.has(student.name)) return;
                        
                        // Fetch student folder contents and immediately process subfolders
                        const [studentFolderContents] = await Promise.all([
                            fetchChildren(driveId, student.id)
                        ]);
                        // Update the map with the fetched contents
                        newStudentFoldersMap[student.name] = studentFolderContents.value;
                        processedFolders.add(student.name);
        
                        // Extract student ID from the folder name
                        const studentId = student.name.split(' ').pop();
        
                        // Find the "Last Checked" folder
                        const lastCheckedFolder = studentFolderContents.value.find((folder) => 
                            folder.name.startsWith('Last Checked')
                        );
        
                        // If a "Last Checked" folder is found, add it to the map
                        if (lastCheckedFolder) {
                            newIdToLastCheckedFolderMap[studentId] = lastCheckedFolder;
                        }
            
                        // Load subfolders in parallel with controlled concurrency
                        const subfolders = studentFolderContents.value;
                        for (let i = 0; i < subfolders.length; i += CONCURRENT_CHUNKS) {
                            const subfolderBatch = subfolders.slice(i, i + CONCURRENT_CHUNKS);
                            const subfolderResults = await Promise.all(
                                subfolderBatch.map(async subfolder => {
                                    const contents = await loadSubFolderContents(subfolder.id);
                                    return { id: subfolder.id, contents };
                                })
                            );
                            
                            // Update subFolderContentMap with batch results
                            subfolderResults.forEach(({ id, contents }) => {
                                setSubFolderContentMap(prev => ({
                                    ...prev,
                                    [id]: contents
                                }));
                            });
                        }
                    } catch (error) {
                        console.error(`Error processing student folder ${student.name}:`, error);
                    }
                }));
            }
        };
        //console.log('idToLastCheckedFolderMap', idToLastCheckedFolderMap);
    // Function to validate document naming conventions for a student
    const validateNamingConventions = (studentName, subFolders) => {
        const validDocs = {
            // Initialized object to track the validity of different document types
            dd214Valid: false,
            tarValid: false,
            awardLetterValid: false,
            coeValid: false,
            emValid: false,
            schedValid: false,
        };
    
        try {
            // Extract the student ID from the student name
            const folderStudentId = studentName.split(' ').pop();
            const benefit = studentBenefitsMap[folderStudentId] || '';
            
            const [lastName, firstNameWithId] = studentName.split(', ');
            const firstName = firstNameWithId?.split(' ')?.[0];
            // Check for valid name format
            if (!lastName || !firstName) {
                console.error(`Invalid name format for student: ${studentName}`);
                return validDocs;
            }
    
            // Find the most recent folder based on numeric naming
            const mostRecentFolder = subFolders
                .filter(folder => /^\d+/.test(folder.name))
                .sort((a, b) => {
                    const aNum = parseInt(a.name.split(' ')[0], 10) || 0;
                    const bNum = parseInt(b.name.split(' ')[0], 10) || 0;
                    return bNum - aNum;
                })[0];
            // Iterate over each subfolder to check document validity
            subFolders.forEach((folder) => {
                const contents = subFolderContentMap[folder.id] || [];
    
                if (folder.name === "00") {
                    // Check documents in 00 folder based on the benefit type
                    // Checks to see if any files in 00 folder match with the expected name of the file
                    if (benefit === 'Missouri Returning Heroes') {
                        const constructedFileNameDD214 = `${lastName}, ${firstName} DD214.pdf`;
                        validDocs.dd214Valid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameDD214.toLowerCase()
                        );
                    } else if (benefit === 'Fed TA') {
                        const constructedFileNameTAR = `${lastName}, ${firstName} TAR.pdf`;
                        validDocs.tarValid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameTAR.toLowerCase()
                        );
                    } else if (benefit === 'State TA') {
                        const constructedFileNameAwardLetter = `${lastName}, ${firstName} Award Letter.pdf`;
                        validDocs.awardLetterValid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameAwardLetter.toLowerCase()
                        );
                    } else if (['Chapter 30', 'Chapter 33 Post 9/11', 'Chapter 35', 'Chapter 1606'].includes(benefit)) {
                        const constructedFileNameCOE = `${lastName}, ${firstName} COE.pdf`;
                        validDocs.coeValid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameCOE.toLowerCase()
                        );

                    }
                }
                // Check Enrollment Manager and Schedule documents in most recent folder
                // Checks to see if any files in most recent folder match with the expected name of the file
                if (mostRecentFolder && folder.id === mostRecentFolder.id) {
                    const termCode = mostRecentFolder.name.split(' ')[1];
                    const constructedFileNameEM = `${termCode} ${lastName}, ${firstName} EM.pdf`;
                    const constructedFileNameSched = `${termCode} ${lastName}, ${firstName} Sched.pdf`;
    
                    validDocs.emValid = contents.some(file =>
                        file.name.toLowerCase() === constructedFileNameEM.toLowerCase()
                    );
                    validDocs.schedValid = contents.some(file =>
                        file.name.toLowerCase() === constructedFileNameSched.toLowerCase()
                    );

                }
            });
            // Update the validation results map with the new validation status
            setValidationResultsMap(prev => ({
                ...prev,
                [folderStudentId]: validDocs
            }));

            
        } catch (error) {
            console.error(`Validation error for ${studentName}:`, error);
        }
    };

    const checkMissingFolders = () => {
        // Set of processed folder names from studentFoldersMap keys
        const processedFolders = new Set(Object.keys(studentFoldersMap));
        // Filter out students whose expected folder names are not in the processed folders
        const missingStudents = data.filter(student => {
            const expectedFolderName = `${student.name} ${student.studentId}`;
            return !processedFolders.has(expectedFolderName);
        });
        // Update the state with the list of missing student folders
        setMissingFolders(missingStudents);
    };

    const handleCreateMissingFolders = async () => {
        try {
            setIsCreatingFolders(true);
            setIsLoading(true);
            setError(null);
    
            // Get the Current Students folder ID
            const folderId = await fetchDigitalFilingCabinetId();
            const fileCabinetId = await fetchFileCabinetId(driveId, folderId);
            const studentRecordsId = await fetchStudentRecordsId(driveId, fileCabinetId);
            const currentStudentsId = await fetchCurrentStudentsId(driveId, studentRecordsId);
    
            // Create folders in batches
            const { results, errors } = await createStudentFoldersInBatches(
                driveId, 
                currentStudentsId, 
                missingFolders
            );
    
            // If there were any errors, show them to the user
            if (errors.length > 0) {
                setError(`Created ${results.length} folders. Failed to create ${errors.length} folders. Check console for details.`);
                console.error('Folder creation errors:', errors);
            } else {
                setError(null);
            }
    
            // Refresh folder contents after creating
            await loadFolderContents();
            
            // Update missing folders list
            const successfullyCreated = new Set(
                results.map(result => `${result.name}`)
            );
            
            setMissingFolders(prevMissing => 
                prevMissing.filter(student => 
                    !successfullyCreated.has(`${student.name} ${student.studentId}`)
                )
            );
    
        } catch (error) {
            console.error('Error creating missing folders:', error);
            setError('Failed to create missing folders. Please try again.');
        } finally {
            setIsCreatingFolders(false);
            setIsLoading(false);
        }
    };

    const handleScan = async () => {
        if (isDataLoaded && Object.keys(studentFoldersMap).length > 0) {
            // Clear previous validation results
            setValidationResultsMap({});
            
            // Perform new scan validation
            Object.entries(studentFoldersMap).forEach(([studentName, subFolders]) => {
                validateNamingConventions(studentName, subFolders);
            });
    
            checkMissingFolders();
    
            // Clear all manual checks and set new checked status based on scan results only
            const newCheckedDocs = {};
            
            data.forEach(student => {
                const studentId = student.studentId;
                const benefit = studentBenefitsMap[studentId] || '';
                const requiredDocs = requiredDocsMapping[benefit] || [];
                requiredDocs.forEach(docType => {
                    const docKey = `${studentId}-${docType}`;
                    const isValidFromScan = getDocumentStatus(studentId, docType);
                    if (isValidFromScan) {
                        newCheckedDocs[docKey] = true;
                    }
                });
            });

            setCheckedDocuments(newCheckedDocs);
            localStorage.setItem('checkedDocuments', JSON.stringify(newCheckedDocs));
            setHasScanned(true);
            localStorage.setItem('hasScanned', 'true');
        }
    };

    // Function to get the status of a specific document type for a student
    const getDocumentStatus = (studentId, docType) => {
        // If no scan has been performed or the student does not have validation results, return false
        if (!hasScanned || !validationResultsMap[studentId]) {
            return false;
        }
        // Retrieve the validation results for the given student ID
        const results = validationResultsMap[studentId];
        // Determines the validation status of the specified document type
        switch (docType) {
            case 'COE': return results.coeValid;
            case 'DD214': return results.dd214Valid;
            case 'TAR': return results.tarValid;
            case 'Award Letter': return results.awardLetterValid;
            case 'Enrollment Manager': return results.emValid;
            case 'Schedule': return results.schedValid;
            default: return false;
        }
    };
    // Function to filter data based on search term and completion status
    const filterData = (data, searchTerm) => {
        return data.filter(item => {
            const fullName = item.name || 'Unknown'; // Get the student's full name or default to 'Unknown'
            const studentId = item.studentId ? item.studentId.toString() : ''; // Convert student ID to string
            const benefit = studentBenefitsMap[studentId] || ''; // Get the benefit type for the student
            
            // Split full name into last name and first name
            let lastName = '';
            let firstName = fullName;
            if (fullName.includes(',')) {
                try {
                    [lastName, firstName] = fullName.split(',').map(name => name.trim()); // Create full name in "First Last" format
                } catch (error) {
                    firstName = fullName;
                    lastName = '';
                }
            }
            const fullNameFirstLast = `${firstName} ${lastName}`.trim();
            // Check if search term matches any combination of first or last name or student ID
            const matchesSearch = 
                fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (firstName && firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (lastName && lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                fullNameFirstLast.toLowerCase().includes(searchTerm.toLowerCase()) ||
                studentId.includes(searchTerm.toLowerCase());
            
            // Check if the student has all required documents
            const isComplete = isStudentComplete(studentId, benefit);
            // Return true if the search term and the completion status matches
            return matchesSearch && (showCompleted ? isComplete : !isComplete);
        });
    };
    // Filter the data based on the current search term
    const filteredData = filterData(data, searchTerm);


     // Load checked documents and dates from local storage on component mount
      useEffect(() => {
        const storedCheckedDocs = localStorage.getItem('checkedDocuments');
        if (storedCheckedDocs) {
            setCheckedDocuments(JSON.parse(storedCheckedDocs));
        }
    }, []);

    const handleCheckboxChange = (docId, studentId) => {
        setCheckedDocuments(prev => {
            // Toggle the checked state of the document
            const updatedCheckedDocs = {
                ...prev,
                [docId]: !prev[docId]
            };
            // Store the updated checked documents in local storage
            localStorage.setItem('checkedDocuments', JSON.stringify(updatedCheckedDocs));
            return updatedCheckedDocs;
        });
    };


    // Function to get counts of complete and incomplete students
    const getCompletionCounts = () => {
        // Count the number of incomplete students
        const incomplete = data.filter(item => 
            !isStudentComplete(item.studentId, studentBenefitsMap[item.studentId])
        ).length;
        // Count the number of complete students
        const complete = data.filter(item => 
            isStudentComplete(item.studentId, studentBenefitsMap[item.studentId])
        ).length;
        // Return the counts of incomplete and complete students
        return { incomplete, complete };
    };
    // Get the completion counts using the function
    const { incomplete, complete } = getCompletionCounts();

    useEffect(() => {
        // Refreshes every 5 minutes
        const REFRESH_INTERVAL = 5 * 60 * 1000;
        let intervalId;

        // Auto refresh function
        const performAutoRefresh = async () => {
            if (!loading) {
                try {
                    setLoading(true);
                    setError(null);
                    
                    // Preserve existing validation results and checked documents
                    const previousValidationResultsMap = { ...validationResultsMap };
                    const previousCheckedDocuments = { ...checkedDocuments };
                    
                    // Perform the refresh operations
                    await Promise.all([
                        fetchExcelData(),
                        loadFolderContents()
                    ]);
                    
                    // Restore previous validation results and checked documents
                    setValidationResultsMap(previousValidationResultsMap);
                    setCheckedDocuments(previousCheckedDocuments);
                    setHasScanned(hasScanned); // Preserve the previous scanned state

                } catch (error) {
                    setError('Failed to refresh data. Please try again.');
                    console.error('Automatic refresh failed:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        if (isAutoRefreshEnabled) {
            // Set up new interval only when auto-refresh is enabled
            intervalId = setInterval(performAutoRefresh, REFRESH_INTERVAL);
        }

        // Cleanup function to clear interval when component unmounts or auto-refresh is disabled
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAutoRefreshEnabled, loading, validationResultsMap, checkedDocuments, hasScanned]);

    
    const toggleAutoRefresh = () => {
        setIsAutoRefreshEnabled(prev => !prev); // Toggle the state of auto-refresh
    };
    // Lets parent components use handleScan and handleRefresh functions
    useImperativeHandle(ref, () => ({
        handleScan, // Allow navigation to trigger the scan function
        handleRefresh // Allow navigation to trigger the refresh function
    }));

    useEffect(() => {
        // Update the parent component loading state
        setIsLoading(loading);
    }, [loading, setIsLoading]);

    const handleRenameLastCheckedFolder = async (studentId) => {
        try {
            // Find the last checked folder for the specific student
            const lastCheckedFolder = idToLastCheckedFolderMap[studentId];
            
            if (!lastCheckedFolder) {
                console.error(`No Last Checked folder found for student ${studentId}`);
                return;
            }
    
            // Get current date in MM-DD format
            const today = new Date();
            const formattedDate = `${today.getMonth() + 1}-${today.getDate()}`;
            const newFolderName = `Last Checked ${formattedDate}`;
            
            // Rename the folder using the graphApiFetch function
            await renameFolderById(lastCheckedFolder.id, newFolderName);
    
            // Update the local state to reflect the new folder name
            setIdToLastCheckedFolderMap(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    name: newFolderName
                }
            }));
        } catch (error) {
            console.error(`Failed to rename Last Checked folder for Student ID ${studentId}:`, error);
            if (setError) {
                setError(`Failed to rename Last Checked folder for Student ID ${studentId}`);
            }
        }
    }; 

    return (
        <div className="secure-page">
            <div className="content">
                <img src="https://i.imgur.com/SROEj2Q.jpeg" alt="Company Logo" className="company-logo" />
                {/* Conditionally render controls and data table based on scanning status */}
                {hasScanned && (
                    <>
                <div className="header-controls">
                    <div className="view-toggle">
                        <button 
                            className={`toggle-button ${!showCompleted ? 'active' : ''}`}
                            onClick={() => setShowCompleted(false)}
                        >
                            Incomplete ({incomplete})
                        </button>
                        <button 
                            className={`toggle-button ${showCompleted ? 'active' : ''}`}
                            onClick={() => setShowCompleted(true)}
                        >
                            Complete ({complete})
                        </button>
                        <button 
                            className="auto-refresh-button"
                            onClick={toggleAutoRefresh}
                        >
                            {isAutoRefreshEnabled ? 'Disable Auto-Refresh' : 'Enable Auto-Refresh'}
                        </button>
                    </div>
                    <div>
                        <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                    </div>
                </div>
                </>
                )}
                {/* Show alert for missing student folders */}
                {hasScanned && missingFolders.length > 0 && (
                <div className="missing-folders-alert">
                    <h3>{missingFolders.length} Student Folders Not Found</h3>
                    <button 
                        onClick={handleCreateMissingFolders}
                        disabled={isCreatingFolders}
                    >
                        {isCreatingFolders ? 'Creating Folders...' : 'Create Missing Folders'}
                    </button>
                    <div className="missing-folders-list">
                        {missingFolders.map((student, index) => (
                            <div key={index}>
                                {student.name} {student.studentId}
                            </div>
                        ))}
                    </div>
                </div>
            )}
                {/* Show initial message if scan hasn't been performed */}
                {!hasScanned && (
                    <div className="initial-scan-message">
                        <h2>Welcome to the Document Tracker</h2>
                        <p>Click the "Scan" button above to view student information.</p> 
                    </div>
                )}
                 {error && <div className="error-message">{error}</div>}
                 {/* Show loading message while data is being fetched */}
                 {loading && <div className="loading-message">Loading Data...</div>}
               
                {/* Show table after scanning and when there's data */}
                {hasScanned && filteredData.length > 0 && (

                    <DataTable 
                        filteredData={filteredData}
                        studentBenefitsMap={studentBenefitsMap}
                        requiredDocsMapping={requiredDocsMapping}
                        editingBenefits={editingBenefits}
                        setEditingBenefits={setEditingBenefits}
                        checkedDocuments={checkedDocuments}
                        handleCheckboxChange={handleCheckboxChange}
                        getDocumentStatus={getDocumentStatus}
                        idToLastCheckedFolderMap={idToLastCheckedFolderMap}
                        handleRenameLastCheckedFolder={handleRenameLastCheckedFolder}
                    />
                )} 
                {/* Show message if there are no matching results */}
                {hasScanned && filteredData.length === 0 && (
                    <div className="no-data-message">
                        {searchTerm ? 'No matching results found' : 'No data available'}
                    </div>
                )}
            </div>
        </div>
    );
});

export default MergedDocumentTracker;