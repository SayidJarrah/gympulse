# ---- Builder stage ----
FROM gradle:8-jdk21 AS builder
WORKDIR /app
COPY . .
RUN ./gradlew bootJar --no-daemon

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl \
    && addgroup -S gymflow \
    && adduser -S gymflow -G gymflow

COPY --from=builder /app/build/libs/gymflow-backend-0.0.1-SNAPSHOT.jar app.jar
RUN chown gymflow:gymflow app.jar

USER gymflow

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
