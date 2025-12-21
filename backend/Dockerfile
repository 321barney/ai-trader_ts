# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for build (python/make/g++ sometimes needed for native modules)
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (Railway will set PORT env var)
EXPOSE 3001

# Start command
CMD ["npm", "start"]
