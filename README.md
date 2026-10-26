@"
# Ajaia Docs Backend

## Installation

1. Install Node.js and MongoDB Atlas access.
2. Install dependencies:

   npm install

3. Create a .env file using .env.example and configure your MongoDB connection string and required environment variables.
4. Start the development server:

   npm run dev

5. Run tests:

   npm test

## Deployment

Deploy the backend as a Render Web Service.

- Build Command: npm install
- Start Command: npm start
- Root Directory: Backend/server

Configure environment variables in the Render dashboard. Never commit your .env file or database credentials.
"@ | Set-Content README.md
