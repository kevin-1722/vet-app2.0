// src/components/navigation.js
import React, { useState, useEffect } from 'react';
import './navigation.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchPdfsFromFolder, getFileDownloadUrl } from './graphService';
import { driveId, siteId, programFilesFolderId } from './config';

const Navigation = ({ onScanDocuments, onRefreshData, isLoading }) => {
    // Authentication and navigation hooks
    const { isAuthenticated, logout } = useAuth();
    const [modal, setModal] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Redirect to login page if no authentication token exists
    useEffect(() => {
        const token = localStorage.getItem('token');
        const msalAccount = localStorage.getItem('msalAccount');
        if (!token && !msalAccount) {
            navigate('/'); 
        }
    }, [navigate, isAuthenticated]);

    // Handle logout process, clearing session and local storage
    const handleLogout = async () => {
        sessionStorage.removeItem('isFirstLoad');
        localStorage.removeItem('hasScanned');
        await logout();
        navigate('/');
    };

     // Open modal and fetch corresponding PDF
    const openModal = (modalName) => {
        setModal(modalName);
        fetchPdfUrl(modalName); // Fetch PDF URL based on modalName
    };

    // Clear the PDF URL when modal closes
    const closeModal = () => {
        setModal('');
        setPdfUrl('');
    };

    // Fetch the PDF URL from SharePoint based on the selected modal
    const fetchPdfUrl = async (modalName) => {
        setLoading(true); // Set loading state to true
        try {

            // Fetch PDF files from specified SharePoint folder
            const pdfs = await fetchPdfsFromFolder(siteId, driveId, programFilesFolderId);

            // Normalize the modal name to lowercase and remove spaces for matching
            const normalizedModalName = modalName.toLowerCase().replace(/\s+/g, '');

            // Find the PDF corresponding to the normalized modal (e.g., "dd214")
            const selectedPdf = pdfs.find(pdf => pdf.name.toLowerCase().replace(/\s+/g, '') === normalizedModalName + '.pdf');
            if (selectedPdf) {
                const downloadUrl = await getFileDownloadUrl(selectedPdf.parentReference.driveId, selectedPdf.id);
                // Use Google Docs Viewer to embed the PDF
                const embedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}&embedded=true`;
                setPdfUrl(embedUrl); // Set the PDF URL to display in iframe
            } else {
                console.error('PDF not found for:', normalizedModalName);
                setPdfUrl('');
            }
        } catch (error) {
            console.error('Error fetching PDF:', error);
        } finally {
            setLoading(false); // Set loading state to false
        }
    };

    // Instructions for the different document types
    const instructions = {
        coe: "Instructions for COE",
        enrollment: "Instructions for Enrollment MG",
        schedule: "Instructions for Schedule",
        dd214: "Instructions for DD214",
        tar: "Instructions for TAR",
        awardletter: "Instructions for Award Letter",
    };

    return (
        <div className="navbar">
            <div className="container">
                {/* Data refresh button with loading state */}
                <div 
                    className={`refresh-button ${isLoading ? 'loading' : ''}`} 
                    onClick={onRefreshData}
                    disabled={isLoading}
                >
                    {isLoading ? 'Refreshing...' : 'Refresh Data'}
                </div>
                 {/* Scan documents button */}
                <div className="scan-button" onClick={() => onScanDocuments()}>Scan</div> 
                {/* Document buttons for instructions on how to retrieve and name them */}
                <div className="box" onClick={() => openModal('coe')}>COE</div>
                <div className="box" onClick={() => openModal('enrollment')}>Enrollment MG</div>
                <div className="box" onClick={() => openModal('schedule')}>Schedule</div>
                <div className="box" onClick={() => openModal('dd214')}>DD214</div>
                <div className="box" onClick={() => openModal('tar')}>TAR</div>
                <div className="box" onClick={() => openModal('awardletter')}>Award Letter</div>
                {/* Logout button */}
                <div className="logout-button" onClick={handleLogout}>Logout</div>
            </div>

            {/* Modal for displaying document instructions and PDF */}
            {modal && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <span className="close" onClick={closeModal}>&times;</span>
                        <h2>{instructions[modal.toLowerCase().replace(/\s+/g, '')]}</h2> {/* Instructions display here */}
                        {/* Conditional rendering for PDF loading and display */}
                        {loading ? (
                            <p>Loading PDF...</p> 
                        ) : pdfUrl ? (
                            <iframe 
                                src={pdfUrl} 
                                width="100%" 
                                height="600px" 
                                title="PDF Viewer"
                            />
                        ) : (
                            <p>No PDF available.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navigation;