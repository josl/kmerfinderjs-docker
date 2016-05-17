# Set base image to NodeJS
FROM node:latest
# File Author / Maintainer
MAINTAINER Jose Luis Bellod Cisneros

RUN mkdir /root/.ssh/
RUN ssh-keyscan registry.npmjs.org >> /root/.ssh/known_hosts

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY ./backend/package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY ./backend /usr/src/app

CMD [ "npm", "start" ]
