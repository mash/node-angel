.PHONY: test

test:
	node ./test/01_restart_app.js
	node ./test/02_accidental_death.js
	node ./test/03_max_requests_per_child.js
