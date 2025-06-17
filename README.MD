Identity Reconciliation Service
This project is a Node.js backend service designed to handle customer identity reconciliation. It exposes a single API endpoint, /identify, that receives customer contact information (email and/or phone number) and consolidates it into a single identity record, linking multiple contact entries together.

The service is built with a focus on data integrity, using database transactions to handle complex scenarios like merging two previously separate customer identities into one.

Live Demo
The service is deployed on Render and can be accessed at the following URL:
https://identity-reconciliation-service-y5ds.onrender.com

Features
Identity Consolidation: Links multiple contact entries based on a shared email or phone number.

Primary/Secondary Linking: Designates the oldest contact record as "primary" and subsequent linked records as "secondary".

Atomic Operations: Uses database transactions to ensure that complex updates (like merging two identities) are performed safely, preventing data corruption.

Scalable Architecture: Separates web layer concerns from business logic for better maintainability.

Tech Stack
Backend: Node.js with TypeScript

Web Framework: Express.js

Database: PostgreSQL (managed via Supabase)

Database Client: @supabase/supabase-js

API Endpoint
POST /identify
This is the sole endpoint of the service. It identifies a customer based on the provided contact information, creates or updates contact records, and returns the consolidated contact profile.

Request Body
The request body must be a JSON object containing either an email, a phoneNumber, or both.

{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}

Success Response (Status 200 OK)
The response payload contains the consolidated contact information.

{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary-email@example.com", "secondary-email@example.com"],
    "phoneNumbers": ["1234567890", "0987654321"],
    "secondaryContactIds": [23, 45, 67]
  }
}

primaryContactId: The ID of the oldest contact record in the group.

emails: An array of all unique emails associated with this identity. The primary contact's email is listed first.

phoneNumbers: An array of all unique phone numbers associated with this identity. The primary contact's phone number is listed first.

secondaryContactIds: An array of IDs for all other contact records linked to this primary contact.

Testing the Live Endpoint
You can test the deployed endpoint using curl or any API client like Postman.

Test 1: Create a new primary contact
curl -X POST https://identity-reconciliation-service-y5ds.onrender.com/identify \
-H "Content-Type: application/json" \
-d '{
      "email": "lorraine@hillvalley.edu",
      "phoneNumber": "123456"
    }'

Test 2: Create a secondary contact linked to the first
curl -X POST https://identity-reconciliation-service-y5ds.onrender.com/identify \
-H "Content-Type: application/json" \
-d '{
      "email": "mcfly@hillvalley.edu",
      "phoneNumber": "123456"
    }'

Test 3: Merge two separate contacts
(Assuming a separate primary contact with phone "987654" already exists)

curl -X POST https://identity-reconciliation-service-y5ds.onrender.com/identify \
-H "Content-Type: application/json" \
-d '{
      "email": "mcfly@hillvalley.edu",
      "phoneNumber": "987654"
    }'

Local Development Setup
Follow these instructions to set up and run the project locally.

Prerequisites
Node.js (v14 or higher recommended)

npm (Node Package Manager)

A free Supabase account for the PostgreSQL database.

1. Database Setup
Log in to your Supabase project dashboard.

Navigate to the SQL Editor.

Execute the SQL scripts provided during the step-by-step guide. This will create the Contact table, necessary types, indexes, and the transactional function required for merging contacts.

2. Environment Variables
Create a file named .env in the root of the project directory for local development.

Add your Supabase credentials. You can find these in your Supabase dashboard under Project Settings > API.

SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

Note: The PORT is managed by the hosting service (like Render) in production environments.

3. Install Dependencies
Navigate to the project's root directory in your terminal and run:

npm install

4. Run the Server Locally
To start the development server, run:

npm start

The server will be available at http://localhost:3000 (or the port you define).

Architectural Decisions
Service Layer: All business logic is encapsulated within src/services/contactService.ts. This separates the core logic from the web-facing parts of the application (src/index.ts), making the code easier to test, maintain, and reason about.

Database Transactions via RPC: The most complex operation—merging two contact groups—is handled by a single PostgreSQL function (update_and_merge_contacts) which is called as a Remote Procedure Call (RPC) from Supabase. This ensures the entire operation is atomic: it either completes fully or not at all, guaranteeing data integrity and preventing race conditions. This approach is also more performant as it reduces multiple network round-trips between the application and the database into a single call.