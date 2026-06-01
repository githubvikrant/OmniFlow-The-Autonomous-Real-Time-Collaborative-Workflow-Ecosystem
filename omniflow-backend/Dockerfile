FROM node:22-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the backend source code
COPY . .

# Expose the backend port
EXPOSE 5000

# Start the Node.js Express server
CMD ["npm", "start"]
