import os
import dj_database_url
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Deployment: set these in environment (or .env) for production/college use
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "demo-secret-key-change-in-production")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("1", "true", "yes")

_allowed_hosts_env = os.environ.get("DJANGO_ALLOWED_HOSTS", "").strip()
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(",") if h.strip()] or ["*"]


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'core',
]


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# CORS configuration
_default_cors_origins = [
    "https://attendance-system-2-77c2.onrender.com",
]

_cors_env = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()
_cors_from_env = [o.strip() for o in _cors_env.split(",") if o.strip()]

CORS_ALLOWED_ORIGINS = sorted(set(_default_cors_origins + _cors_from_env))
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    o for o in CORS_ALLOWED_ORIGINS
    if o.startswith("http://") or o.startswith("https://")
]


ROOT_URLCONF = 'attendance_backend.urls'
WSGI_APPLICATION = 'attendance_backend.wsgi.application'


# Database
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get("DATABASE_URL"),
        conn_max_age=600
    )
}


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'core.User'


# Cookie & Session settings (IMPORTANT for cross-device login)
SESSION_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True

CSRF_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SECURE = True

# Optional domain (only for same root domains like .college.edu)
_cookie_domain = os.environ.get("SESSION_COOKIE_DOMAIN", "").strip()
if _cookie_domain:
    SESSION_COOKIE_DOMAIN = _cookie_domain
    CSRF_COOKIE_DOMAIN = _cookie_domain


SESSION_COOKIE_AGE = 86400 * 7
SESSION_SAVE_EVERY_REQUEST = True


# 🔥 FINAL FIX FOR MOBILE + CROSS DOMAIN
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_NAME = "csrftoken"
SESSION_ENGINE = "django.contrib.sessions.backends.db"


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.auth.SessionAuthenticationNoCSRF',
        'rest_framework.authentication.BasicAuthentication',
    ),
}
