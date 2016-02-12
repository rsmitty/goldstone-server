# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_auto_20160129_1916'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='fixedip',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='floatingip',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='floatingippool',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='healthmonitor',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='lbmember',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='lbpool',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='lbvip',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='meteringlabel',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='meteringlabelrule',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='network',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='neutron',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='neutronquota',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='port',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='remotegroup',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='router',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='securitygroup',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='securityrules',
            name='polyresource_ptr',
        ),
        migrations.RemoveField(
            model_name='subnet',
            name='polyresource_ptr',
        ),
        migrations.DeleteModel(
            name='FixedIP',
        ),
        migrations.DeleteModel(
            name='FloatingIP',
        ),
        migrations.DeleteModel(
            name='FloatingIPPool',
        ),
        migrations.DeleteModel(
            name='HealthMonitor',
        ),
        migrations.DeleteModel(
            name='LBMember',
        ),
        migrations.DeleteModel(
            name='LBPool',
        ),
        migrations.DeleteModel(
            name='LBVIP',
        ),
        migrations.DeleteModel(
            name='MeteringLabel',
        ),
        migrations.DeleteModel(
            name='MeteringLabelRule',
        ),
        migrations.DeleteModel(
            name='Network',
        ),
        migrations.DeleteModel(
            name='Neutron',
        ),
        migrations.DeleteModel(
            name='NeutronQuota',
        ),
        migrations.DeleteModel(
            name='Port',
        ),
        migrations.DeleteModel(
            name='RemoteGroup',
        ),
        migrations.DeleteModel(
            name='Router',
        ),
        migrations.DeleteModel(
            name='SecurityGroup',
        ),
        migrations.DeleteModel(
            name='SecurityRules',
        ),
        migrations.DeleteModel(
            name='Subnet',
        ),
    ]