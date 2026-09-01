.PHONY: install frontend backend typecheck test

install:
	cd src/frontend && npm install
	cd src/backend && pip install -r requirements.txt

frontend:
	cd src/frontend && npm run dev

backend:
	cd src/backend && python main.py

typecheck:
	cd src/frontend && npm run type-check

test:
	cd src/frontend && npm test -- --watchAll=false
