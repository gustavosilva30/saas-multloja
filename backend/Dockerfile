# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install LibreOffice for document conversion (Word to PDF)
RUN apk add --no-cache \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    && rm -rf /var/cache/apk/*

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist

# Create uploads and temp directories
RUN mkdir -p /app/uploads /tmp

# Non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
