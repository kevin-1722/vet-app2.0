The Veterans Center web application is designed to complement and streamline existing processes at UMSL’s Veterans Center. 
It does not replace current systems but enhances process efficiency by narrowing in on key information and providing targeted data from the RFC spreadsheet.
This allows workers to access and manage only the information necessary for individual certification tasks.  
This is designed to make it easier to view and understand relevant student data and clearly display the standing of the certification process. 

This application utilizes Microsoft Graph API to fetch data from Sharepoint and Excel.
It has quality security through the MSAL OAuth 2.0 flow. 
The Veterans Center application has the capabilities to create new folders in Sharepoint for veterans that are on the Excel but do not have a folder.
It updates specific folders with the current date so that all workers are on the same page of when the last time a student's documents were checked.
The app performs specific naming logic to determine which documents are currently present inside of Sharepoint for that student's benefit that they chose.
The required documents status is changed on the application depending on the results of the scan.
The user is able to search up students by either their name or ID to reduce manual searching.
There are quick reference guides for the workers to use to get essential details about the document that may be required for student certification. 

This application is designed to improve the efficiency and accuracy of the document collection process at UMSL’s Veterans Center. 
By automating several steps and providing only relevant information to users, the web application creates an organized document gathering process and ensures that certification tasks are completed effectively and efficiently.
