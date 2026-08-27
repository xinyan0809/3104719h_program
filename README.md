# Motion Rehabilitation Games

A Django web app with browser-based motion games, user accounts, personal game
records, and profile avatars.

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/xinyan0809/3104719h_program)

Click the button, sign in to Render with GitHub, review the Blueprint, and select
**Deploy Blueprint**. Render creates the web service and PostgreSQL database,
builds the Vite frontend, runs migrations, and provides an HTTPS
`onrender.com` URL.

The free web service sleeps after 15 minutes without traffic, and its first
request after sleeping can take about a minute. The free Render PostgreSQL
database expires after 30 days. Uploaded avatars are also ephemeral on the free
web-service filesystem. Upgrade the database and add a persistent disk or
object storage if these files must be retained long term.

## Local development

```powershell
cd frontend
npm ci
npm run build
cd ..
python manage.py migrate
python manage.py runserver
```
