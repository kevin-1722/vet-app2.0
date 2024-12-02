import React from 'react';
import DocumentBox from './documentBox';

// Data table renders a table of veteran students for document tracking
// Handles display of student information, required documents, and document status
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
            {/* Table headers for student information */}
            <thead>
                <tr>
                    <th className="red-header">Name</th>
                    <th className="red-header">Student ID</th>
                    <th className="red-header">Benefit</th>
                    <th className="red-header">Required Documents</th>
                </tr>
            </thead>
            <tbody>
                 {/* Map through filtered veteran data to create table rows */}
                {filteredData.map((veteran, index) => {
                    // Retrieve benefit for the current student
                    const benefit = studentBenefitsMap[veteran.studentId] || '';
                    // Get list of required documents for the student's benefit
                    const requiredDocs = requiredDocsMapping[benefit] || [];

                    return (
                        <tr key={index}>
                            <td>{veteran.name}</td>
                            <td>{veteran.studentId}</td>
                            <td>
                                <span>{benefit}</span>
                            </td>
                            <td>
                                {/* Container for document tracking and status */}
                                <div className="document-container">
                                    {/* Checkboxes for document selection */}
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
                                    {/* Document boxes showing validation status */}
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
                                    {/* Date tracking for to verify the last day documents were checked */}
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