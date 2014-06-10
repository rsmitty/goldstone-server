# Copyright 2014 Solinea, Inc.
#
# Licensed under the Solinea Software License Agreement (goldstone),
# Version 1.0 (the "License"); you may not use this file except in compliance
# with the License. You may obtain a copy of the License at:
#
#     http://www.solinea.com/goldstone/LICENSE.pdf
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

__author__ = 'John Stanford'

from django.db import models
from goldstone.models import ApiPerfData, TopologyData


class ApiPerfData(ApiPerfData):
    component = 'cinder'


class ServiceData(TopologyData):
    _DOC_TYPE = 'cinder_service_list'
    _INDEX_PREFIX = 'goldstone'


class VolumeData(TopologyData):
    _DOC_TYPE = 'cinder_volume_list'
    _INDEX_PREFIX = 'goldstone'


class BackupData(TopologyData):
    _DOC_TYPE = 'cinder_backup_list'
    _INDEX_PREFIX = 'goldstone'


class SnapshotData(TopologyData):
    _DOC_TYPE = 'cinder_snapshot_list'
    _INDEX_PREFIX = 'goldstone'


class VolTypeData(TopologyData):
    _DOC_TYPE = 'cinder_voltype_list'
    _INDEX_PREFIX = 'goldstone'


class EncryptionTypeData(TopologyData):
    _DOC_TYPE = 'cinder_encrypttype_list'
    _INDEX_PREFIX = 'goldstone'


class TransferData(TopologyData):
    _DOC_TYPE = 'cinder_transfer_list'
    _INDEX_PREFIX = 'goldstone'
