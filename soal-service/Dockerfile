# syntax=docker/dockerfile:1.7

FROM golang:1.24.4-alpine3.21 AS builder

ENV CGO_ENABLED=1 \
    GOOS=linux \
    GOARCH=amd64 \
    GOPROXY=https://proxy.golang.org,direct \
    GONOSUMDB=*

RUN apk add --no-cache build-base libwebp-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,id=gomodcache,target=/go/pkg/mod,sharing=locked \
    go mod download

COPY . .
RUN --mount=type=cache,id=gomodcache,target=/go/pkg/mod,sharing=locked \
    --mount=type=cache,id=gobuildcache,target=/root/.cache/go-build,sharing=locked \
    go build -trimpath -ldflags='-s -w' -o /out/soal-service ./main.go

FROM alpine:3.21

RUN apk add --no-cache ca-certificates libwebp

COPY --from=builder /out/soal-service /usr/local/bin/soal-service

USER nobody

ENTRYPOINT ["soal-service"]