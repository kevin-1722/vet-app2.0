import React from 'react';
// Allows the user to search for veterans
const Search = ({ searchTerm, setSearchTerm }) => {
    return (
        <div className="search-container">
            {/* Input field for typing */}
            <input
                type="text"
                className="search-input"
                placeholder="Search for veteran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} // Update the search term state on input change
            />
            {/* Button to clear input */}
            <button 
                className="clear-button"
                onClick={() => setSearchTerm('')} // Clear the search term when the button is clicked
            >
                x
            </button>
        </div>
    );
};

export default Search;