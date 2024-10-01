FROM gcr.io/distroless/nodejs18-debian12 AS distroless
FROM node:18.13.0-slim AS base

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT

RUN npm install npm@8.19.3 -g
RUN npm install typescript@5.4.5 -g

USER node

WORKDIR /app
RUN chown -R node:node /app
COPY --chown=node:node package*.json ./
RUN npm ci --include=dev && npm cache clean --force

COPY --chown=node:node . .
RUN npm run build
RUN npm prune --omit=dev

WORKDIR /app/public/image/tours
RUN chown -R node:node /app/public/image/tours


FROM distroless AS prod

COPY --from=base /app /app

USER 1000
EXPOSE 3000
ENV NODE_ENV=production

WORKDIR /app

CMD ["dist/src/server.js"]