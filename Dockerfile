FROM node:14.5
MAINTAINER sadisticsolutione@gmail.com

ENV REPO="" \
    TOKEN="" \
    WEBHOOK=""

ENTRYPOINT tail -f /dev/null
WORKDIR /app

COPY . /app
RUN npm install
