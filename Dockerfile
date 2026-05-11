# node20alp_nextimg — imagen ya buildeada en el host, ver patron de satelldexfront
FROM node:20-alpine
WORKDIR /app

# herramientas opcionales (paridad con satelldexfront)
RUN apk add --no-cache nano curl

EXPOSE 3000

CMD ["yarn", "start"]
