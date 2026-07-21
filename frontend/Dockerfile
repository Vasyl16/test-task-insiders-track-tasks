FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# --host so Vite binds to all interfaces - by default it only listens on
# localhost, which isn't reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
