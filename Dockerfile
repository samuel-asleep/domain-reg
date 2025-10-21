FROM node:20-alpine AS base

WORKDIR /app

RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS production

WORKDIR /app

RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser

COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "app.js"]
