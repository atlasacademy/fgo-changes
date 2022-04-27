FROM node:16
LABEL MAINTAINER sadisticsolutione@gmail.com

ENV REPO="" \
    TOKEN="" \
    WEBHOOK=""

ENTRYPOINT tail -f /dev/null
WORKDIR /app

COPY . /app
RUN npm install
RUN npx tsc
