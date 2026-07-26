# Vite and TypeScript assets

Django remains responsible for HTML rendering, URLs, authentication, and access
control. Vite only compiles the TypeScript module loaded by the protected
`/pose-test/` Django page.

The generated files are written to `game/static/game/vite/` so Django
staticfiles can serve them. This output directory is generated and is not
committed.

## Development

Install dependencies once:

```powershell
cd frontend
npm ci
```

Run the Vite watch build in one terminal:

```powershell
cd frontend
npm run dev
```

Run Django in a second terminal from the repository root:

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

Vite rebuilds the module when its source changes. Refresh `/pose-test/` in the
browser after a rebuild.

## Production asset build

```powershell
cd frontend
npm ci
npm run typecheck
npm run build
```

Run the asset build before Django collects or serves production static files.
This setup intentionally has no Vite HTML entry point or client-side router.
