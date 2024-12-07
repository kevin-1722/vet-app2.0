# Veterans Center Web Application

The Veterans Center web application enhances and streamlines processes at UMSL’s Veterans Center. It complements existing systems by focusing on key information and providing targeted data from the RFC spreadsheet, enabling workers to efficiently manage individual certification tasks.

## Features
- **Microsoft Graph API Integration**: Fetches data from SharePoint and Excel.
- **Secure Authentication**: Implements MSAL OAuth 2.0 flow for secure access.
- **Automated Folder Management**:
  - Creates new SharePoint folders for veterans listed in the Excel file but lacking a folder.
  - Updates folders with the latest access date to ensure all workers are aligned.
- **Document Management**:
  - Scans SharePoint folders using naming logic to identify required documents for the selected benefits.
  - Updates the application's document status based on scan results.
- **Student Search**: Allows workers to search for students by name or ID, reducing manual effort.
- **Quick Reference Guides**: Provides essential details about required documents for student certification.

## Benefits
This application improves the efficiency and accuracy of the document collection process at UMSL’s Veterans Center by:
- Automating repetitive steps.
- Delivering relevant information in an organized manner.
- Ensuring certification tasks are completed effectively and efficiently.
