# Calculadoras de tributos da Reforma Tributária (CBS/IBS/IS) da Receita Federal, licença MIT.
# Uma imagem por calculadora, sem nenhuma alteração no código: clona a tag oficial, gera o banco
# SQLite com os scripts Flyway do repositório do regime regular e roda o JAR no perfil "offline".
# Ver docs/CALCULADORA_RTC.md (instalação e atualização).
#
# Build args:
#   REPO   calculadora-rtc-regime-regular | calculadora-rtc-simples-nacional
#   TAG    tag publicada no GitHub da Receita (ex.: 1.7.2 / 1.0.2)
#   JAR    api-regime-geral.jar | api-simples-nacional.jar
#   TAG_BANCO  tag do regime regular de onde vêm os scripts do banco (os dois usam o mesmo banco)

FROM eclipse-temurin:25-jdk AS build
ARG REPO
ARG TAG
ARG TAG_BANCO=1.7.2
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch "${TAG}" "https://github.com/ReceitaFederal/${REPO}.git" /src \
 && git clone --depth 1 --branch "${TAG_BANCO}" https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git /banco
WORKDIR /src
# O Simples não traz os scripts do banco: o README dele manda copiar a pasta flyway/ do regime regular.
RUN rm -rf flyway && cp -r /banco/flyway ./flyway \
 && mkdir -p calculadora/db \
 && chmod +x mvnw \
 && ./mvnw -B -q flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf \
 && ./mvnw -B -q -DskipTests package

FROM eclipse-temurin:25-jre
ARG JAR
ARG REPO
ARG TAG
LABEL org.opencontainers.image.source="https://github.com/ReceitaFederal/${REPO}" \
      org.opencontainers.image.version="${TAG}" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
COPY --from=build /src/target/${JAR} app.jar
COPY --from=build /src/calculadora/db ./calculadora/db
COPY --from=build /src/LICENSE ./LICENSE
# -XX:-UseBASE64Intrinsics: mitigação pedida pela própria Receita nas versões 1.7.1 / 1.0.1.
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=70.0 -XX:-UseBASE64Intrinsics"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dspring.profiles.active=offline -jar app.jar"]
