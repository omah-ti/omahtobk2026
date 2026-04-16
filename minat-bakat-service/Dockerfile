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
RUN go build -trimpath -ldflags='-s -w' -o /out/minat-bakat-service ./main.go

FROM alpine:3.21

RUN apk add --no-cache ca-certificates

COPY --from=builder /out/minat-bakat-service /usr/local/bin/minat-bakat-service

USER nobody

ENTRYPOINT ["minat-bakat-service"]