import React from 'react';
import DocumentBox from './documentBox';

const DataTable = ({ 
    filteredData, 
    studentBenefitsMap, 
    requiredDocsMapping,
    checkedDocuments,
    handleCheckboxChange,
    getDocumentStatus,
    dateChecked,
    handleDateToggle
}) => {
    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th className="red-header">Name</th>
                    <th className="red-header">Student ID</th>
                    <th className="red-header">Benefit</th>
                    <th className="red-header">Required Documents</th>
                </tr>
            </thead>
            <tbody>
                {filteredData.map((veteran, index) => {
                    const benefit = studentBenefitsMap[veteran.studentId] || '';
                    const requiredDocs = requiredDocsMapping[benefit] || [];

                    return (
                        <tr key={index}>
                            <td>{veteran.name}</td>
                            <td>{veteran.studentId}</td>
                            <td>
                                <span>{benefit}</span>
                            </td>
                            <td>
                                <div className="document-container">
                                    <div className="checkbox-column">
                                        {requiredDocs.map((doc, docIndex) => (
                                            <input
                                                key={docIndex}
                                                type="checkbox"
                                                checked={checkedDocuments[`${veteran.studentId}-${doc}`] || getDocumentStatus(veteran.studentId, doc)}
                                                onChange={() => handleCheckboxChange(`${veteran.studentId}-${doc}`, veteran.studentId)}
                                            />
                                        ))}
                                    </div>
                                    <div className="documents-column">
                                        {requiredDocs.map((doc, docIndex) => {
                                            const isValid = getDocumentStatus(veteran.studentId, doc);
                                            const isChecked = checkedDocuments[`${veteran.studentId}-${doc}`] || isValid;
                                            return (
                                                <DocumentBox
                                                    key={docIndex}
                                                    doc={doc}
                                                    isValid={isValid}
                                                    isChecked={isChecked}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="date-container">
                                        <input
                                            type="checkbox"
                                            checked={!!dateChecked[veteran.studentId]}
                                            onChange={() => handleDateToggle(veteran.studentId)}
                                        />
                                        <span className="date-text">
                                            Date: {dateChecked[veteran.studentId] && 
                                                new Date(dateChecked[veteran.studentId]).toLocaleDateString('en-US', {
                                                    month: 'numeric',
                                                    day: 'numeric'
                                                })
                                            }
                                        </span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};
export default DataTable;