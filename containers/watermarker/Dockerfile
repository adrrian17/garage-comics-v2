# The Watermarker container (packages/infra/alchemy.run.ts). `alchemy dev` builds and runs it with local Docker.
# Placement changes are checked against real hazard pages with fixture/measure.py, which runs outside the image.
FROM python:3.13-slim

# pikepdf is Python bindings over libqpdf; its wheel bundles libqpdf, so no system packages are needed.
# Pinned to the version fixture/measure.py was run with (pikepdf 10.18.2, libqpdf 12.4.2).
RUN pip install --no-cache-dir pikepdf==10.18.2

WORKDIR /app
COPY stamp.py server.py ./

# The image does not build if the footer would land anywhere but the bottom edge the reader sees, or could drop a character.
RUN python stamp.py --self-check

USER nobody
EXPOSE 8080
CMD ["python", "server.py"]
