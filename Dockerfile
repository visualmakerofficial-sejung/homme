# Grok Studio 실사 웹앱 — 의존성 없는 Node 서버
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
