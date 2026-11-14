.PHONY: help all tools deps tlc tlc-liveness tlc-all fmt check-fmt ruff biome typecheck \
	markdownlint nixie cloud-api-check openapi lint check clean

TLA_TOOLS_VERSION := 1.7.4
TLA_TOOLS_SHA256 := 936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
TLA_TOOLS_URL := https://github.com/tlaplus/tlaplus/releases/download/v$(TLA_TOOLS_VERSION)/tla2tools.jar
TLA_TOOLS_JAR := .tools/tla2tools.jar
NODE_DEPS := node_modules/.package-lock.json
PYTHON_SOURCES := scripts docs/lody-streams-rpc/probes

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "%-16s %s\n", $$1, $$2}'

all: lint tlc ## Run every lint and the safety and ablation models

tools: $(TLA_TOOLS_JAR) ## Download the pinned TLA+ tools

$(TLA_TOOLS_JAR):
	mkdir -p .tools
	curl --fail --silent --show-error --location --output $@.tmp $(TLA_TOOLS_URL)
	echo "$(TLA_TOOLS_SHA256)  $@.tmp" | sha256sum --check --quiet
	mv $@.tmp $@

deps: $(NODE_DEPS) ## Install the pinned Node.js development dependencies

$(NODE_DEPS): package-lock.json
	npm ci

tlc: tools ## Run the safety and ablation models (about one minute)
	python3 scripts/check_models.py --group safety --group ablation

tlc-liveness: tools ## Run the liveness models (about ten minutes)
	python3 scripts/check_models.py --group liveness

tlc-all: tlc tlc-liveness ## Run every model

fmt: deps ## Format the Python, JavaScript, and JSON sources
	ruff format $(PYTHON_SOURCES)
	npm run format

check-fmt: deps ## Check Python, JavaScript, and JSON formatting
	ruff format --check $(PYTHON_SOURCES)
	npm run check:fmt

ruff: ## Lint the Python sources
	ruff check $(PYTHON_SOURCES)

biome: deps ## Lint the JavaScript and JSON sources
	npm run lint

typecheck: deps ## Type-check the cloud API generator
	npm run typecheck

markdownlint: deps ## Lint the Markdown sources
	npm run lint:docs

nixie: ## Validate the Mermaid diagrams
	nixie README.md docs

cloud-api-check: deps ## Check the generated cloud API files against the Lody source
	npm run check

openapi: ## Validate the OpenAPI description
	npm run validate:openapi

lint: check-fmt ruff biome typecheck markdownlint nixie cloud-api-check openapi ## Run every lint

check: lint tlc-all ## Run every gate, including the slow liveness models

clean: ## Remove downloaded tools, dependencies, and TLC logs
	rm -rf .tools node_modules
