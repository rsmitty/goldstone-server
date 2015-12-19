from elasticsearch_dsl.result import Response
from rest_framework.test import APITestCase
from goldstone.drfes.new_models import DailyIndexDocType


class DailyIndexDocTypeTests(APITestCase):

    class LogMessage(DailyIndexDocType):
        from elasticsearch_dsl import String, Date
        message = String()
        timestamp = Date()

        class Meta:
            doc_type = 'syslog'
            index = 'logstash-*'

    def test_search_wildcard_index(self):
        s = self.LogMessage.search()
        result = s.execute()
        self.assertIsInstance(result, Response)

    def test_index_today(self):
        import arrow
        date_fmt = self.LogMessage.INDEX_DATE_FMT
        today = arrow.utcnow().format(date_fmt)
        dt = self.LogMessage()
        self.assertEqual(dt._index_today(), 'logstash-' + today)

    def test_lifecycle(self):
        import uuid
        import arrow

        # to avoid worrying about searching the raw field, let's use a lowercase
        # string with no special chars.
        message = ''.join([c for c in str(uuid.uuid4()) if c != '-'])
        created = arrow.utcnow().isoformat()

        # instantiate and persist the LogMessage
        lm = self.LogMessage(message=message, created=created)
        result = lm.save()
        self.assertEqual(result, True)

        # force flush the index so our test has a chance to succeed.
        lm._doc_type.using.indices.flush(lm.meta.index)

        # Sadly, the get method does not accept a wildcard index, so you will
        # need to either know which index the document is in, or use the search
        # method to get it back.  When you save an instance, the meta attrs
        # id and index are set, so if it's important information, you may
        # want to persist it in postgres.
        glm = self.LogMessage.get(id=lm.meta.id, index=lm.meta.index)
        self.assertEqual(lm.message, glm.message)
        self.assertEqual(lm.created, glm.created)
        self.assertIsInstance(glm, self.LogMessage)

        # so let's try to find it via search.
        s = self.LogMessage.search()
        slm = s.filter('term', message=message) \
            .filter('term', created=created) \
            .execute()[0]
        self.assertEqual(lm.message, slm.message)
        self.assertEqual(lm.created, slm.created)
        self.assertIsInstance(slm, self.LogMessage)

        # let's make sure we can delete an object
        result = slm.delete()
        self.assertIsNone(result)

        # force flush the index so our test has a chance to succeed.
        lm._doc_type.using.indices.flush(lm.meta.index)

        # we should not be able to find the record now.
        s = self.LogMessage.search()
        slm2 = s.filter('term', message=message) \
            .filter('term', created=created) \
            .execute()
        self.assertEqual(len(slm2.hits), 0)






