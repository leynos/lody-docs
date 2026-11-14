.PHONY: help all tools tlc tlc-liveness tlc-all fmt check-fmt ruff markdownlint lint check clean

TLA_TOOLS_VERSION := 1.7.4
TLA_TOOLS_SHA256 := 936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
TLA_TOOLS_URL := https://github.com/tlaplus/tlaplus/releases/download/v$(TLA_TOOLS_VERSION)/tla2tools.jar
TLA_TOOLS_JAR := .tools/tla2tools.jar

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "%-14s %s\n", $$1, $$2}'

all: lint tlc ## Lint the documentation and run the safety and ablation models

tools: $(TLA_TOOLS_JAR) ## Download the pinned TLA+ tools

$(TLA_TOOLS_JAR):
	mkdir -p .tools
	curl --fail --silent --show-error --location --output $@.tmp $(TLA_TOOLS_URL)
	echo "$(TLA_TOOLS_SHA256)  $@.tmp" | sha256sum --check --quiet
	mv $@.tmp $@

tlc: tools ## Run the safety and ablation models (about one minute)
	python3 scripts/check_models.py --group safety --group ablation

tlc-liveness: tools ## Run the liveness models (several minutes)
	python3 scripts/check_models.py --group liveness

tlc-all: tlc tlc-liveness ## Run every model

markdownlint: ## Lint the Markdown sources
	markdownlint-cli2 "**/*.md"

fmt: ## Format the Python sources
	ruff format scripts

check-fmt: ## Check Python formatting
	ruff format --check scripts

ruff: ## Lint the Python sources
	ruff check scripts

lint: check-fmt ruff markdownlint ## Run every lint

check: lint tlc-all ## Run every gate, including the slow liveness models

clean: ## Remove downloaded tools and TLC logs
	rm -rf .tools
