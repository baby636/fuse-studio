FROM node:25.6.0-bookworm
USER $UID:$GID
WORKDIR /app
RUN apt install git
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
