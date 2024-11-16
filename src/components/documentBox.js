import React from 'react';
import { Check, X } from 'lucide-react';

const DocumentBox = ({ doc, isValid, isChecked }) => {
    return (
        <div className={`document-box ${isChecked ? 'checked' : ''}`}>
            <span>{doc}</span>
            <div className="status-icons">
                {(isValid || isChecked) ? (
                    <Check className="status-icon valid" />
                ) : (
                    <X className="status-icon invalid" />
                )}
            </div>
        </div>
    );
};

export default DocumentBox;