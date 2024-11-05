import React, { useState, useEffect } from 'react'; 
import { getExcelFileDownloadUrl } from './graphService';
import { driveId, studentTrackersFolderId } from './config';
import * as XLSX from 'xlsx';
import Search from './searchfunction';
import './checklist.css';

const SecurePage = () => {
    const [data, setData] = useState(() => {
        // Initialize state from localStorage
        const storedData = localStorage.getItem('excelData');
        return storedData ? JSON.parse(storedData) : [];
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [editingBenefits, setEditingBenefits] = useState({});
    const [isEditing, setIsEditing] = useState({});
    const [checkedDocuments, setCheckedDocuments] = useState({});

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
        //const driveId = 'b!LaHqOUwB_E6Sn69xhvPUtoG0Qa-dX8dMnq7ayHsvAz4uxaEhOaTLQ7K-kDZ2Itwf';
        //const studentTrackersFolderId = '01WZNNVP23EWLU4M4YXVE2ULM75ROI4H4N';

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
                    name: row[10], // Assuming this is the "Last Name, First Name" column
                    studentId: row[13],
                    benefit: row[23],
                })).filter(item => item.name);
                
                setData(excelData);
                localStorage.setItem('excelData', JSON.stringify(excelData)); // Store data in localStorage
            } catch (err) {
                console.error('Error fetching Excel file:', err);
                setError('Failed to fetch Excel file');
            }
        };
        if (data.length === 0) {
            getExcelFile();
        }
    }, [data.length]);

    const filteredData = data.filter(item => {
        const fullName = item.name || 'Unknown';
        const [lastName, firstName] = fullName.split(',').map(name => name.trim());
        const studentId = item.studentId ? item.studentId.toString() : ''; // Ensure studentId is a string

        return (
            firstName.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
            lastName.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
            studentId.startsWith(searchTerm.toLowerCase()) // Search by student ID
        );
    });

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

    const getRequiredDocs = (benefitString) => {
        if (typeof benefitString !== 'string') return [];
        const benefits = benefitString.split(';').map(benefit => benefit.trim());
        const requiredDocsSet = new Set();
        benefits.forEach(benefit => {
            const cleanedBenefit = cleanBenefit(benefit);
            const docs = requiredDocsMapping[cleanedBenefit];
            if (docs) docs.forEach(doc => requiredDocsSet.add(doc));
        });
        return Array.from(requiredDocsSet);
    };


    // Initialize checked documents state from localStorage
    useEffect(() => {
        const storedCheckedDocs = localStorage.getItem('checkedDocuments');
        if (storedCheckedDocs) {
            setCheckedDocuments(JSON.parse(storedCheckedDocs));
        }
    }, []);

    const handleCheckboxChange = (docId, studentId) => {
        setCheckedDocuments(prev => {
            const newChecked = !prev[docId] ? true : false;
            const updatedCheckedDocs = {
                ...prev,
                [docId]: newChecked,
            };
            // Update localStorage
            localStorage.setItem('checkedDocuments', JSON.stringify(updatedCheckedDocs));
            return updatedCheckedDocs;
        });
    };

    const updateDate = (studentID) => {
        const dateBox = document.getElementById(`date-checked-${studentID}`);
        const checkbox = document.getElementById(`date-${studentID}`);
        const currentDate = new Date().toLocaleString('default', { month: '2-digit', day: '2-digit' });

        if (checkbox.checked) {
            dateBox.textContent = currentDate;
        } else {
            dateBox.textContent = '';
        }
    };

    const toggleEditBenefits = (studentId) => {
        setIsEditing(prev => ({ ...prev, [studentId]: !prev[studentId] }));
        if (isEditing[studentId]) {
            setEditingBenefits(prev => ({ ...prev, [studentId]: undefined }));
        } else {
            const currentBenefits = filteredData.find(veteran => veteran.studentId === studentId).benefit;
            const cleanedBenefits = getCleanedBenefits(currentBenefits).split('; ');
            setEditingBenefits(prev => ({ ...prev, [studentId]: cleanedBenefits }));
        }
    };

    const handleBenefitChange = (studentId, benefit) => {
        setEditingBenefits(prev => {
            const current = prev[studentId] || [];
            if (current.includes(benefit)) {
                return { ...prev, [studentId]: current.filter(b => b !== benefit) };
            } else {
                return { ...prev, [studentId]: [...current, benefit] };
            }
        });
    };

    const handleSaveBenefits = (studentId) => {
        const selectedBenefits = editingBenefits[studentId] || [];
        const updatedBenefitString = selectedBenefits.join('; ');
    
        // Update the original data with the new benefits
        setData(prevData => 
            prevData.map(veteran => 
                veteran.studentId === studentId ? { ...veteran, benefit: updatedBenefitString } : veteran
            )
        );
    
        // Reset the editing state
        setIsEditing(prev => ({ ...prev, [studentId]: false }));
        setEditingBenefits(prev => ({ ...prev, [studentId]: undefined }));
    };

    return (
        <div className="secure-page">
            <div className="content">
                <img src="https://i.imgur.com/SROEj2Q.jpeg" alt="Company Logo" className="company-logo" />
                <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                {error && <div className="error-message">{error}</div>}
                {filteredData.length > 0 ? (
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
                                const requiredDocs = getRequiredDocs(isEditing[veteran.studentId] ? editingBenefits[veteran.studentId].join('; ') : veteran.benefit);

                                return (
                                    <tr key={index}>
                                        <td>{`${veteran.name.split(',')[1].trim()} ${veteran.name.split(',')[0].trim()}`}</td>
                                        <td>{veteran.studentId}</td>
                                        <td>
                                            {isEditing[veteran.studentId] ? (
                                                <div className="benefits-container">
                                                    {['Chapter 30', 'Chapter 31', 'Chapter 33 Post 9/11', 'Chapter 35', 'Fed TA', 'State TA', 'Missouri Returning Heroes', 'Chapter 1606'].map((benefit) => (
                                                        <div key={benefit}>
                                                            <input
                                                                type="checkbox"
                                                                id={`${benefit}-${veteran.studentId}`}
                                                                checked={editingBenefits[veteran.studentId]?.includes(benefit) || false}
                                                                onChange={() => handleBenefitChange(veteran.studentId, benefit)}
                                                            />
                                                            <label htmlFor={`${benefit}-${veteran.studentId}`} className="benefit-label" >{benefit}</label>
                                                        </div>
                                                    ))}
                                                    <button className="save-button" onClick={() => handleSaveBenefits(veteran.studentId)}>Save</button>
                                                    <button className="cancel-button" onClick={() => toggleEditBenefits(veteran.studentId)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div>
                                                    {getCleanedBenefits(veteran.benefit)}
                                                    <button className="edit-button" onClick={() => toggleEditBenefits(veteran.studentId)}>Edit</button>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {requiredDocs.length > 0 ? (
                                                requiredDocs.map((doc, docIndex) => (
                                                    <div key={docIndex} className="checkbox-container">
                                                        <input
                                                            type="checkbox"
                                                            id={`${doc}-${veteran.studentId}`}
                                                            checked={checkedDocuments[`${doc}-${veteran.studentId}`] || false}
                                                            onChange={() => handleCheckboxChange(`${doc}-${veteran.studentId}`, `box-${doc}-${veteran.studentId}`)}
                                                        />
                                                        <label htmlFor={`${doc}-${veteran.studentId}`}>Added</label>
                                                        <div className={`benefit-box ${checkedDocuments[`${doc}-${veteran.studentId}`] ? 'active' : ''}`} id={`box-${doc}-${veteran.studentId}`}>
                                                            <span>{doc}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div>No documents required</div>
                                            )}
                                            {/* Date Checked section */}
                                            <div className="date-container">
                                                <input
                                                        type="checkbox"
                                                        id={`date-${veteran.studentId}`}
                                                        onChange={() => updateDate(veteran.studentId)}
                                                />
                                                <label htmlFor={`date-${veteran.studentId}`}>Date Checked</label>
                                                <div className="date-box" id={`date-box-${veteran.studentId}`}>
                                                    <span className="date-checked" id={`date-checked-${veteran.studentId}`}></span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div>Loading data...</div>
                )}
            </div>
        </div>
    );
};

export default SecurePage;
