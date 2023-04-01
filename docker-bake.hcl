// docker-bake.hcl
target "docker-metadata-action" {}

group "default" {
  targets = ["front", "api"]
}

target "build" {
  inherits = ["docker-metadata-action"]
  context = "./"
  platforms = [
    "linux/amd64",
    "linux/arm/v6",
    "linux/arm/v7",
    "linux/arm64",
    "linux/386"
  ]
}

target "front" {
    inherits = ["docker-metadata-action"]
    context = "./front"
    dockerfile = "Dockerfile"
}

target "api" {
    inherits = ["docker-metadata-action"]
    context = "./api"
    dockerfile = "Dockerfile"
}