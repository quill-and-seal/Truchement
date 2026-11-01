FROM node:22-alpine
WORKDIR /app
COPY server.mjs .
USER node
EXPOSE 8787
HEALTHCHECK CMD wget -qO- http://localhost:8787/health || exit 1
CMD ["node", "server.mjs"]
