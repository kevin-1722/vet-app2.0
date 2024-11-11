// src/components/Navigation.js
import React, { useState, useEffect } from 'react';
import './navigation.css';
//import { msalInstance } from './msalInstance';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchPdfsFromFolder, getFileDownloadUrl } from './graphService';

const Navigation = () => {
    const { isAuthenticated, logout } = useAuth();
    const [modal, setModal] = useState('');
    const [pdfs, setPdfs] = useState([]);
    const [pdfUrl, setPdfUrl] = useState(''); // State for PDF URL
    const [loading, setLoading] = useState(false); // For loading state
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const msalAccount = localStorage.getItem('msalAccount');
        if (!token && !msalAccount) {
            navigate('/'); 
        }
    }, [navigate, isAuthenticated]);

    //const handleLogout = async () => {
        //localStorage.removeItem('token'); 
        //localStorage.removeItem('msalAccount'); 
        //localStorage.removeItem('excelData');
        //navigate('/'); 
    //};

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const openModal = (modalName) => {
        setModal(modalName);
        fetchPdfUrl(modalName); // Fetch PDF URL based on modalName
    };

    const closeModal = () => {
        setModal('');
        setPdfUrl(''); // Clear the PDF URL when modal closes
    };

    // Fetch the PDF URL from SharePoint based on the selected modal
    const fetchPdfUrl = async (modalName) => {
        setLoading(true); // Set loading state to true
        try {
            const siteId = 'quadrigisduo.sharepoint.com,39eaa12d-014c-4efc-929f-af7186f3d4b6,af41b481-5f9d-4cc7-9eae-dac87b2f033e'; // Your site ID
            const driveId = 'b!LaHqOUwB_E6Sn69xhvPUtoG0Qa-dX8dMnq7ayHsvAz4uxaEhOaTLQ7K-kDZ2Itwf'; // Your drive ID
            const programFilesFolderId = '01WZNNVP5M4B3WJJNEHJCJKBZ7XZADQWA2'; // Program files folder ID

            // Fetch PDF files from SharePoint
            const pdfs = await fetchPdfsFromFolder(siteId, driveId, programFilesFolderId);

            // Log all PDFs to verify what is being fetched
            console.log('Fetched PDFs:', pdfs);

            // Normalize the modal name to lowercase and remove spaces for matching
            const normalizedModalName = modalName.toLowerCase().replace(/\s+/g, '');

            // Find the PDF corresponding to the normalized modal (e.g., "dd214")
            const selectedPdf = pdfs.find(pdf => pdf.name.toLowerCase().replace(/\s+/g, '') === normalizedModalName + '.pdf');

            // Log selected file and its name to help debug
            console.log('Selected PDF:', selectedPdf);

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

    // Instructions for the different modals
    const instructions = {
        scan: "Instructions for Scan",
        coe: "Instructions for COE",
        enrollment: "Instructions for Enrollment MG",
        schedule: "Instructions for Schedule",
        dd214: "Instructions for DD214",
        tar: "Instructions for TAR",
        awardletter: "Instructions for Award Letter", // Ensure consistent key naming
    };

    return (
        <div className="navbar">
            <div className="container">
                <div className="box box-scan" onClick={() => openModal('scan')}>Scan</div>
                <div className="box" onClick={() => openModal('coe')}>COE</div>
                <div className="box" onClick={() => openModal('enrollment')}>Enrollment MG</div>
                <div className="box" onClick={() => openModal('schedule')}>Schedule</div>
                <div className="box" onClick={() => openModal('dd214')}>DD214</div>
                <div className="box" onClick={() => openModal('tar')}>TAR</div>
                <div className="box" onClick={() => openModal('awardletter')}>Award Letter</div>
                <div className="logout-button" onClick={handleLogout}>Logout</div>
            </div>

            {modal && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <span className="close" onClick={closeModal}>&times;</span>
                        {/* Use .toLowerCase() to normalize the modal name and access instructions */}
                        <h2>{instructions[modal.toLowerCase().replace(/\s+/g, '')]}</h2> {/* Instructions display here */}

                        {loading ? (
                            <p>Loading PDF...</p>  // Loading message
                        ) : pdfUrl ? (
                            <iframe 
                                src={pdfUrl} 
                                width="100%" 
                                height="500px" 
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