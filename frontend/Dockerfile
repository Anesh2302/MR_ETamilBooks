FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ENV NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
