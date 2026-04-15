# syntax=docker/dockerfile:1.7

FROM golang:1.24.4-alpine3.21 AS builder

ENV CGO_ENABLED=0 \
    GOOS=linux \
    # GOARCH=amd64 \
    GOPROXY=https://proxy.golang.org,direct \
    GONOSUMDB=*

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -trimpath -ldflags='-s -w' -o /out/auth-service ./cmd/api/main.go

FROM alpine:3.21

RUN apk add --no-cache ca-certificates wget

COPY --from=builder /out/auth-service /usr/local/bin/auth-service

USER nobody

ENTRYPOINT ["auth-service"]