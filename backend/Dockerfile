# Production image for the Spring Boot API. Built with Maven in one stage, run on a slim
# JRE in the next, so the final image carries no compiler, no Maven and no source.

# ─── 1. build ─────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Dependencies first, on their own layer: re-downloaded only when pom.xml changes.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
# Tests need a live database, which does not exist while the image builds.
RUN mvn -q -B package -DskipTests \
 && cp target/*.jar app.jar

# ─── 2. runtime ───────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
# Owned by the app user so a fresh named volume mounted here inherits it and uploads can be written.
RUN mkdir -p /data/media && chown spring:spring /data/media
COPY --from=build --chown=spring:spring /app/app.jar app.jar
USER spring

# Size the heap from the container's memory limit rather than the host's RAM.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

# A public read that touches the database, so it fails if Postgres is unreachable too.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/api/public/settings || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
