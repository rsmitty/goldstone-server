# settings/base.py
"""
Django settings for goldstone project.

For more information on this file, see
https://docs.djangoproject.com/en/1.6/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.6/ref/settings/
"""

import os

CURRENT_DIR = os.path.dirname(__file__)
TEMPLATE_DIRS = (os.path.join(CURRENT_DIR, '../templates'),)

# Normally you should not import ANYTHING from Django directly
# into your settings, but ImproperlyConfigured is an exception.
from django.core.exceptions import ImproperlyConfigured


def get_env_variable(var_name):
    """ Get the environment variable or return exception """
    try:
        return os.environ[var_name]
    except KeyError:
        error_msg = "Set the %s environment variable" % var_name
        raise ImproperlyConfigured(error_msg)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.6/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# SECRET_KEY = 'ae78rr)cb-#o*jy2+kv#7-th08(332d&(pq)k30fzytv67%5v_'
# SECRET_KEY = get_env_variable("GOLDSTONE_SECRET")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

TEMPLATE_DEBUG = True

QUNIT_ENABLED = True

ALLOWED_HOSTS = []

# Application definition

INSTALLED_APPS = (
    'django_admin_bootstrapped',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'south',
    'waffle',
    'crispy_forms',
    'djangojs',
    'goldstone.apps.core',
    'goldstone.apps.intelligence',
    'goldstone.apps.cockpit',
    'goldstone.apps.nova',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'waffle.middleware.WaffleMiddleware',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.core.context_processors.request',
    'django.contrib.auth.context_processors.auth',
)

ROOT_URLCONF = 'goldstone.urls'

WSGI_APPLICATION = 'goldstone.wsgi.application'


# Internationalization
# https://docs.djangoproject.com/en/1.6/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.6/howto/static-files/

# staticfiles configuration based on tips here:
#   http://blog.doismellburning.co.uk/2012/06/25/django-and-static-files/

STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder'
)

STATICFILES_DIRS = (os.path.join(BASE_DIR, 'static'),)

STATICFILES_ROOT = '/usr/share/nginx/html/static'

# this is sort of a hack until we get our server strategy figured out.
STATIC_URL = '/static/'

# Crispy Forms
CRISPY_TEMPLATE_PACK = 'bootstrap3'

MAILHOST = 'localhost'

# Celery
BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_TASK_SERIALIZER = 'json'

from celery.schedules import crontab

CELERYBEAT_SCHEDULE = {
    # List the availability zone info every 5 minutes
    'nova-az-list': {
        'task': 'goldstone.apps.nova.tasks.nova_az_list',
        'schedule': crontab(minute='*/2'),
    },
}


# GOLD-247 commented out lease scheduled tasks.  Should revisit
# the settings when fixing GOLD-257.  Unfortunately, looks like you
# can't even import waffle here, else we get an ImproperlyConfigured exception

#from datetime import timedelta
#
#CELERYBEAT_SCHEDULE = {
#    'find_expirations': {
#        'task': 'goldstone.apps.lease.tasks.find_expirations',
#        'schedule': timedelta(seconds=30),
#        'args': ()
#    },
#    'find_notifications': {
#        'task': 'goldstone.apps.lease.tasks.find_notifications',
#        'schedule': timedelta(seconds=30),
#        'args': ()
#    },
#}

# Goldstone config settings
DEFAULT_LOOKBACK_DAYS = 7
DEFAULT_CHART_BUCKETS = 80
DEFAULT_PRESENCE_LOOKBACK_HOURS = 1

OS_USERNAME = 'admin'
OS_TENANT_NAME = 'admin'
OS_PASSWORD = 'cr0n0v0r3'
OS_AUTH_URL = 'http://10.10.11.20:35357/v2.0/'
