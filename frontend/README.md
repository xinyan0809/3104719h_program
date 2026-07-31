# Vite and TypeScript assets

Django remains responsible for HTML rendering, URLs, authentication, and access
control. Vite only compiles the TypeScript module loaded by the protected
`/pose-test/` Django page.

The generated files are written to `game/static/game/vite/` so Django
staticfiles can serve them. This output directory is generated and is not
committed.

## MediaPipe resources and privacy

The frontend package pins `@mediapipe/tasks-vision` to version `1.0.0`. At
runtime, the pose prototype loads:

- MediaPipe WebAssembly files from the pinned jsDelivr package URL.
- Google's official Pose Landmarker Lite model from
  `storage.googleapis.com/mediapipe-models/`.

The fetched files contain runtime code and the pose model only. Webcam frames,
landmarks, raw body coordinates, and horizontal movement calculations remain in
browser memory. They are not recorded, sent to Django, or saved to the database.

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

Camera access is available on secure origins and on `localhost`. Open the
Django development server through `http://127.0.0.1:8000/`, sign in, and visit
`/pose-test/`.

## Production asset build

```powershell
cd frontend
npm ci
npm run typecheck
npm run build
```

Run the asset build before Django collects or serves production static files.
This setup intentionally has no Vite HTML entry point or client-side router.

## Tests

From the repository root:

```powershell
.\.venv\Scripts\python.exe manage.py test
cd frontend
npm run typecheck
npm run build
```

Browser and camera scenarios that cannot be automated in the Django test suite
are covered by the
[pose prototype manual checklist](../docs/pose-test-manual-checklist.md).
