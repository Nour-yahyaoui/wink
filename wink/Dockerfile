# W.I.N.K — zero-dependency app server
# Base image: official Node LTS slim (no npm install needed — server has zero deps)
FROM node:20-alpine

# production-safe container defaults
ENV NODE_ENV=production
WORKDIR /app

# copy only the server + static frontend (no data dir → fresh seed on first boot)
COPY server.js package.json ./
COPY public ./public

# data directory is created by the server at boot; mount a volume for persistence:
#   docker run -v $(pwd)/data:/app/data ...
RUN mkdir -p /app/data

# run as a non-root user (least privilege)
RUN addgroup -S wink && adduser -S wink -G wink && chown -R wink:wink /app
USER wink

EXPOSE 8000

# health check against the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
