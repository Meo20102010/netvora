FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

RUN mkdir -p storage/videos storage/images storage/receipts storage/backups

EXPOSE 8080

CMD npx prisma db push --skip-generate && node dist/index.js
