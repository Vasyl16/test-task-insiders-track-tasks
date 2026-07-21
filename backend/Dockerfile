FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Client generation isn't hooked into `npm ci` (no postinstall script) and
# can't run at build time either - prisma.config.ts resolves DATABASE_URL
# eagerly, which only exists once the container actually starts.
CMD ["sh", "-c", "npx prisma generate && npm run start:dev"]
