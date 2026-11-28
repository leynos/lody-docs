.PHONY: help all tools deps tlc tlc-liveness tlc-all fmt check-fmt ruff interrogate biome typecheck \
	markdownlint nixie cloud-api-check evidence-check openapi lint test test-python \
	test-node check clean

TLA_TOOLS_VERSION := 1.7.4
TLA_TOOLS_SHA256 := 936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
TLA_TOOLS_URL := https://github.com/tlaplus/tlaplus/releases/download/v$(TLA_TOOLS_VERSION)/tla2tools.jar
TLA_TOOLS_JAR := .tools/tla2tools.jar
NODE_DEPS := node_modules/.package-lock.json
PYTHON_SOURCES := scripts tests docs/lody-streams-rpc/probes
# Every uv call goes through the vendored helper, which cleans the environment,
# uses the global uv cache, runs offline first and goes online at most once. See
# https://github.com/leynos/shared-actions/tree/main/uv_gate for the contract.
# `scripts/uv_gate.py` is the shared-actions helper, vendored byte for byte, so
# update it by copying the canonical file, never by editing it here.
UV_GATE ?= python3 scripts/uv_gate.py
# The helper is held to its upstream's standards, not this repository's, so
# ruff leaves it alone (and `make fmt` cannot rewrite it).
RUFF_EXCLUDE = --extend-exclude scripts/uv_gate.py
PYTEST := $(UV_GATE) tool --from 'pytest==8.4.2' -- pytest -p no:cacheprovider
# The Lody checkout that the cloud API generator reads. It sits beside this
# repository, or two levels up when this is a linked worktree.
LODY_SOURCE ?= $(or $(firstword $(wildcard ../Lody ../../Lody)),../../Lody)
export LODY_SOURCE

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "%-16s %s\n", $$1, $$2}'

all: lint test tlc ## Run every lint, the tests, and the safety and ablation models

tools: $(TLA_TOOLS_JAR) ## Download the pinned TLA+ tools

$(TLA_TOOLS_JAR):
	mkdir -p .tools
	curl --fail --silent --show-error --location --output $@.tmp $(TLA_TOOLS_URL)
	echo "$(TLA_TOOLS_SHA256)  $@.tmp" | sha256sum --check --quiet
	mv $@.tmp $@

deps: $(NODE_DEPS) ## Install the pinned Node.js development dependencies

$(NODE_DEPS): package-lock.json
	npm ci

tlc: tools ## Run the safety and ablation models (about two minutes)
	python3 scripts/check_models.py --group safety --group ablation

tlc-liveness: tools ## Run the liveness models (about ten minutes)
	python3 scripts/check_models.py --group liveness

tlc-all: tlc tlc-liveness ## Run every model

fmt: deps ## Format the Python, JavaScript, and JSON sources
	ruff format $(RUFF_EXCLUDE) $(PYTHON_SOURCES)
	npm run format

check-fmt: deps ## Check Python, JavaScript, and JSON formatting
	ruff format --check $(RUFF_EXCLUDE) $(PYTHON_SOURCES)
	npm run check:fmt

ruff: ## Lint the Python sources
	ruff check $(RUFF_EXCLUDE) $(PYTHON_SOURCES)

# Interrogate measures docstring presence in the Python files under
# PYTHON_SOURCES; add a new Python directory there. No `--python` pin: a managed
# interpreter would be downloaded.
INTERROGATE_VERSION ?= 1.7.0
INTERROGATE = $(UV_GATE) tool --from 'interrogate==$(INTERROGATE_VERSION)' -- interrogate --fail-under 100

# To list each undocumented definition, run
# `uv tool run --from interrogate==1.7.0 interrogate -vv $(PYTHON_SOURCES)`
# with the sources written out.
interrogate: ## Enforce complete Python docstring coverage
	$(INTERROGATE) $(PYTHON_SOURCES)

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

evidence-check: ## Check the generated evidence indexes against the Lody source
	python3 scripts/check_evidence.py "$(LODY_SOURCE)"

openapi: ## Validate the OpenAPI description
	npm run validate:openapi

lint: check-fmt ruff interrogate biome typecheck markdownlint nixie cloud-api-check evidence-check openapi ## Run every lint

test: test-python test-node ## Run the tests of the repository scripts

test-python: ## Test the evidence and model checkers
	$(PYTEST) tests

test-node: deps ## Test the cloud API generator's check mode
	node --test tests/*.test.mjs

check: lint test tlc-all ## Run every gate, including the slow liveness models

clean: ## Remove downloaded tools, dependencies, and TLC logs
	rm -rf .tools node_modules
