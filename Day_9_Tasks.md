# Day 9: File Uploads & Attachments (Cloudinary & Multer)

## Overview
On Day 9, we implemented the ability for users to attach files (images, PDFs, documents) to tasks. Rather than storing these files locally on our backend server—which is bad for scalability and performance—we stream them directly to **Cloudinary**, a robust cloud media storage provider.

## Technologies Used
- **Multer:** Express middleware for handling `multipart/form-data` (file uploads).
- **Cloudinary:** Cloud storage provider for hosting the uploaded files.
- **multer-storage-cloudinary:** A Multer storage engine that streams uploads directly from the client to Cloudinary without writing them to the backend's local disk.
- **Socket.IO:** Real-time synchronization to instantly update the task drawer for all users when an attachment is added or removed.

## What Was Built

### Backend
1. **Cloudinary Configuration (`src/config/cloudinary.js`):** Setup the Cloudinary V2 SDK using the credentials stored in our `.env` file.
2. **Upload Middleware (`src/middlewares/upload.middleware.js`):** Configured Multer to intercept file uploads. It validates the file type, restricts file sizes (e.g., max 5MB), and pipes the stream directly to Cloudinary.
3. **Task Service (`src/services/task.service.js`):** 
   - `addAttachment()`: Pushes the Cloudinary URL, public ID, and file metadata into the task's `attachments` array.
   - `deleteAttachment()`: Calls Cloudinary's API to physically delete the file from the cloud, and then removes the reference from the task array.
4. **Task Routes (`src/routes/task.routes.js`):**
   - `POST /api/v1/tasks/:taskId/attachments`
   - `DELETE /api/v1/tasks/:taskId/attachments/:attachmentId`

### Frontend
1. **TaskAttachments Component (`src/components/board/TaskAttachments.js`):** A dedicated UI inside the Task Detail Drawer to display existing attachments and provide a "Click to Upload" file input.
2. **Optimistic Updates (`src/store/boardStore.js`):** When a user uploads or deletes a file, the Zustand store immediately updates the task's attachment array locally so the UI feels perfectly responsive.

## Configuration (Environment Variables)
To make this work, the backend `.env` requires:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Real-Time Synchronization Bug Fix
During implementation, we encountered a bug where the Task Drawer wasn't updating properly after a file was deleted. We resolved this by ensuring `boardStore.updateTaskLocally()` deeply clones and syncs both the main `tasks` array AND the active `taskDrawer.task` object simultaneously.
