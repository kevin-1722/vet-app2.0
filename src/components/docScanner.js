// src/components/docScanner.js
import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as XLSX from 'xlsx';
import { 
    fetchDigitalFilingCabinetId, fetchChildren, fetchFileCabinetId, fetchStudentRecordsId, 
    fetchCurrentStudentsId,fetchSubFolderContents,getExcelFileDownloadUrl 
} from './graphService';
import { driveId, studentTrackersFolderId } from './config';
import Search from './search';
import DataTable from './dataTable';
import './docScanner.css';

const MergedDocumentTracker = forwardRef(({ setIsLoading }, ref) => {
    const [dateChecked, setDateChecked] = useState(() => {
        const stored = localStorage.getItem('dateChecked');
        return stored ? JSON.parse(stored) : {};
    });
    const [showCompleted, setShowCompleted] = useState(false);
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [checkedDocuments, setCheckedDocuments] = useState({});
    const [editingBenefits, setEditingBenefits] = useState({});
    const [isEditing, setIsEditing] = useState({});
    const [loading, setLoading] = useState(false);
    const [fileCabinetContents, setFileCabinetContents] = useState([]);
    const [studentRecordsContents, setStudentRecordsContents] = useState([]);
    const [currentStudentsContents, setCurrentStudentsContents] = useState([]);
    const [studentFoldersMap, setStudentFoldersMap] = useState({});
    const [subFolderContentMap, setSubFolderContentMap] = useState({}); 
    const [validationResultsMap, setValidationResultsMap] = useState({});
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);
    const [studentBenefitsMap, setStudentBenefitsMap] = useState({});

    //console.log(fileCabinetContents);
    //console.log(studentRecordsContents);
    //console.log(currentStudentsContents);

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

    useEffect(() => {
        const storedCheckedDocs = localStorage.getItem('checkedDocuments');
        if (storedCheckedDocs) {
            setCheckedDocuments(JSON.parse(storedCheckedDocs));
        }
    }, []);

    const cleanBenefit = (benefit) => {
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

    const isStudentComplete = (studentId, benefit) => {
        const requiredDocs = requiredDocsMapping[benefit] || [];
        return requiredDocs.every(doc => 
            checkedDocuments[`${studentId}-${doc}`] || getDocumentStatus(studentId, doc)
        );
    };
    
        const fetchExcelData = async () => {
            try {
                const downloadUrl = await getExcelFileDownloadUrl(driveId, studentTrackersFolderId);
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const fileData = await blob.arrayBuffer();
                const workbook = XLSX.read(fileData);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
                const rows = json.slice(1);
                const excelData = rows.map(row => ({
                    name: row[10],
                    studentId: row[13],
                    benefit: row[23],
                })).filter(item => item.name);
    
                setData(excelData);
                
                const benefitsMap = {};
                excelData.forEach(student => {
                    benefitsMap[student.studentId] = cleanBenefit(student.benefit || '');
                });
                setStudentBenefitsMap(benefitsMap);
                
            } catch (err) {
                setError('Failed to fetch Excel file');
            }
        };
    
        const loadFolderContents = async () => {
            setLoading(true);
            try {
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
    
                await loadAllStudentFolders(currentStudentsId, currentStudentsChildren.value);
                
                setIsDataLoaded(true);
            } catch (error) {
                setError('Failed to fetch contents. Please try again.');
            } finally {
                setLoading(false);
            }
        };
    
 
        const handleRefresh = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Preserve existing validation results and checked documents
                const previousValidationResultsMap = { ...validationResultsMap };
                const previousCheckedDocuments = { ...checkedDocuments };
    
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
            } finally {
                setLoading(false);
            }
        };

    
        useEffect(() => {
            if (data.length === 0) {
                fetchExcelData();
            }
        }, [data.length]);
    
        useEffect(() => {
            loadFolderContents();
        }, []);

    const loadSubFolderContents = async (subFolderId) => {
        try {
            const subFolderContent = await fetchSubFolderContents(driveId, subFolderId);
            setSubFolderContentMap(prev => ({
                ...prev,
                [subFolderId]: subFolderContent.value
            }));
            return subFolderContent.value;
        } catch (error) {
            return [];
        }
    };

    const loadAllStudentFolders = async (currentStudentsId, students) => {
        const newStudentFoldersMap = {};
        
        const loadFoldersPromises = students.map(async (student) => {
            try {
                const studentFolderContents = await fetchSubFolderContents(driveId, student.id);
                newStudentFoldersMap[student.name] = studentFolderContents.value;
    
                const subfolderPromises = studentFolderContents.value.map(subfolder => 
                    loadSubFolderContents(subfolder.id)
                );
                await Promise.all(subfolderPromises);
            } catch (error) {
                console.error(`Error processing student folder ${student.name}:`, error);
            }
        });
    
        await Promise.all(loadFoldersPromises);
        setStudentFoldersMap(newStudentFoldersMap);
    };

    const validateNamingConventions = (studentName, subFolders) => {
        const validDocs = {
            dd214Valid: false,
            tarValid: false,
            awardLetterValid: false,
            coeValid: false,
            emValid: false,
            schedValid: false,
        };
    
        try {
            const folderStudentId = studentName.split(' ').pop();
            const benefit = studentBenefitsMap[folderStudentId] || '';
            
            const [lastName, firstNameWithId] = studentName.split(', ');
            const firstName = firstNameWithId.split(' ')[0];
    
            const mostRecentFolder = subFolders
                .filter(folder => /^\d+/.test(folder.name))
                .reduce((prev, current) => {
                    const prevNum = parseInt(prev?.name.split(' ')[0], 10) || 0;
                    const currNum = parseInt(current?.name.split(' ')[0], 10) || 0;
                    return currNum > prevNum ? current : prev;
                }, subFolders.find(folder => /^\d+/.test(folder.name)));
    
            subFolders.forEach((folder) => {
                const contents = subFolderContentMap[folder.id] || [];
    
                if (folder.name === "00") {
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
    
            setValidationResultsMap(prev => ({
                ...prev,
                [folderStudentId]: validDocs
            }));
            
        } catch (error) {
            console.error(`Validation error for ${studentName}:`, error);
        }
    };

    const handleScan = async () => {
        if (isDataLoaded && Object.keys(studentFoldersMap).length > 0) {
            Object.entries(studentFoldersMap).forEach(([studentName, subFolders]) => {
                validateNamingConventions(studentName, subFolders);
            });
            const updatedCheckedDocs = { ...checkedDocuments };
            data.forEach(student => {
                const studentId = student.studentId;
                const benefit = studentBenefitsMap[studentId] || '';
                const requiredDocs = requiredDocsMapping[benefit] || [];
                requiredDocs.forEach(docType => {
                    const docKey = `${studentId}-${docType}`;
                    const isValidFromScan = getDocumentStatus(studentId, docType);
                    if (!isValidFromScan && updatedCheckedDocs[docKey]) {
                        delete updatedCheckedDocs[docKey];
                    }
                });
            });
            setCheckedDocuments(updatedCheckedDocs);
            localStorage.setItem('checkedDocuments', JSON.stringify(updatedCheckedDocs));
            setHasScanned(true);
        }
    };

    const getDocumentStatus = (studentId, docType) => {
        if (!hasScanned || !validationResultsMap[studentId]) {
            return false;
        }

        const results = validationResultsMap[studentId];
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

    const filterData = (data, searchTerm) => {
        return data.filter(item => {
            const fullName = item.name || 'Unknown';
            const studentId = item.studentId ? item.studentId.toString() : '';
            const benefit = studentBenefitsMap[studentId] || '';
            let lastName = '';
            let firstName = fullName;
            if (fullName.includes(',')) {
                try {
                    [lastName, firstName] = fullName.split(',').map(name => name.trim());
                } catch (error) {
                    firstName = fullName;
                    lastName = '';
                }
            }
            const fullNameFirstLast = `${firstName} ${lastName}`.trim();
            const matchesSearch = 
                fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (firstName && firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (lastName && lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                fullNameFirstLast.toLowerCase().includes(searchTerm.toLowerCase()) ||
                studentId.includes(searchTerm.toLowerCase());
            
            const isComplete = isStudentComplete(studentId, benefit);
            
            return matchesSearch && (showCompleted ? isComplete : !isComplete);
        });
    };

    const filteredData = filterData(data, searchTerm);



      useEffect(() => {
        const storedCheckedDocs = localStorage.getItem('checkedDocuments');
        const storedDates = localStorage.getItem('dateChecked');
        if (storedCheckedDocs) {
            setCheckedDocuments(JSON.parse(storedCheckedDocs));
        }
        if (storedDates) {
            setDateChecked(JSON.parse(storedDates));
        }
        const now = new Date();
        const updatedDates = { ...JSON.parse(storedDates || '{}') };
        Object.entries(updatedDates).forEach(([id, dateStr]) => {
            const date = new Date(dateStr);
            if ((now - date) > (2 * 24 * 60 * 60 * 1000)) {
                delete updatedDates[id];
            }
        });
        setDateChecked(updatedDates);
        localStorage.setItem('dateChecked', JSON.stringify(updatedDates));
    }, []);

        const handleCheckboxChange = (docId, studentId) => {
        setCheckedDocuments(prev => {
            const newChecked = !prev[docId];
            const updatedCheckedDocs = {
                ...prev,
                [docId]: newChecked,
            };
            if (!hasScanned || newChecked) {
                localStorage.setItem('checkedDocuments', JSON.stringify(updatedCheckedDocs));
            }
            return updatedCheckedDocs;
        });
    };

    const handleDateToggle = (studentId) => {
        setDateChecked(prev => {
            const newDates = { ...prev };
            if (newDates[studentId]) {
                delete newDates[studentId];
            } else {
                newDates[studentId] = new Date().toISOString();
            }
            localStorage.setItem('dateChecked', JSON.stringify(newDates));
            return newDates;
        });
    };

    const getCompletionCounts = () => {
        const incomplete = data.filter(item => 
            !isStudentComplete(item.studentId, studentBenefitsMap[item.studentId])
        ).length;
        
        const complete = data.filter(item => 
            isStudentComplete(item.studentId, studentBenefitsMap[item.studentId])
        ).length;

        return { incomplete, complete };
    };

    const { incomplete, complete } = getCompletionCounts();

    useEffect(() => {
        // Default to refreshing every 5 minutes (300000 milliseconds)
        const REFRESH_INTERVAL = 5 * 60 * 1000;
        let intervalId;

        // Inline refresh function
        const performAutoRefresh = async () => {
            // Check if not already loading to prevent multiple simultaneous refreshes
            if (!loading) {
                try {
                    setLoading(true);
                    setError(null);
                    setHasScanned(false);
                    setValidationResultsMap({});
                    
                    await Promise.all([
                        fetchExcelData(),
                        loadFolderContents()
                    ]);
                    setValidationResultsMap({});
                    
                    console.log('Automatic refresh completed');
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
    }, [isAutoRefreshEnabled, loading, fetchExcelData, loadFolderContents]);

    // Toggle auto-refresh
    const toggleAutoRefresh = () => {
        setIsAutoRefreshEnabled(prev => !prev);
    };

    useImperativeHandle(ref, () => ({
        handleScan,
        handleRefresh
    }));

    useEffect(() => {
        // Update the parent component about loading state
        setIsLoading(loading);
    }, [loading, setIsLoading]);

    return (
        <div className="secure-page">
            <div className="content">
                <img src="https://i.imgur.com/SROEj2Q.jpeg" alt="Company Logo" className="company-logo" />
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
                
                {error && <div className="error-message">{error}</div>}
                {loading && <div className="loading-message">Loading...</div>}
    
                {filteredData.length > 0 ? (
                    <DataTable 
                        filteredData={filteredData}
                        studentBenefitsMap={studentBenefitsMap}
                        requiredDocsMapping={requiredDocsMapping}
                        isEditing={isEditing}
                        editingBenefits={editingBenefits}
                        setEditingBenefits={setEditingBenefits}
                        checkedDocuments={checkedDocuments}
                        handleCheckboxChange={handleCheckboxChange}
                        getDocumentStatus={getDocumentStatus}
                        dateChecked={dateChecked}
                        handleDateToggle={handleDateToggle}
                    />
                ) : (
                    <div className="no-data-message">
                        {searchTerm ? 'No matching results found' : 'No data available'}
                    </div>
                )}
            </div>
        </div>
    );
});

export default MergedDocumentTracker;