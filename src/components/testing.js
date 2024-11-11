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
        
        const loadFoldersPromises = students.map(async (student) => {
            try {
                console.log(`Fetching subfolders for student: ${student.name}`);
                const studentFolderContents = await fetchSubFolderContents(driveId, student.id);
                newStudentFoldersMap[student.name] = studentFolderContents.value;
                console.log(`Subfolders found for ${student.name}:`, studentFolderContents.value);
    
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

    if (error) return <p>{error}</p>;
    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h2>Current Students and Their Folders</h2>
            {currentStudentsContents.map((student) => (
                <div key={student.id}>
                    <h3>{student.name}</h3>
                    <p>Benefit: {validationResultsMap[student.name]?.benefit || 'Loading...'}</p>
                    <ul>
                        {studentFoldersMap[student.name]?.map((subfolder) => (
                            <li key={subfolder.id}>
                                {subfolder.name}
                                <button onClick={() => loadSubFolderContents(subfolder.id)}>
                                    View Contents
                                </button>
                                {subFolderContentMap[subfolder.id] && (
                                    <ul>
                                        {subFolderContentMap[subfolder.id].map((content) => (
                                            <li key={content.id}>{content.name}</li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                    <h4>Validation Results</h4>
                    <ul>
                        <li>{validationResultsMap[student.name]?.benefit === 'Missouri Returning Heroes' ? 'DD214' :
                            validationResultsMap[student.name]?.benefit === 'Fed TA' ? 'TAR' :
                            validationResultsMap[student.name]?.benefit === 'State TA' ? 'Award Letter' :
                            'COE'}: {validationResultsMap[student.name]?.coeValid ? 'Yes' : 'No'}</li>
                        <li>Enrollment Manager: {validationResultsMap[student.name]?.emValid ? 'Yes' : 'No'}</li>
                        <li>Schedule: {validationResultsMap[student.name]?.schedValid ? 'Yes' : 'No'}</li>
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default Testing;