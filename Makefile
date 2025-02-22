# Makefile for Galactic Wars POC
# Use 'make help' to see all commands

help:
	@echo "Usage:"
	@echo "  make install     - Install all dependencies"
	@echo "  make start       - Start the server"
	@echo "  make dev         - Start the server with nodemon (auto-restart on changes)"

install:
	npm install

start:
	npm run start

dev:
	npm run dev