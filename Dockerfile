FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN if [ ! -f index.js ] && [ -f theme/index.js.dist ]; then cp theme/index.js.dist index.js; fi
EXPOSE 8000
EXPOSE 8080
CMD ["node", "index.js"]