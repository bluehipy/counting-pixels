FROM node:22-alpine

WORKDIR /app
COPY package.json server.js challenges.js index.html styles.css main.js favicon.svg ./
COPY img ./img

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.js"]
