# Base Image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files (from backend only)
COPY package*.json ./
COPY tsconfig.json ./
# Copy schema for build if needed (assuming schema is inside src)
# If schema is outside, adjustments may be needed. Here we assume standard structure.

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY .env.example ./.env

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start command
CMD ["npm", "start"]
