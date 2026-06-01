# OmniFlow 🌊
**The Autonomous Real-Time Collaborative Workflow Ecosystem**

OmniFlow is a powerful, real-time Kanban project management tool built to rival Trello and Jira. It features live drag-and-drop synchronization, live user presence, secure authentication, file attachments, and AI-powered task generation.

![OmniFlow Interface](https://img.shields.io/badge/Status-Active_Development-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Features

- **Real-Time Collaboration:** Every drag, drop, and edit is synced instantly across all connected users via WebSockets.
- **Live Presence Indicators:** See exactly who is actively viewing your board right now.
- **Secure Authentication:** Robust JWT-based email/password authentication alongside seamless Google OAuth integration.
- **AI Task Generation:** Type a high-level goal (e.g., "Build a landing page") and let Google Gemini AI instantly break it down into actionable tasks.
- **File Attachments:** Upload images, PDFs, and documents directly to tasks via Cloudinary cloud streaming.
- **Dockerized Deployments:** Fully containerized architecture using Docker and Docker Compose for painless production deployments.

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js (App Router)
- **State Management:** Zustand
- **Drag & Drop:** `@dnd-kit/core`
- **Real-Time:** Socket.IO Client
- **Styling:** Vanilla CSS / Modern UI Aesthetics

### Backend
- **Environment:** Node.js & Express.js
- **Database:** MongoDB & Mongoose
- **Real-Time:** Socket.IO Server
- **Authentication:** Passport.js (Google OAuth 2.0), JWT (Access & Refresh Tokens), bcrypt
- **File Storage:** Multer & Cloudinary
- **AI Integration:** Google Gen AI SDK (`gemini-2.5-flash`)

## 💻 Getting Started (Local Development)

### Prerequisites
- Node.js (v22+)
- MongoDB Atlas (or local MongoDB)
- Google Cloud Console (OAuth Credentials)
- Cloudinary Account
- Google AI Studio (Gemini API Key)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/OmniFlow-The-Autonomous-Real-Time-Collaborative-Workflow-Ecosystem.git
cd OmniFlow-The-Autonomous-Real-Time-Collaborative-Workflow-Ecosystem
```

### 2. Setup the Backend
```bash
cd omniflow-backend
npm install
```
Create an `.env` file in the `omniflow-backend` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI
GEMINI_API_KEY=your_gemini_key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```
Start the backend server:
```bash
npm run dev
```

### 3. Setup the Frontend
Open a new terminal window:
```bash
cd omniflow-frontend
npm install
```
Create an `.env.local` file in the `omniflow-frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```
Start the Next.js development server:
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser to start using OmniFlow!

## 🐳 Docker Deployment

To spin up the entire application (both frontend and backend) with Docker:
1. Ensure Docker and Docker Compose are installed.
2. Configure your `omniflow-backend/.env` file.
3. Run the following command in the root directory:
```bash
docker-compose up --build -d
```

## ☁️ Cloud Deployment (Vercel & Render)
For a free cloud deployment without Docker, please see the included `Deployment_Guide.md` for step-by-step instructions on hosting the backend on Render and the frontend on Vercel.
