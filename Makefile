.PHONY: check check-fmt fmt lint typecheck markdownlint nixie

check: check-fmt lint typecheck markdownlint nixie

check-fmt:
	npm run check:fmt

fmt:
	npm run format

lint:
	npm run lint
	npm run check
	npm run validate:openapi

typecheck:
	npm run typecheck

markdownlint:
	npm run lint:docs

nixie:
	nixie README.md cloud-api/README.md cloud-api/coverage.md cloud-api/routes.md cloud-api/operations.md
