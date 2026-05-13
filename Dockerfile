FROM node:22-slim

WORKDIR /app

# Browser dependencies for Puppeteer PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 \
    libasound2 libpangocairo-1.0-0 libxss1 libgtk-3-0 \
    libxshmfence1 libglu1-mesa chromium \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# NODE_OPTIONS=--experimental-sqlite was set when the app ran on node:sqlite.
# After the Postgres migration the app uses node-postgres (`pg`); no flag needed.
# The SQLite seed-migration script still uses node:sqlite, but it runs on a
# developer machine (not inside this container), so the flag does not belong here.

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
