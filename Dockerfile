FROM node:12

RUN mkdir -p /src
WORKDIR /src

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3003

CMD ["node", "app.js"]