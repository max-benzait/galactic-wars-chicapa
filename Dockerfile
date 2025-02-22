# Start from an official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for better build caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy all remaining source files
COPY . .

# Use port 8080 by default for Cloud Run
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["npm", "start"]