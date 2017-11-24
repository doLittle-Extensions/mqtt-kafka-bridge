FROM node:latest

WORKDIR /app

ADD package.json /app
ADD server.js /app

RUN ["npm", "install"]

EXPOSE 1883

ENV ZOOKEEPER_CONNECTION_STRING=""

CMD ["node", "server.js"]