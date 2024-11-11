import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { 
    Button,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography
} from '@mui/material';
import { 
    fetchDigitalFilingCabinetId, 
    fetchChildren, 
    fetchFileCabinetId, 
    fetchStudentRecordsId, 
    fetchCurrentStudentsId,
    fetchSubFolderContents,
    getExcelFileDownloadUrl 
} from './graphService';
import { driveId, studentTrackersFolderId } from './config';
import * as XLSX from 'xlsx';


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

const DocumentStatus = ({ isPresent }) => {
    console.log('Rendering DocumentStatus component with isPresent:', isPresent);
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPresent ? (
                <Check style={{ width: '16px', height: '16px', color: '#22c55e' }} />
            ) : (
                <X style={{ width: '16px', height: '16px', color: '#ef4444' }} />
            )}
        </span>
    );
};

const Testing = () => {
    // Log initial component render
    console.log('Initializing Veterans Document Tracker component');

    const [showTable, setShowTable] = useState(false);
    const [children, setChildren] = useState([]);
    const [fileCabinetContents, setFileCabinetContents] = useState([]);
    const [studentRecordsContents, setStudentRecordsContents] = useState([]);
    const [currentStudentsContents, setCurrentStudentsContents] = useState([]);
    const [studentFoldersMap, setStudentFoldersMap] = useState({});
    const [subFolderContentMap, setSubFolderContentMap] = useState({}); 
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validationResultsMap, setValidationResultsMap] = useState({});
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [studentBenefitsMap, setStudentBenefitsMap] = useState({});
    const [hasScanned, setHasScanned] = useState(false);
    const [studentNameToIdMap, setStudentNameToIdMap] = useState({});

    const cleanBenefit = (benefit) => {
        console.log('Cleaning benefit:', benefit);
        const cleanedBenefit = !benefit ? '' :
            benefit.includes("Missouri Returning Heroes") ? "Missouri Returning Heroes" :
            benefit.includes("Chapter 33 Post 9/11") ? "Chapter 33 Post 9/11" :
            benefit.includes("Chapter 31 VocRehab") ? "Chapter 31" :
            benefit.includes("State Tuition Assistance Deadline") ? "State TA" :
            benefit.includes("Chapter 35") ? "Chapter 35" :
            benefit.includes("Chapter 30 MGIB") ? "Chapter 30" :
            benefit.includes("Federal Tuition Assistance Deadline") ? "Fed TA" :
            benefit.includes("Chapter 1606") ? "Chapter 1606" :
            benefit;
        console.log('Cleaned benefit:', cleanedBenefit);
        return cleanedBenefit;
    };

    useEffect(() => {
        console.log('Starting Excel file fetch effect');
        const getExcelFile = async () => {
            try {
                console.log('Fetching Excel file download URL');
                const downloadUrl = await getExcelFileDownloadUrl(driveId, studentTrackersFolderId);
                console.log('Download URL received:', downloadUrl);

                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const data = await blob.arrayBuffer();
                console.log('Excel file data received');

                const workbook = XLSX.read(data);
                const sheetName = workbook.SheetNames[0];
                console.log('Processing worksheet:', sheetName);

                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                console.log('Total rows in Excel:', json.length);

                const rows = json.slice(1);
                const excelData = rows.map(row => ({
                    name: row[10],
                    studentId: row[13],
                    benefit: row[23],
                })).filter(item => item.name);

                console.log('Processed Excel data:', excelData);
                setExcelData(excelData);
                
                const benefitsMap = {};
                const nameToIdMap = {};
                excelData.forEach(student => {
                    benefitsMap[student.studentId] = cleanBenefit(student.benefit || '');
                    nameToIdMap[student.name] = student.studentId;
                });
                console.log('Generated benefits map:', benefitsMap);
                console.log('Generated name-to-ID map:', nameToIdMap);
                
                setStudentBenefitsMap(benefitsMap);
                setStudentNameToIdMap(nameToIdMap);
                
            } catch (err) {
                console.error('Error in Excel file processing:', err);
                setError('Failed to fetch Excel file');
            }
        };

        if (excelData.length === 0) {
            getExcelFile();
        }
    }, [excelData.length]);

    const loadSubFolderContents = async (subFolderId) => {
        console.log('Loading contents for subfolder:', subFolderId);
        try {
            const subFolderContent = await fetchSubFolderContents(driveId, subFolderId);
            console.log('Subfolder contents:', subFolderContent.value);
            setSubFolderContentMap(prev => ({
                ...prev,
                [subFolderId]: subFolderContent.value
            }));
            return subFolderContent.value;
        } catch (error) {
            console.error('Error loading subfolder contents:', error);
            return [];
        }
    };

    const loadAllStudentFolders = async (currentStudentsId, students) => {
        console.log('Starting to load all student folders');
        console.log('Total students to process:', students.length);
        
        const newStudentFoldersMap = {};
        
        for (const student of students) {
            try {
                console.log('Processing student folder:', student.name);
                const studentFolderContents = await fetchSubFolderContents(driveId, student.id);
                console.log('Student folder contents:', studentFolderContents.value);
                newStudentFoldersMap[student.name] = studentFolderContents.value;
                
                for (const subfolder of studentFolderContents.value) {
                    console.log('Loading subfolder:', subfolder.name);
                    await loadSubFolderContents(subfolder.id);
                }
            } catch (error) {
                console.error(`Error processing student ${student.name}:`, error);
            }
        }
        
        console.log('Completed loading all student folders');
        setStudentFoldersMap(newStudentFoldersMap);
        return newStudentFoldersMap;
    };

    const validateNamingConventions = (studentName, subFolders) => {
        console.log('Starting validation for student:', studentName);
        console.log('Subfolders to validate:', subFolders);

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
            
            console.log('Student ID:', folderStudentId);
            console.log('Benefit type:', benefit);

            const [lastName, firstNameWithId] = studentName.split(', ');
            const firstName = firstNameWithId.split(' ')[0];
            console.log('Parsed name:', { lastName, firstName });
    
            const mostRecentFolder = subFolders
                .filter(folder => /^\d+/.test(folder.name))
                .reduce((prev, current) => {
                    const prevNum = parseInt(prev?.name.split(' ')[0], 10) || 0;
                    const currNum = parseInt(current?.name.split(' ')[0], 10) || 0;
                    return currNum > prevNum ? current : prev;
                }, subFolders.find(folder => /^\d+/.test(folder.name)));
            
            console.log('Most recent folder:', mostRecentFolder);
    
            subFolders.forEach((folder) => {
                console.log('Checking folder:', folder.name);
                const contents = subFolderContentMap[folder.id] || [];
                console.log('Folder contents:', contents);
    
                if (folder.name === "00") {
                    if (benefit === 'Missouri Returning Heroes') {
                        const constructedFileNameDD214 = `${lastName}, ${firstName} DD214.pdf`;
                        validDocs.dd214Valid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameDD214.toLowerCase()
                        );
                        console.log('DD214 validation:', { expected: constructedFileNameDD214, valid: validDocs.dd214Valid });
                    } else if (benefit === 'Fed TA') {
                        const constructedFileNameTAR = `${lastName}, ${firstName} TAR.pdf`;
                        validDocs.tarValid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameTAR.toLowerCase()
                        );
                        console.log('TAR validation:', { expected: constructedFileNameTAR, valid: validDocs.tarValid });
                    } else if (benefit === 'State TA') {
                        const constructedFileNameAwardLetter = `${lastName}, ${firstName} Award Letter.pdf`;
                        validDocs.awardLetterValid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameAwardLetter.toLowerCase()
                        );
                        console.log('Award Letter validation:', { expected: constructedFileNameAwardLetter, valid: validDocs.awardLetterValid });
                    } else if (['Chapter 30', 'Chapter 33 Post 9/11', 'Chapter 35', 'Chapter 1606'].includes(benefit)) {
                        const constructedFileNameCOE = `${lastName}, ${firstName} COE.pdf`;
                        validDocs.coeValid = contents.some(file =>
                            file.name.toLowerCase() === constructedFileNameCOE.toLowerCase()
                        );
                        console.log('COE validation:', { expected: constructedFileNameCOE, valid: validDocs.coeValid });
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
                    
                    console.log('EM validation:', { expected: constructedFileNameEM, valid: validDocs.emValid });
                    console.log('Schedule validation:', { expected: constructedFileNameSched, valid: validDocs.schedValid });
                }
            });
    
            console.log('Final validation results for student:', { studentId: folderStudentId, results: validDocs });
            setValidationResultsMap(prev => ({
                ...prev,
                [folderStudentId]: validDocs
            }));
            
        } catch (error) {
            console.error(`Validation error for ${studentName}:`, error);
        }
    };

    const handleScan = async () => {
        console.log('Starting document scan');
        console.log('Data loaded status:', isDataLoaded);
        console.log('Student folders available:', Object.keys(studentFoldersMap).length);

        if (isDataLoaded && Object.keys(studentFoldersMap).length > 0) {
            Object.entries(studentFoldersMap).forEach(([studentName, subFolders]) => {
                console.log('Validating student:', studentName);
                validateNamingConventions(studentName, subFolders);
            });
            setHasScanned(true);
            setShowTable(true);
            console.log('Scan completed');
        } else {
            console.log('Scan skipped - data not ready');
        }
    };

    const getDocumentStatus = (studentId, docType) => {
        console.log('Checking document status:', { studentId, docType });
        
        if (!hasScanned || !validationResultsMap[studentId]) {
            console.log('Status check skipped - not scanned or no validation results');
            return false;
        }

        const results = validationResultsMap[studentId];
        let status = false;

        switch (docType) {
            case 'COE':
                status = results.coeValid;
                break;
            case 'DD214':
                status = results.dd214Valid;
                break;
            case 'TAR':
                status = results.tarValid;
                break;
            case 'Award Letter':
                status = results.awardLetterValid;
                break;
            case 'Enrollment Manager':
                status = results.emValid;
                break;
            case 'Schedule':
                status = results.schedValid;
                break;
            default:
                status = false;
        }

        console.log('Document status result:', { studentId, docType, status });
        return status;
    };

    useEffect(() => {
        console.log('Starting folder contents loading effect');
        const loadFolderContents = async () => {
            setLoading(true);
            try {
                console.log('Fetching Digital Filing Cabinet ID');
                const folderId = await fetchDigitalFilingCabinetId();
                console.log('Digital Filing Cabinet ID:', folderId);
                const childrenData = await fetchChildren(driveId, folderId);
                console.log('Children data retrieved:', childrenData.value.length, 'items');
                setChildren(childrenData.value);

                console.log('Fetching File Cabinet ID');
                const fileCabinetId = await fetchFileCabinetId(driveId, folderId);
                console.log('File Cabinet ID:', fileCabinetId);
                const fileCabinetChildren = await fetchChildren(driveId, fileCabinetId);
                console.log('File Cabinet contents:', fileCabinetChildren.value.length, 'items');
                setFileCabinetContents(fileCabinetChildren.value);

                console.log('Fetching Student Records ID');
                const studentRecordsId = await fetchStudentRecordsId(driveId, fileCabinetId);
                console.log('Student Records ID:', studentRecordsId);
                const studentRecordsChildren = await fetchChildren(driveId, studentRecordsId);
                console.log('Student Records contents:', studentRecordsChildren.value.length, 'items');
                setStudentRecordsContents(studentRecordsChildren.value);

                console.log('Fetching Current Students ID');
                const currentStudentsId = await fetchCurrentStudentsId(driveId, studentRecordsId);
                console.log('Current Students ID:', currentStudentsId);
                const currentStudentsChildren = await fetchChildren(driveId, currentStudentsId);
                console.log('Current Students contents:', currentStudentsChildren.value.length, 'items');
                setCurrentStudentsContents(currentStudentsChildren.value);

                console.log('Loading all student folders');
                await loadAllStudentFolders(currentStudentsId, currentStudentsChildren.value);
                console.log('All student folders loaded');
                
                setIsDataLoaded(true);
                console.log('Data loading completed successfully');
            } catch (error) {
                console.error('Error in loadFolderContents:', error);
                setError('Failed to fetch contents. Please try again.');
            } finally {
                setLoading(false);
                console.log('Loading state set to false');
            }
        };

        loadFolderContents();
    }, []);

    // Log state changes
    useEffect(() => {
        console.log('State Update - Student Folders Map:', Object.keys(studentFoldersMap).length, 'students');
    }, [studentFoldersMap]);

    useEffect(() => {
        console.log('State Update - Subfolder Content Map:', Object.keys(subFolderContentMap).length, 'subfolders');
    }, [subFolderContentMap]);

    useEffect(() => {
        console.log('State Update - Validation Results:', Object.keys(validationResultsMap).length, 'results');
    }, [validationResultsMap]);

    useEffect(() => {
        console.log('State Update - Excel Data:', excelData.length, 'records');
    }, [excelData]);

    if (error) {
        console.log('Rendering error state:', error);
        return <Typography color="error">{error}</Typography>;
    }
    if (loading) {
        console.log('Rendering loading state');
        return <Typography>Loading...</Typography>;
    }

    console.log('Rendering main component');
    return (
        <Card sx={{ width: '100%' }}>
            <CardContent sx={{ padding: 3 }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                }}>
                    <Typography variant="h5" component="h2">
                        Veteran Document Tracker
                    </Typography>
                    <Button 
                        variant="contained"
                        onClick={() => {
                            console.log('Scan button clicked');
                            console.log('Data loaded status:', isDataLoaded);
                            handleScan();
                        }}
                        disabled={!isDataLoaded}
                        sx={{ backgroundColor: '#1976d2' }}
                    >
                        Scan Documents
                    </Button>
                </div>
                
                {showTable && (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Student ID</TableCell>
                                    <TableCell>Benefit</TableCell>
                                    <TableCell>Required Documents</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {excelData.map((student) => {
                                    console.log('Rendering row for student:', student.name);
                                    const benefit = studentBenefitsMap[student.studentId] || '';
                                    const requiredDocs = requiredDocsMapping[benefit] || [];
                                    console.log('Student documents:', {
                                        name: student.name,
                                        id: student.studentId,
                                        benefit: benefit,
                                        requiredDocs: requiredDocs
                                    });
                                    
                                    return (
                                        <TableRow key={student.studentId}>
                                            <TableCell>{student.name}</TableCell>
                                            <TableCell>{student.studentId}</TableCell>
                                            <TableCell>{benefit}</TableCell>
                                            <TableCell>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {requiredDocs.map((doc) => {
                                                        const status = getDocumentStatus(student.studentId, doc);
                                                        console.log('Document status:', {
                                                            student: student.name,
                                                            document: doc,
                                                            status: status
                                                        });
                                                        return (
                                                            <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <DocumentStatus isPresent={status} />
                                                                <span>{doc}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
};

export default Testing;