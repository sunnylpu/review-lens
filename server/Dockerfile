# Production Dockerfile for ReviewLens Express Backend
FROM node:22-alpine AS runner

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose API Port
EXPOSE 5001

ENV NODE_ENV=production
ENV PORT=5001

CMD ["node", "index.js"]
