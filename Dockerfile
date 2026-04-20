# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies strictly from lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Run Vite build for client and server (Vue SSR bundle)
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Stage 2: Production Image
FROM node:22-alpine

WORKDIR /app

# Copy production manifest and lockfiles
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy SSR artifacts
COPY --from=builder /app/dist ./dist

# Copy backend source code which is loaded directly by Node at runtime
COPY --from=builder /app/src ./src

ARG GIT_HASH=unknown
ARG BUILD_TIME=unknown
ENV GIT_HASH=${GIT_HASH}
ENV BUILD_TIME=${BUILD_TIME}

# Set default port
ENV PORT=7160
EXPOSE 7160

# Run monolithic Express + Vue SSR server
CMD ["npm", "run", "serve"]
