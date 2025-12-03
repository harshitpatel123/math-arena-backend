# Use official Node LTS image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY src ./src

# Expose backend port (adjust if different)
EXPOSE 4000

# Start command
CMD ["node", "src/server.js"]
