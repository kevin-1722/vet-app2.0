import React, { useEffect, useState } from 'react';
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

const ScanTest = () => {
    const [validationResults, setValidationResults] = useState({});
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
                
                // Create a map of student IDs to their cleaned benefits
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

    useEffect(() => {
        if (isDataLoaded && Object.keys(studentFoldersMap).length > 0 && Object.keys(subFolderContentMap).length > 0) {
            console.log("Starting validation for all students...");
            Object.entries(studentFoldersMap).forEach(([studentName, subFolders]) => {
                validateNamingConventions(studentName, subFolders);
            });
        }
    }, [isDataLoaded, studentFoldersMap, subFolderContentMap]);

    const validateNamingConventions = (studentName, subFolders) => {
        console.log(`Starting validation for ${studentName}...`, { subFolders });
        let coeValid = false;
        let emValid = false;
        let schedValid = false;
        let specialDocValid = false;

        try {
            const studentId = studentName.split(' ').pop();
            // Get the cleaned benefit
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

            console.log(`Most recent folder for ${studentName}:`, mostRecentFolder);

            subFolders.forEach((folder) => {
                const contents = subFolderContentMap[folder.id] || [];
                console.log(`Checking folder ${folder.name} contents:`, contents);

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
                    benefit // Store the cleaned benefit
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

    const handleScanClick = (studentId) => {
        const studentName = excelData.find(student => student.studentId === studentId)?.name;
        if (studentName) {
            validateNamingConventions(studentName, studentFoldersMap[studentName] || []);
        }
    };
    
    useEffect(() => {
        if (Object.keys(validationResultsMap).length > 0) {
            setValidationResults(validationResultsMap);
        }
    }, [validationResultsMap]);

    if (error) return <p>{error}</p>;
    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h2>Veteran Records</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th>Last Name, First Name</th>
                        <th>Student ID</th>
                        <th>Benefit</th>
                        <th>Required Documents</th>
                    </tr>
                </thead>
                <tbody>
                    {excelData.map((student, index) => {
                        const { name, studentId, benefit } = student;
                        const requiredDocs = requiredDocsMapping[cleanBenefit(benefit)] || [];
                        const validation = validationResults[name] || {};

                        return (
                            <tr key={index}>
                                <td>{name}</td>
                                <td>{studentId}</td>
                                <td>{cleanBenefit(benefit)}</td>
                                <td>
                                    {requiredDocs.map((doc, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                                            <span>{doc}</span>
                                            <input
                                                type="checkbox"
                                                checked={validation[`${doc.toLowerCase()}Valid`] || false}
                                                readOnly
                                                style={{ marginLeft: '5px' }}
                                            />
                                        </div>
                                    ))}
                                </td>
                                <td>
                                    <button onClick={() => handleScanClick(studentId)}>Scan</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

    export default ScanTest;