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
# TypeScript 타입 오류로 개발 환경 의존성까지 설치하는데 다른 방법이 필요하다.
RUN npm ci --include=dev && npm cache clean --force

COPY --chown=node:node . .
RUN npm run build
# 개발 환경 의존성을 제거한다.
RUN npm prune --omit=dev

WORKDIR /app/public/image/users
RUN chown -R node:node /app/public/image/users


FROM distroless AS prod

COPY --from=base /app /app

USER 1000
EXPOSE 3000
ENV NODE_ENV=production

WORKDIR /app

CMD ["dist/src/server.js"]