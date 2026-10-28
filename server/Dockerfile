FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY *.mjs ./
USER node
EXPOSE 7040
CMD ["node", "index.mjs"]
