export default {
  framework: 'django',
  buildCommand:
    'npm ci --prefix frontend && npm run build --prefix frontend && python manage.py collectstatic --noinput',
};
