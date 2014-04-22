from django.test import SimpleTestCase
from .tasks import time_glance_api
import logging

logger = logging.getLogger(__name__)


class TaskTests(SimpleTestCase):

    def test_time_glance_api(self):
        result = time_glance_api()
        self.assertIn('id', result)
        self.assertIn('record', result)