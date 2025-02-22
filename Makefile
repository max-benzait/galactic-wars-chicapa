# Makefile - convenience commands for local dev & GCP deployment

# Load environment variables from .env file if it exists
ifneq (,$(wildcard .env))
    include .env
    export $(shell sed 's/=.*//' .env)
endif

# Default values (can be overridden by .env or CLI args)
PROJECT_ID ?= your-gcp-project-id
SERVICE_NAME ?= galactic-wars-poc
REGION ?= us-central1
IMAGE ?= gcr.io/$(PROJECT_ID)/$(SERVICE_NAME)

help:
	@echo "Makefile for Galactic Wars POC"
	@echo "Usage:"
	@echo "  make install        - Install node dependencies"
	@echo "  make start          - Run the server locally"
	@echo "  make dev            - Run server with nodemon auto-reload"
	@echo "  make build-docker   - Build Docker image locally"
	@echo "  make run-docker     - Run Docker image locally, exposing 8080"
	@echo "  make push           - Push Docker image to GCR (needs 'docker login')"
	@echo "  make deploy         - Deploy to Cloud Run"
	@echo "  make destroy        - Delete the Cloud Run service"
	@echo "  make logs           - View logs from Cloud Run"

install:
	npm install

start:
	npm run start

dev:
	npm run dev

build-docker:
	docker build --platform=linux/amd64 -t $(SERVICE_NAME) .

run-docker:
	docker run -p 8080:8080 --rm --name $(SERVICE_NAME) $(SERVICE_NAME)

push:
	gcloud auth configure-docker
	docker build --platform=linux/amd64 -t $(IMAGE) .
	docker push $(IMAGE)

deploy:
	gcloud run deploy $(SERVICE_NAME) \
	  --image $(IMAGE) \
	  --platform managed \
	  --region $(REGION) \
	  --allow-unauthenticated \
	  --project $(PROJECT_ID)

destroy:
	gcloud run services delete $(SERVICE_NAME) \
	  --region $(REGION) \
	  --project $(PROJECT_ID) \
	  --quiet

logs:
	gcloud logs read projects/$(PROJECT_ID)/logs/cloudrun.googleapis.com%2Fstdout \
	  --project=$(PROJECT_ID) \
	  --limit=50 \
	  --freshness=1d \
	  --format="value(textPayload)"