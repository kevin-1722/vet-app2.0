// src/components/Navigation.js
import React, { useState, useEffect } from 'react';
import './navigation.css';
import { useNavigate } from 'react-router-dom';

const Navigation = () => {
    const [modal, setModal] = useState('');
    const [pdfs, setPdfs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const msalAccount = localStorage.getItem('msalAccount');
        if (!token && !msalAccount) {
            navigate('/'); 
        }
    }, [navigate]);

    const handleLogout = async () => {
        localStorage.removeItem('token'); 
        localStorage.removeItem('msalAccount'); 
        localStorage.removeItem('excelData');
        navigate('/'); 
    };

    const openModal = (modalName) => {
        setModal(modalName);
        if (modalName === 'schedule') {
            fetchPdfs();
        }
    };

    const closeModal = () => {
        setModal('');
        setPdfs([]); 
    };

    const fetchPdfs = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/pdfs');
            const data = await response.json();
            setPdfs(data.length > 0 ? data : []);
        } catch (error) {
            console.error('Error fetching PDFs:', error);
        }
    };

    const instructions = {
        scan: "Instructions for Scan",
        coe: "Instructions for COE",
        enrollment: "Instructions for Enrollment MG",
        schedule: "Instructions for Schedule",
        dd214: "Instructions for DD214",
        tar: "Instructions for TAR",
        awardLetter: "Instructions for Award Letter",
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
                <div className="box" onClick={() => openModal('awardLetter')}>Award Letter</div>
                <div className="logout-button" onClick={handleLogout}>Logout</div>
            </div>

            {modal && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <span className="close" onClick={closeModal}>&times;</span>
                        <h2>{instructions[modal]}</h2>
                        {modal === 'schedule' && (
                            <div>
                                {pdfs.length > 0 ? (
                                    pdfs.map((pdf, index) => (
                                        <iframe
                                            key={index}
                                            src={`http://localhost:3000/${pdf.filePath}`}
                                            width="100%"
                                            height="600px"
                                            title={`PDF ${index + 1}`}
                                        ></iframe>
                                    ))
                                ) : (
                                    <p>No PDFs available.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navigation;