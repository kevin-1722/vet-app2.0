import React from 'react';


const VeteranTable = () => {
    const [validationResults, setValidationResults] = useState({});
    
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

export default VeteranTable;