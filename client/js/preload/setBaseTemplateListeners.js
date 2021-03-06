/**
 * Copyright 2015 Solinea, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
jQuery listeners to be instantiated after base.html template load.
Registering clicks on the menus and handling css changes that
govern the expanding menu actions.
*/


goldstone.setBaseTemplateListeners = function() {

    // tooltips for side-menu bar icons
    // trigger: 'hover' will dismiss when mousing-out
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    // when clicking the 'expand' arrow
    $('.menu-toggle').click(function() {

        // close alert menu
        $('.tab-content').removeClass('open');

        // expand/contract side menu
        $('.sidebar').toggleClass('expand-menu');

        // flip direction of expand icon
        $(this).find('.expand').toggleClass('open');

        // toggle menu slide-out for content and footer
        $('.content').toggleClass('open');
        $('.footer').toggleClass('open');
    });

    // icon / username top-right menu functionality 
    $('.user-control').click(function() {
        $('.menu-wrapper').slideToggle('fast');
    });
    $('.user-control').mouseleave(function() {
        $('.menu-wrapper').slideUp('fast');
    });

    // listener for alert divs visible in side alerts menu
    $('.remove-btn').click(function() {
        $(this).parent().remove();
    });

    $('.tab-links li').click(function() {
        // for tabs inside side alerts menu
        if ($(this).text() === 'Recent') {
            $(this).parent().find('.active').removeClass('active');
            $(this).addClass('active');
            $('.sub-tab-content').show();
            $('.all-tab-content').hide();
        } else {
            $(this).parent().find('.active').removeClass('active');
            $(this).addClass('active');
            $('.sub-tab-content').hide();
            $('.all-tab-content').show();
        }
    });

    // listener for sidebar menu alert tab
    $('.alerts-tab').on('click', function() {

        $('.tab-content').toggleClass('open');
        $('.tab-content').find('.tab').show();
    });

    // listener for left pointing close icon in alert menu
    $('.alert-close').on('click', function() {
        $('.tab-content').removeClass('open');
    });

    // function to remove existing menu tab highlighting
    // and highlight tab matching selector, if any
    var addMenuIconHighlighting = function(selector) {
        $('.btn-grp li').removeClass('active active-page');
        $(selector).addClass('active active-page');
    };

    var routeNameToIconClassHash = {
        discover: '.dashboard-tab',
        apiPerfReport: '.metrics-tab',
        topology: '.topology-tab',
        "nodeReport": '',
        "logSearch": '.reports-tab',
        "savedSearchLog": '.reports-tab',
        "eventsBrowser": '.reports-tab',
        "savedSearchEvent": '.reports-tab',
        "apiBrowser": '.reports-tab',
        "savedSearchApi": '.reports-tab',
        "settings": '',
        "tenant": '',
        compliance: '.compliance-tab'
    };

    var updateLicenseLink = function(name) {

        // if navigating to compliance, update license
        // link to proprietary software link
        if (name === 'compliance') {
            $('.dynamic-license').attr("href", "http://solinea.com/wp-content/uploads/2016/03/Solinea-Goldstone-Software-License-v1.0.pdf");
        } else {
            $('.dynamic-license').attr("href", "https://www.apache.org/licenses/LICENSE-2.0");
        }
    };

    // backbone router emits 'route' event on route change
    // and first argument is route name. Match to hash
    // to highlight the appropriate side menu nav icon
    goldstone.gsRouter.on('route', function(name) {
        addMenuIconHighlighting(routeNameToIconClassHash[name]);
        updateLicenseLink(name);
    });
};
