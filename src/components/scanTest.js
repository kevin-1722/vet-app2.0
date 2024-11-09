import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react'; //npm install lucide-react
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
} from '@mui/material'; //npm install @mui/material @emotion/react @emotion/styled
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

const DocumentStatus = ({ isPresent }) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isPresent ? (
            <Check style={{ width: '16px', height: '16px', color: '#22c55e' }} />
        ) : (
            <X style={{ width: '16px', height: '16px', color: '#ef4444' }} />
        )}
    </span>
);

const Testing = () => {
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

    const cleanBenefit = (benefit) => {
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

    const getCleanedBenefits = (benefits) => {
        if (typeof benefits !== 'string') return '';
        return benefits.split(';').map(benefit => cleanBenefit(benefit.trim())).filter(Boolean).join('; ');
    };

    useEffect(() => {
        const getExcelFile = async () => {
            try {
                const downloadUrl = await getExcelFileDownloadUrl(driveId, studentTrackersFolderId);
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const data = await blob.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const rows = json.slice(1);
                const excelData = rows.map(row => ({
                    name: row[10], // Last Name, First Name
                    studentId: row[13],
                    benefit: row[23],
                })).filter(item => item.name);

                setExcelData(excelData);
                
                const benefitsMap = {};
                excelData.forEach(student => {
                    benefitsMap[student.studentId] = cleanBenefit(student.benefit || '');
                });
                setStudentBenefitsMap(benefitsMap);
                
            } catch (err) {
                console.error('Error fetching Excel file:', err);
                setError('Failed to fetch Excel file');
            }
        };

        if (excelData.length === 0) {
            getExcelFile();
        }
    }, [excelData.length]);

    const loadSubFolderContents = async (subFolderId) => {
        try {
            const subFolderContent = await fetchSubFolderContents(driveId, subFolderId);
            setSubFolderContentMap(prev => ({
                ...prev,
                [subFolderId]: subFolderContent.value
            }));
            return subFolderContent.value;
        } catch (error) {
            console.error('Error fetching subfolder contents:', error);
            return [];
        }
    };

    const loadAllStudentFolders = async (currentStudentsId, students) => {
        console.log("Loading all student folders...");
        const newStudentFoldersMap = {};
        
        for (const student of students) {
            try {
                console.log(`Fetching subfolders for student: ${student.name}`);
                const studentFolderContents = await fetchSubFolderContents(driveId, student.id);
                newStudentFoldersMap[student.name] = studentFolderContents.value;
                console.log(`Subfolders found for ${student.name}:`, studentFolderContents.value);

                for (const subfolder of studentFolderContents.value) {
                    await loadSubFolderContents(subfolder.id);
                }
            } catch (error) {
                console.error(`Error processing student folder ${student.name}:`, error);
            }
        }
        
        setStudentFoldersMap(newStudentFoldersMap);
    };

    const validateNamingConventions = (studentName, subFolders) => {
        console.log(`Starting validation for ${studentName}...`, { subFolders });
        let coeValid = false;
        let emValid = false;
        let schedValid = false;
        let specialDocValid = false;

        try {
            const studentId = studentName.split(' ').pop();
            const rawBenefit = studentBenefitsMap[studentId] || '';
            const benefit = cleanBenefit(rawBenefit);
            
            console.log(`Validating student ${studentName} with ID ${studentId} and cleaned benefit ${benefit}`);

            const requiredDocs = requiredDocsMapping[benefit] || [];
            console.log(`Required documents for ${benefit}:`, requiredDocs);

            const [lastName, firstNameWithId] = studentName.split(', ');
            const firstName = firstNameWithId.split(' ')[0];

            const mostRecentFolder = subFolders
                .filter(folder => /^\d+/.test(folder.name))
                .reduce((prev, current) => {
                    const prevNum = parseInt(prev.name.split(' ')[0], 10) || 0;
                    const currNum = parseInt(current.name.split(' ')[0], 10) || 0;
                    return currNum > prevNum ? current : prev;
                }, subFolders.find(folder => /^\d+/.test(folder.name)));

            subFolders.forEach((folder) => {
                const contents = subFolderContentMap[folder.id] || [];

                if (folder.name === "00") {
                    if (benefit === 'Missouri Returning Heroes') {
                        const constructedFileNameDD214 = `${lastName}, ${firstName} DD214.pdf`;
                        specialDocValid = contents.some(file => 
                            file.name.toLowerCase() === constructedFileNameDD214.toLowerCase()
                        );
                        coeValid = specialDocValid;
                    } else if (benefit === 'Fed TA') {
                        const constructedFileNameTAR = `${lastName}, ${firstName} TAR.pdf`;
                        specialDocValid = contents.some(file => 
                            file.name.toLowerCase() === constructedFileNameTAR.toLowerCase()
                        );
                        coeValid = specialDocValid;
                    } else if (benefit === 'State TA') {
                        const constructedFileNameAwardLetter = `${lastName}, ${firstName} Award Letter.pdf`;
                        specialDocValid = contents.some(file => 
                            file.name.toLowerCase() === constructedFileNameAwardLetter.toLowerCase()
                        );
                        coeValid = specialDocValid;
                    } else if (['Chapter 30', 'Chapter 33 Post 9/11', 'Chapter 35', 'Chapter 1606'].includes(benefit)) {
                        const constructedFileNameCOE = `${lastName}, ${firstName} COE.pdf`;
                        coeValid = contents.some(file => 
                            file.name.toLowerCase() === constructedFileNameCOE.toLowerCase()
                        );
                    }
                }

                if (mostRecentFolder && folder.id === mostRecentFolder.id) {
                    const termCode = mostRecentFolder.name.split(' ')[1];
                    const constructedFileNameEM = `${termCode} ${lastName}, ${firstName} EM.pdf`;
                    const constructedFileNameSched = `${termCode} ${lastName}, ${firstName} Sched.pdf`;

                    emValid = contents.some(file => 
                        file.name.toLowerCase() === constructedFileNameEM.toLowerCase()
                    );
                    schedValid = contents.some(file => 
                        file.name.toLowerCase() === constructedFileNameSched.toLowerCase()
                    );
                }
            });

            setValidationResultsMap(prev => ({
                ...prev,
                [studentName]: { 
                    coeValid, 
                    emValid, 
                    schedValid,
                    benefit
                }
            }));
            console.log(`Validation results for ${studentName}:`, { 
                benefit,
                coeValid, 
                emValid, 
                schedValid 
            });

        } catch (error) {
            console.error(`Error validating naming conventions for ${studentName}:`, error);
        }
    };

    const handleScan = async () => {
        if (isDataLoaded && Object.keys(studentFoldersMap).length > 0) {
            Object.entries(studentFoldersMap).forEach(([studentName, subFolders]) => {
                validateNamingConventions(studentName, subFolders);
            });
            setHasScanned(true);
        }
    };

    const getDocumentStatus = (studentName, docType) => {
        if (!hasScanned || !validationResultsMap[studentName]) return false;
        
        const results = validationResultsMap[studentName];
        switch (docType) {
            case 'COE':
            case 'DD214':
            case 'TAR':
            case 'Award Letter':
                return results.coeValid;
            case 'Enrollment Manager':
                return results.emValid;
            case 'Schedule':
                return results.schedValid;
            default:
                return false;
        }
    };

    useEffect(() => {
        const loadFolderContents = async () => {
            setLoading(true);
            try {
                const folderId = await fetchDigitalFilingCabinetId();
                const childrenData = await fetchChildren(driveId, folderId);
                setChildren(childrenData.value);

                const fileCabinetId = await fetchFileCabinetId(driveId, folderId);
                const fileCabinetChildren = await fetchChildren(driveId, fileCabinetId);
                setFileCabinetContents(fileCabinetChildren.value);

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
                console.error('Error fetching contents:', error);
            } finally {
                setLoading(false);
            }
        };

        loadFolderContents();
    }, []);

    if (error) return <Typography color="error">{error}</Typography>;
    if (loading) return <Typography>Loading...</Typography>;

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
                        onClick={handleScan}
                        disabled={!isDataLoaded}
                        sx={{ backgroundColor: '#1976d2' }}
                    >
                        Scan Documents
                    </Button>
                </div>
                
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
                                const benefit = studentBenefitsMap[student.studentId] || '';
                                const requiredDocs = requiredDocsMapping[benefit] || [];
                                
                                return (
                                    <TableRow key={student.studentId}>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>{student.studentId}</TableCell>
                                        <TableCell>{benefit}</TableCell>
                                        <TableCell>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {requiredDocs.map((doc) => (
                                                    <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <DocumentStatus 
                                                            isPresent={getDocumentStatus(student.name, doc)} 
                                                        />
                                                        <span>{doc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
};

export default Testing;