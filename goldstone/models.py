from django.conf import settings
from elasticsearch import Elasticsearch

__author__ = 'stanford'


class GSConnection(object):
    conn = None

    def __init__(self, server=settings.ES_SERVER):
        self.conn = Elasticsearch(server)


class ESData(object):

    _conn = GSConnection().conn

    def _get_latest_index(self, prefix):
        """
        Get an index based on a prefix filter and simple list sort.  assumes
         that sorting the list of indexes with matching prefix will
         result in the most current one at the end of the list.  Works for
         typical datestamp index names like logstash-2014.03.27.  If you know
         your index names have homogeneous, should work without the prefix, but
         use caution!

        :arg prefix: the prefix used to filter index list
        :returns: index name
        """

        candidates = []
        if prefix is not None:
            candidates = [k for k in
                          self._conn.indices.status()['indices'].keys() if
                          k.startswith(prefix)]
        else:
            candidates = [k for k in
                          self._conn.indices.status()['indices'].keys()]
        candidates.sort()
        return candidates.pop()

    #
    # query construction helpers
    #
    @staticmethod
    def _query_base():
        return {
            "query": {}
        }

    @staticmethod
    def _filtered_query_base(query={}, filter={}):
        return {
            "query": {
                "filtered": {
                    "query": query,
                    "filter": filter
                }
            }
        }

    @staticmethod
    def _add_facet(q, facet):
            result = q.copy()
            if not 'facets' in result:
                result['facets'] = {}

            result['facets'][facet.keys()[0]] = facet[facet.keys()[0]]
            return result

    @staticmethod
    def _term_clause(field, value):
        return {
            "term": {
                field: value
            }
        }

    @staticmethod
    def _terms_clause(field):
        return {
            "terms": {
                "field": field
            }
        }

    @staticmethod
    def _bool_clause(must=[], must_not=[]):
        return {
            "bool": {
                "must": must,
                "must_not": must_not
            }
        }

    @staticmethod
    def _range_clause(field, start, end, gte=True, lte=True, facet=None):
            start_op = "gte" if gte else "gt"
            end_op = "lte" if lte else "lt"
            result = {
                "range": {
                    field: {
                        start_op: start,
                        end_op: end
                    }
                }
            }

            if facet:
                result = ESData._add_facet(result, facet)

            return result

    @staticmethod
    def _agg_date_hist(interval, field="@timestamp",
                       name="events_by_date",
                       min_doc_count=0):
        return {
            name: {
                "date_histogram": {
                    "field": field,
                    "interval": interval,
                    "min_doc_count": min_doc_count
                }
            }
        }

    @staticmethod
    def _agg_filter_term(field, value, name):
        return {
            name: {
                "filter": {
                    "term": {
                        field: value
                    }
                }
            }
        }

    @staticmethod
    def _max_aggs_clause(name, field):
        return {
            name: {
                "max": {
                    "field": field
                }
            }
        }

    @staticmethod
    def _agg_clause(name, clause):
        return {
            name: clause
        }
