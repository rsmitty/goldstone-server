"""Nova app views.

This module contains all views for the OpenStack Nova application.

"""
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
# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import calendar
from datetime import datetime
import json
import logging

from django.http import HttpResponse, HttpResponseBadRequest
from django.views.generic import TemplateView
from elasticsearch import ElasticsearchException
import pandas as pd
from rest_framework import status

from .models import NovaApiPerfData, HypervisorStatsData, SpawnData, \
    ResourceData, AgentsData, AggregatesData, AvailZonesData, CloudpipesData, \
    FlavorsData, FloatingIpPoolsData, HostsData, HypervisorsData, \
    NetworksData, SecGroupsData, ServersData, ServicesData
from goldstone.views import TopLevelView, ApiPerfView as GoldstoneApiPerfView, \
    JSONView
from goldstone.views import _validate

logger = logging.getLogger(__name__)


class ReportView(TopLevelView):
    template_name = 'nova_report.html'


class ApiPerfView(GoldstoneApiPerfView):
    my_template_name = 'nova_api_perf.html'

    def _get_data(self, context):
        return NovaApiPerfData().get(context['start_dt'], context['end_dt'],
                                     context['interval'])


class SpawnsView(TemplateView):
    data = pd.DataFrame()

    def get_context_data(self, **kwargs):
        context = TemplateView.get_context_data(self, **kwargs)
        context['render'] = self.request.GET.get('render', "True"). \
            lower().capitalize()
        # use "now" if not provided, will calc start and interval in _validate
        context['end'] = self.request.GET.get('end', str(calendar.timegm(
            datetime.utcnow().timetuple())))
        context['start'] = self.request.GET.get('start', None)
        context['interval'] = self.request.GET.get('interval', None)

        # if render is true, we will return a full template, otherwise only
        # a json data payload
        if context['render'] == 'True':
            self.template_name = 'spawns.html'
        else:
            self.template_name = None

        return context

    def _handle_request(self, context):
        context = _validate(['start', 'end', 'interval', 'render'], context)

        if isinstance(context, HttpResponseBadRequest):
            # validation error
            return context

        logger.debug("[_handle_request] start_dt = %s", context['start_dt'])
        sd = SpawnData(context['start_dt'], context['end_dt'],
                       context['interval'])
        success_data = sd.get_spawn_success()
        failure_data = sd.get_spawn_failure()

        # there are a few cases to handle here
        #  - both empty: return empty dataframe
        #  - one empty: return zero filled column in non-empty dataframe
        #  - neither empty: merge them on the 'key' field

        if not (success_data.empty and failure_data.empty):
            if success_data.empty:
                failure_data['successes'] = 0
                self.data = failure_data
            elif failure_data.empty:
                success_data['failures'] = 0
                self.data = success_data
            else:
                self.data = pd.ordered_merge(
                    success_data, failure_data, on='timestamp')

        if not self.data.empty:
            logger.debug("[_handle_request] self.data = %s", self.data)
            self.data = self.data[['timestamp', 'successes', 'failures']]
            self.data = self.data.set_index('timestamp').fillna(0)
        else:
            logger.debug("[_handle_request] self.data is empty")

        response = self.data.transpose().to_dict(outtype='list')
        return response

    def render_to_response(self, context, **response_kwargs):
        """
        Overriding to handle case of data only request (render=False).  In
        that case an application/json data payload is returned.
        """
        try:
            response = self._handle_request(context)
            if isinstance(response, HttpResponseBadRequest):
                return response

            if self.template_name is None:
                return HttpResponse(json.dumps(response),
                                    content_type="application/json")

            return TemplateView.render_to_response(
                self, {'data': json.dumps(response)})

        except ElasticsearchException:
            return HttpResponse(
                content="Could not connect to the search backend",
                status=status.HTTP_504_GATEWAY_TIMEOUT)


class ResourceView(TemplateView):
    data = pd.DataFrame()
    # override in subclass
    my_template_name = None

    def get_context_data(self, **kwargs):
        context = TemplateView.get_context_data(self, **kwargs)
        context['render'] = self.request.GET.get('render', "True"). \
            lower().capitalize()
        # use "now" if not provided, will calc start and interval in _validate
        context['end'] = self.request.GET.get('end', str(calendar.timegm(
            datetime.utcnow().timetuple())))
        context['start'] = self.request.GET.get('start', None)
        context['interval'] = self.request.GET.get('interval', None)

        # if render is true, we will return a full template, otherwise only
        # a json data payload
        if context['render'] == 'True':
            self.template_name = self.my_template_name
        else:
            self.template_name = None

        return context

    def _handle_phys_and_virt_responses(self, phys, virt):
        # there are a few cases to handle here
        #  - both empty: return empty dataframe
        #  - virt empty: return physical data
        #  - neither empty: merge them on the 'key' field

        if not (phys.empty and virt.empty):
            # we shouldn't have a case where physical is empty, so raise
            # an exception
            if phys.empty:
                raise UnexpectedSearchResponse(
                    "[_handle_phys_and_virt_responses] no physical resource "
                    "statistics found")

            elif virt.empty:
                self.data = phys
                self.data.rename(columns={'total': 'total_phys'}, inplace=True)
                self.data = self.data[['timestamp', 'used', 'total_phys']]

            else:
                phys.rename(columns={'total': 'total_phys'}, inplace=True)
                del virt['used']
                virt.rename(columns={'total': 'total_virt'}, inplace=True)

                self.data = pd.ordered_merge(
                    phys, virt, on='timestamp')

                self.data['total_virt'].fillna(method='pad', inplace=True)
                self.data = self.data[['timestamp',
                                       'used',
                                       'total_phys',
                                       'total_virt']]



            # for the used columns, we want to fill NaNs with the last
            # non-zero value
            self.data['used'].fillna(method='pad', inplace=True)
            self.data['total_phys'].fillna(method='pad', inplace=True)

        if not self.data.empty:
            logger.debug("[_handle_phys_and_virt_responses] self.data = %s",
                         self.data)
            # make sure we're not sending any NaNs out the door
            self.data = self.data.set_index('timestamp').fillna(0)
        else:
            logger.debug("[_handle_phys_and_virt_responses] self.data is "
                         "empty")

        response = self.data.transpose().to_dict(outtype='list')
        return response

    def render_to_response(self, context, **response_kwargs):
        """
        Overriding to handle case of data only request (render=False).  In
        that case an application/json data payload is returned.
        """
        try:
            response = self._handle_request(context)
            if isinstance(response, HttpResponseBadRequest):
                return response

            if self.template_name is None:
                return HttpResponse(json.dumps(response),
                                    content_type="application/json")

            return TemplateView.render_to_response(
                self, {'data': json.dumps(response)})

        except ElasticsearchException:
            return HttpResponse(
                content="Could not connect to the search backend",
                status=status.HTTP_504_GATEWAY_TIMEOUT)


class CpuView(ResourceView):
    my_template_name = 'cpu.html'

    def _handle_request(self, context):
        context = _validate(['start', 'end', 'interval', 'render'], context)

        if isinstance(context, HttpResponseBadRequest):
            # validation error
            return context
        rd = ResourceData(context['start_dt'], context['end_dt'],
                          context['interval'])
        p_cpu = rd.get_phys_cpu()
        v_cpu = rd.get_virt_cpu()
        response = self._handle_phys_and_virt_responses(p_cpu, v_cpu)
        return response


class MemoryView(ResourceView):
    my_template_name = 'mem.html'

    def _handle_request(self, context):
        context = _validate(['start', 'end', 'interval', 'render'], context)

        if isinstance(context, HttpResponseBadRequest):
            # validation error
            return context
        rd = ResourceData(context['start_dt'], context['end_dt'],
                          context['interval'])
        p_mem = rd.get_phys_mem()
        v_mem = rd.get_virt_mem()
        response = self._handle_phys_and_virt_responses(p_mem, v_mem)
        return response


class DiskView(ResourceView):
    my_template_name = 'disk.html'

    def _handle_request(self, context):
        context = _validate(['start', 'end', 'interval', 'render'], context)

        if isinstance(context, HttpResponseBadRequest):
            # validation error
            return context

        rd = ResourceData(context['start_dt'], context['end_dt'],
                          context['interval'])
        # self.data = rd.get_phys_disk()
        p_disk = rd.get_phys_disk()
        response = self._handle_phys_and_virt_responses(p_disk, pd.DataFrame())
        return response


class LatestStatsView(TemplateView):
    template_name = 'latest_stats.html'

    def get_context_data(self, **kwargs):
        context = TemplateView.get_context_data(self, **kwargs)
        context['render'] = self.request.GET.get('render', "True"). \
            lower().capitalize()

        # if render is true, we will return a full template, otherwise only
        # a json data payload
        if context['render'] != 'True':
            self.template_name = None

        return context

    def render_to_response(self, context, **response_kwargs):

        try:
            model = HypervisorStatsData()
            response = model.get(1)

            if self.template_name:
                return TemplateView.render_to_response(
                    self, {'data': json.dumps(response)})
            else:
                return HttpResponse(json.dumps({'data': response}),
                                    content_type='application/json')
        except ElasticsearchException:
            return HttpResponse(
                content="Could not connect to the search backend",
                status=status.HTTP_504_GATEWAY_TIMEOUT)


class AgentsDataView(JSONView):
    model = AgentsData
    key = 'agents'


class AggregatesDataView(JSONView):
    model = AggregatesData
    key = 'aggregates'
    zone_key = 'availability_zone'


class AvailZonesDataView(JSONView):
    model = AvailZonesData
    key = 'availability_zones'


class CloudpipesDataView(JSONView):
    model = CloudpipesData
    key = 'cloudpipes'


class FlavorsDataView(JSONView):
    model = FlavorsData
    key = 'flavors'


class FloatingIpPoolsDataView(JSONView):
    model = FloatingIpPoolsData
    key = 'floating_ip_pools'


class HostsDataView(JSONView):
    model = HostsData
    key = 'hosts'
    zone_key = 'zone'


class HypervisorsDataView(JSONView):
    model = HypervisorsData
    key = 'hypervisors'


class NetworksDataView(JSONView):
    model = NetworksData
    key = 'networks'


class SecGroupsDataView(JSONView):
    model = SecGroupsData
    key = 'secgroups'


class ServersDataView(JSONView):
    model = ServersData
    key = 'servers'
    zone_key = 'OS-EXT-AZ:availability_zone'


class ServicesDataView(JSONView):
    model = ServicesData
    key = 'services'
    zone_key = 'zone'
