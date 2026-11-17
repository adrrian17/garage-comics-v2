# The Watermarker container (packages/infra/alchemy.run.ts). `alchemy dev` builds and runs it with local Docker.
FROM python:3.13-slim

WORKDIR /app

USER nobody
EXPOSE 8080
CMD ["python", "-m", "http.server", "8080"]
