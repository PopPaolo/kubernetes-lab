FROM node:24-alpine AS build

WORKDIR /app

# Install all dependencies in the build stage so TypeScript can compile.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Reinstall production dependencies only to keep the runtime image smaller.
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

USER node

# Compose overrides this command for the worker service.
CMD ["npm", "run", "start:api"]
