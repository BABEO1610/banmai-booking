FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy only manifests first so dependency installation stays cacheable.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci --omit=dev --workspace server --include-workspace-root=false

COPY server ./server
COPY shared ./shared

RUN mkdir -p /app/server/.data/media \
  && chown -R node:node /app

USER node
WORKDIR /app/server
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
