import React, { useEffect, useState } from 'react';
import { 
    fetchDigitalFilingCabinetId, 
    fetchChildren, 
    fetchFileCabinetId, 
    fetchStudentRecordsId, 
    fetchCurrentStudentsId,
    fetchStudentFolderId,
    fetchStudentFolderContents,
    fetchSubFolderContents 
} from './graphService';
import { driveId } from './config';

const ChannelsList = () => {
    const [children, setChildren] = useState([]);
    const [fileCabinetContents, setFileCabinetContents] = useState([]);
    const [studentRecordsContents, setStudentRecordsContents] = useState([]);
    const [currentStudentsContents, setCurrentStudentsContents] = useState([]);
    const [subFolderContents, setSubFolderContents] = useState([]); 
    const [subFolderContentMap, setSubFolderContentMap] = useState({}); 
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [validationResults, setValidationResults] = useState({});
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const studentName = "Alum, Ashley 24256308"; 

    const loadSubFolderContents = async (subFolderId) => {
        try {
            const subFolderContent = await fetchSubFolderContents(driveId, subFolderId);
            setSubFolderContentMap((prev) => ({
                ...prev,
                [subFolderId]: subFolderContent.value,
            }));
        } catch (error) {
            console.error('Error fetching subfolder contents:', error);
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

                const studentFolderId = await fetchStudentFolderId(driveId, currentStudentsId, studentName);
                const subFolderData = await fetchStudentFolderContents(driveId, studentFolderId);
                setSubFolderContents(subFolderData.value);

                await loadAllSubFolderContents(subFolderData.value);
                
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

    const loadAllSubFolderContents = async (subFolders) => {
        const fetchPromises = subFolders.map(async (subFolder) => {
            const subFolderContent = await fetchSubFolderContents(driveId, subFolder.id);
            return { id: subFolder.id, contents: subFolderContent.value };
        });

        const results = await Promise.all(fetchPromises);

        const newSubFolderContentMap = {};
        results.forEach(result => {
            newSubFolderContentMap[result.id] = result.contents;
        });

        setSubFolderContentMap(newSubFolderContentMap);
    };

    useEffect(() => {
        if (isDataLoaded && subFolderContents.length > 0 && Object.keys(subFolderContentMap).length > 0) {
            validateNamingConventions(subFolderContents);
        }
    }, [isDataLoaded, subFolderContents, subFolderContentMap]);

    const validateNamingConventions = (subFolderData) => {
        let coeValid = false;
        let emValid = false;
        let schedValid = false;

        const [lastName, firstNameWithId] = studentName.split(', ');
        const firstName = firstNameWithId.split(' ')[0];
        
        const mostRecentFolder = subFolderData.reduce((prev, current) => {
            const prevNum = parseInt(prev.name.split(' ')[0], 10);
            const currNum = parseInt(current.name.split(' ')[0], 10);
            return currNum > prevNum ? current : prev;
        });

        subFolderData.forEach((folder) => {
            const contents = subFolderContentMap[folder.id] || [];

            if (contents) {
                if (folder.name === "00") {
                    const constructedFileNameCOE = `${lastName}, ${firstName} COE.pdf`;
                    coeValid = contents.some(file => file.name === constructedFileNameCOE);
                }
                if (folder.id === mostRecentFolder.id) {
                    const constructedFileNameEM = `${mostRecentFolder.name.split(' ')[1]} ${lastName}, ${firstName} EM.pdf`;
                    emValid = contents.some(file => file.name === constructedFileNameEM);
                    const constructedFileNameSched = `${mostRecentFolder.name.split(' ')[1]} ${lastName}, ${firstName} Sched.pdf`;
                    schedValid = contents.some(file => file.name === constructedFileNameSched);
                }
            }
        });

        setValidationResults({
            coeValid,
            emValid,
            schedValid
        });
    };

    if (error) return <p>{error}</p>;
    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h2>Digital Filing Cabinet Contents</h2>
            <ul>
                {children.map((item) => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
            <h2>File Cabinet Contents</h2>
            <ul>
                {fileCabinetContents.map((item) => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
            <h2>Student Records Contents</h2>
            <ul>
                {studentRecordsContents.map((item) => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
            <h2>01 Current Students Contents</h2>
            <ul>
                {currentStudentsContents.map((student) => (
                    <li key={student.id}>
                        {student.name}
                    </li>
                ))}
            </ul>
            <h2>Subfolder Contents for {studentName}</h2>
            <ul>
                {subFolderContents.map((subFolder) => (
                    <li key={subFolder.id}>
                        {subFolder.name}
                        <button onClick={() => loadSubFolderContents(subFolder.id)}>
                            View Contents
                        </button>
                        {subFolderContentMap[subFolder.id] && (
                            <ul>
                                {subFolderContentMap[subFolder.id].map((content) => (
                                    <li key={content.id}>{content.name}</li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
            <h2>Validation Results</h2>
            <ul>
                <li>COE: {validationResults.coeValid ? 'Yes' : 'No'}</li>
                <li>Enrollment Manager: {validationResults.emValid ? 'Yes' : 'No'}</li>
                <li>Schedule: {validationResults.schedValid ? 'Yes' : 'No'}</li>
            </ul>
        </div>
    );
};

export default ChannelsList;
