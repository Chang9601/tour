FROM node:18.13.0-slim AS base

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT

RUN npm install npm@8.19.3 -g
RUN npm install typescript@5.4.5 -g

WORKDIR /opt/express_app
RUN chown -R node:node /opt/express_app/
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

USER node

FROM base AS dev

ENV NODE_ENV=development

WORKDIR /opt/express_app
RUN npm install

WORKDIR /opt/express_app/app

# 개발 환경은 바인드 마운트를 할 것이기 때문에 COPY를 생략한다.
# COPY --chown=node:node . .

CMD ["node", "dist/server.js"]


FROM base AS source

WORKDIR /opt/express_app/app

COPY --chown=node:node . .


FROM source AS prod

USER root

WORKDIR /opt/express_app/app/dist
RUN chown -R node:node /opt/express_app/app/dist/

WORKDIR /opt/express_app/app
RUN npm run build

USER node

CMD ["node", "dist/server.js"]