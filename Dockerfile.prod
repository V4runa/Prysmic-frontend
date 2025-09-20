
  # ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files including env
COPY . .

# Ensure .env.prod is used during build
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://api.prysmic.me
ENV PORT=3000

# Build the app
RUN npm run build


# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://api.prysmic.me
ENV PORT=3000

# Copy only necessary files
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
