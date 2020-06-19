FROM node:12

RUN mkdir -p /src
WORKDIR /src

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3003

RUN chmod +x run.sh
CMD ["bash", "-c", "./run.sh"]
