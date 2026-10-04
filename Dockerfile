# 1. Build the static site (glibc-based image: TypeScript 7 and Vite ship native binaries)
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Serve it — the lab is pure frontend, so nginx is all we need
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
