"""Core tasks."""
# Copyright 2014 - 2015 Solinea, Inc.
#
# Licensed under the Solinea Software License Agreement (goldstone),
# Version 1.0 (the "License"); you may not use this file except in compliance
# with the License. You may obtain a copy of the License at:
#
#     http://www.solinea.com/goldstone/LICENSE.pdf
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either expressed or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# we only use es_conn, but for some reason, making the import more specific
# causes an import failure.
import goldstone

from django.conf import settings
from elasticsearch.exceptions import RequestError
import logging
from subprocess import check_call

from goldstone.celery import app as celery_app
from goldstone.utils import get_glance_client   # Defined here for easy mocking
from .models import resources, resource_types

logger = logging.getLogger(__name__)


@celery_app.task()
def delete_indices(prefix,
                   cutoff=None,
                   es_host=settings.ES_HOST,
                   es_port=settings.ES_PORT):
    """Cull old indices from Elasticsearch.

    Takes an index name prefix (ex: goldstone-) and a cutoff time in days
    Returns 0 or None if no cutoff was provided.
    """

    if cutoff is not None:
        cmd = "curator --host %s --port %s delete --prefix %s " \
              "--older-than %d" % (es_host, es_port, prefix, cutoff)
        return check_call(cmd.split())
    else:
        return "Cutoff was none, no action taken"


def _create_or_replace_alias(index_name, server=settings.ES_SERVER,
                             alias='goldstone'):
    """Manage an alias for an index.

    Takes an index name and an alias name.  If the alias does not exist,
    it is created and associated with the provided index name.  If the
    alias already exists, it is repointed at the provided index.
    """
    try:
        conn = goldstone.models.es_conn(server)
        if conn.indices.exists_alias(alias):
            conn.indices.update_aliases({
                "actions": [
                    {"remove": {"index": "_all", "alias": alias}},
                    {"add": {"index": index_name, "alias": alias}}
                ]
            })
        else:
            conn.indices.put_alias(alias, index_name)
    except Exception:         # pylint: disable=W0703
        logger.warn('Alias creation failed. Please report this.')
        raise


def create_index(name, body=None, server=settings.ES_SERVER):
    """Create an ES index with the provided name and body."""

    try:
        conn = goldstone.models.es_conn(server)
        conn.indices.create(name, body=body)
    except RequestError as exc:
        # Reraise anything that isn't index already exists
        if not exc.error.startswith('IndexAlreadyExistsException'):
            logger.warn('Index creation failed. Please report this error.')
            raise
        else:
            logger.debug('Attempt to create index %s failed. Already exists.',
                         name)


@celery_app.task()
def create_daily_index(basename='goldstone'):
    """Create a new index in ElasticSearch and set up the goldstone alias."""
    from datetime import date

    now = date.today()
    index_name = basename + "-" + now.strftime("%Y.%m.%d")

    try:
        create_index(index_name)
        return _create_or_replace_alias(index_name)
    except Exception:         # pylint: disable=W0703
        logger.error("Failed to create the daily goldstone index and/or"
                     "alias.  Please report this.")
        raise


def _add_edges(node):
    """Add edges from this resource graph node to its neighbors.

    This is driven by the node's type information in resource_types.

    :param node: A Resource graph node
    :type node: GraphNode

    """

    # Aliases to make the code less verbose
    MATCHING_ATTRIBUTES = settings.R_ATTRIBUTE.MATCHING_ATTRIBUTES
    TYPE = settings.R_ATTRIBUTE.TYPE

    def find_match(edge, neighbor_type):
        """Find the one node that matches the desired attribute, and add an
        edge to it from the source node.

        :param edge: An edge, as returned from the resource graph
        :type edge: 3-tuple
        :param neighbor_type: The type of the desired destination node
        :type neighbor_type: PolyResource subclass
        :return: An indication of success (True) or failure (False)
        :rtype: bool

        """

        # For all nodes that are of the desired type...
        for candidate in resources.nodes_of_type(neighbor_type):
            candidate_attribute_value = candidate.attributes.get(attribute)

            if candidate_attribute_value == node_attribute_value:
                # We have a match! Create the edge from the node to this
                # candidate.
                resources.graph.add_edge(
                    node,
                    candidate,
                    attr_dict={TYPE: edge[2][TYPE]})
                # Success return
                return True

        return False

    # For every possible edge from this node...
    for edge in resource_types.graph.out_edges(node.resourcetype, data=True):
        # For this edge, this is the neighbor's type.
        neighbor_type = edge[1]

        # Get the list of matching attributes we're to look for. We will use
        # the first one that works.
        for attribute in edge[2][MATCHING_ATTRIBUTES]:
            # Get the attribute's value for this node.
            node_attribute_value = node.attributes.get(attribute)

            # Find the first resource node that's a match.
            if find_match(edge, neighbor_type):
                # Success. Iterate to the next edge.
                break


@celery_app.task()
def reconcile_hosts():
    """Update the Resource graph nodes and edges from the current OpenStack
    cloud state.

    Nodes are:
       - deleted if they are no longer in the OpenStack cloud.
       - added if they are in the OpenStack cloud, but not in the graph.
       - updated from the cloud if they are already in the graph.

    """
    from goldstone.apps.glance.utils import reconcile_glance_hosts
    from goldstone.apps.nova.utils import reconcile_nova_hosts

    for services in [reconcile_glance_hosts, reconcile_nova_hosts]:
        services()
