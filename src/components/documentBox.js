import React from 'react';
import { Check, X } from 'lucide-react';

// DocumentBox component: Renders a box for individual document with status indication
// Props: doc: Document name, isValid: Indicates if the document is considered valid, isChecked: Indicates if the document checkbox is checked
const DocumentBox = ({ doc, isValid, isChecked }) => {
    return (
        // Conditionally apply 'checked' class if document is checked
        <div className={`document-box ${isChecked ? 'checked' : ''}`}>
            {/* Display document name */}
            <span>{doc}</span>
            {/* Status icons to show document validation */}
            <div className="status-icons">
                {/* Show green checkmark if valid or checked, otherwise show red X */}
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