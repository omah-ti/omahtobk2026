# # Build stage
# FROM node:23-alpine3.21 AS base

# # Set the working directory inside the container
# WORKDIR /app
# RUN npm i -g pnpm

# # Copy only the package.json and pnpm-lock.yaml first for efficient caching
# COPY package.json pnpm-lock.yaml ./

# # Install dependencies
# RUN corepack enable && pnpm install --frozen-lockfile

# # Copy the rest of the frontend code
# COPY . .

# # Production stage
# FROM node:23-alpine3.21 AS release

# WORKDIR /app
# RUN npm i -g pnpm

# # Copy from base stage
# COPY --from=base /app/node_modules ./node_modules
# COPY --from=base /app/package.json ./package.json
# COPY --from=base /app/.next ./.next
# COPY --from=base /app/src ./src
# COPY --from=base /app .

# # Expose the default Next.js dev server port (change if needed)
# EXPOSE 3000

# # Start the dev server
# CMD ["pnpm", "dev"]

FROM node:23-alpine3.21

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

COPY . .

EXPOSE 3001

CMD ["pnpm", "dev"]