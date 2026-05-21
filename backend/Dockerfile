FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

CMD ["sh", "-c", "npx prisma migrate deploy && node src/utils/seed.js && node src/app.js"]
