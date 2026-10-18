# ============================================================
# FORMACE — imagem unica: frontend React embutido no jar Spring Boot
# Build multi-stage:
#   1) node     -> compila o frontend (React + Vite)
#   2) maven    -> compila o backend e copia o dist/ para static/
#   3) jre      -> roda o jar ( porta 8080 )
# Suba no Render apontando "Root Directory" para a raiz do repo.
# ============================================================

# ---------- Etapa 1: frontend ----------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Etapa 2: backend ----------
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
# cache de dependencias: copia so o pom e baixa antes de copiar o codigo
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
# embute o build do React no jar (Spring Boot serve /static)
COPY --from=frontend /app/frontend/dist ./src/main/resources/static
RUN mvn -q -B package -DskipTests

# ---------- Etapa 3: runtime ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=backend /app/backend/target/*.jar app.jar

# plano gratuito do Render tem 512MB: heap do Java limitado com folga
ENV JAVA_OPTS="-Xmx320m -XX:MaxMetaspaceSize=128m"
EXPOSE 8080

# /actuator/health = caminho de "Health Check Path" no Render
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
