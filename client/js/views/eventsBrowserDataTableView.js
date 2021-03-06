/**
 * Copyright 2016 Solinea, Inc.
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
the jQuery dataTables plugin is documented at
http://datatables.net/reference/api/

instantiated on eventsBrowserPageView as:

this.eventsSearchObserverCollection = new SearchObserverCollection({

    // overwriting to call timestamp instead of "@timestamp"
    addRange: function() {
        return '?timestamp__range={"gte":' + this.gte + ',"lte":' + this.epochNow + '}';
    },

    urlBase: '/core/events/',
    skipFetch: true
});

this.eventsBrowserView = new ChartSet({

    // overwrite processListeners
    processListeners: function() {
        var self = this;

        // registers 'sync' event so view 'watches' collection for data update
        if (this.collection) {
            this.listenTo(this.collection, 'sync', this.update);
            this.listenTo(this.collection, 'error', this.dataErrorMessage);
        }

        this.listenTo(this, 'lookbackSelectorChanged', function() {
            self.showSpinner();
            self.collection.triggerDataTableFetch();
        });
    },

    chartTitle: goldstone.contextTranslate('Event Search', 'eventsbrowser'),
    collection: this.eventsSearchObserverCollection,
    el: '#events-histogram-visualization',
    marginLeft: 60,
    width: $('#events-histogram-visualization').width(),
    yAxisLabel: goldstone.contextTranslate('Number of Events', 'eventsbrowser')
});

*/

var EventsBrowserDataTableView = DataTableBaseView.extend({

    instanceSpecificInit: function() {
        EventsBrowserDataTableView.__super__.instanceSpecificInit.apply(this, arguments);
        this.processListenersForServerSide();
        this.renderFreshTable();
        this.initializeSearchTableServerSide('#reports-result-table');
    },

    update: function() {
        this.oTable.ajax.reload();
    },

    oTableParamGeneratorBase: function() {
        var self = this;
        var standardAjaxOptions = {

            // corresponds to 'show xx entries' selector
            "iDisplayLength": self.cachedPageSize,

            // corresponds to 'showing x to y of z entries' display
            // and affects which pagination selector is active
            "iDisplayStart": self.cachedPaginationStart,
            "lengthChange": true,

            // populate search input box with string, if present
            "oSearch": {
                sSearch: self.cachedSearch
            },
            "ordering": true,
            "processing": false,
            "paging": true,
            "scrollX": true,
            "searching": true,
            "serverSide": true,
            "ajax": {
                beforeSend: function(obj, settings) {
                    self.hideSpinner();

                    // having the results of the last render that fit the
                    // current heading structure will allow to return it to 
                    // the table that is about to be destroyed and overwritten.
                    // just returning an empty set will cause a disorienting
                    // flash when the table is destroyed, prior to the next
                    // one being constructed.
                    self.mockForAjaxReturn = self.cachedResults;

                    // store the browser page height to restore it post-render
                    self.currentTop = $(document).scrollTop();
                    self.currentScrollLeft = $('.dataTables_scrollBody').scrollLeft();

                    // call the url generation function that will
                    // create the url string to replace the
                    // datatables native url generation
                    self.collectionMixin.urlGenerator();

                    // extraction methods defined on dataTableBaseView
                    // for the dataTables generated url string that will
                    //  be replaced by self.collectionMixin.url after
                    // the required components are parsed out of it
                    var pageSize = self.getPageSize(settings.url);
                    var searchQuery = self.getSearchQuery(settings.url);
                    var paginationStart = self.getPaginationStart(settings.url);
                    var computeStartPage = Math.floor(paginationStart / pageSize) + 1;
                    var sortByColumnNumber = self.getSortByColumnNumber(settings.url);
                    var sortAscDesc = self.getSortAscDesc(settings.url);

                    // cache values for next serverside deferred rendering
                    self.cachedSearch = searchQuery;

                    // convert strings to numbers for both
                    self.cachedPageSize = parseInt(pageSize, 10);
                    self.cachedPaginationStart = parseInt(paginationStart, 10);

                    // cache ordering column and direction to highlight the 
                    // selected column upon next table rendering
                    self.cachedSortAscDesc = sortAscDesc;
                    self.cachedSortByColumnNumber = parseInt(sortByColumnNumber, 10);

                    // the url that will be fetched is now about to be
                    // replaced with the urlGen'd url before adding on
                    // the parsed components
                    settings.url = self.collectionMixin.url + "&page_size=" + pageSize +
                        "&page=" + computeStartPage;

                    // here begins the combiation of additional params
                    // to construct the final url for the dataTable fetch
                    if (searchQuery) {
                        settings.url += "&_all__regexp=.*" +
                            searchQuery + ".*";
                    }

                    // ordering by column

                    /*
                    columnLabelHash is now being dynamically generated
                    before this standardAjaxOptions is returned.

                    var columnLabelHash = {
                        0: 'timestamp',
                        1: 'eventType',
                        ... dynamically constructed
                    };
                    */

                    var ascDec = {
                        asc: '',
                        'desc': '-'
                    };

                    if (this.columnLabelHash[sortByColumnNumber]) {

                        var nameToStore = this.columnLabelHash[sortByColumnNumber];
                        // correct for vagaries in ES results
                        if (nameToStore === 'eventTime') {
                            nameToStore = 'timestamp';
                        }

                        // store the columnHeadingByName of the actual sort column that was clicked
                        self.cachedColumnHeadingByName = this.columnLabelHash[sortByColumnNumber];

                        settings.url = settings.url + "&ordering=" + ascDec[sortAscDesc] + nameToStore;
                    }


                },
                dataSrc: "results",
                dataFilter: function(data) {
                    data = JSON.parse(data);

                    // eventViz will handle rendering of aggregations
                    self.sendAggregationsToViz(data);

                    data = self.serverSideDataPrep(data);

                    // add to JavaScript engine event loop to be handled
                    // after the function returns and the table
                    // renders the 'throw-away' version of the table
                    setTimeout(function() {
                        self.createNewDataTableFromResults(self.cachedTableHeadings, self.cachedResults);

                    }, 0);

                    // make the 'throw-away' version identical to the
                    // currently rendered table for better UX
                    if (self.mockForAjaxReturn) {
                        return JSON.stringify(
                            self.mockForAjaxReturn
                        );
                    } else {

                        // upon instantiation, just render empty dataTable
                        return JSON.stringify({
                            results: []
                        });
                    }
                },
            }
        }; // end standardAjaxOptions

        // in the case of their being cached data from the last call,
        // deferLoading will skip the ajax call and use the 
        // data already present in the dom
        if (self.cachedResults) {

            // sets 'z' in 'showing x to y of z records'
            standardAjaxOptions.deferLoading = self.cachedResults.recordsTotal;
        }

        // standardAjaxOptions.ajax.columnLabelHash = {
        //     0: 'timestamp',
        //     1: 'eventType',
        //    ...
        // };

        // set up the dynamic column label ordering scheme
        standardAjaxOptions.ajax.columnLabelHash = self.createHashFromArray(self.cachedHeadingArray);

        // set up the proper column heading ordering arrow
        if ((this.cachedSortByColumnNumber !== undefined) && this.cachedSortAscDesc) {

            // find the clicked column label in the hash
            var newIndexOfSortColumn = _.findKey(standardAjaxOptions.ajax.columnLabelHash, function(item) {
                return item === self.cachedColumnHeadingByName;
            });

            // if the sort column is no longer existent, don't 
            // impose a sort order on the table 
            if (newIndexOfSortColumn !== undefined) {
                standardAjaxOptions.order = [
                    [newIndexOfSortColumn, this.cachedSortAscDesc]
                ];
            }
        }

        // will be used as the 'options' when instantiating dataTable
        return standardAjaxOptions;
    },

    createHashFromArray: function(arr) {
        var result = {};

        if (!arr) {
            return {
                0: 'eventTime'
            };
        }

        _.each(arr, function(item, key) {
            result[key] = item;
        });

        return result;
    },

    prepDataForViz: function(data) {
        // initialize container for formatted results
        var finalResult = [];

        // for each array index in the 'data' key
        _.each(data.aggregations.per_interval.buckets, function(item) {
            var tempObj = {};
            tempObj.time = item.key;
            tempObj.count = item.doc_count;
            finalResult.push(tempObj);
        });

        return finalResult;
    },

    sendAggregationsToViz: function(data) {

        // send data to collection to be rendered via eventBrowserView
        // when the 'sync' event is triggered
        this.collectionMixin.reset();
        this.collectionMixin.add(this.prepDataForViz(data));
        this.collectionMixin.trigger('sync');
    },

    createNewDataTableFromResults: function(headings, results) {

        // at least one <th> required or else dataTables will error
        headings = headings || '<th></th>';

        // removes dataTable handling of table (sorting/searching/pagination)
        // but visible data remaions in DOM
        this.oTableApi.fnDestroy();

        // cache updated headings
        this.serverSideTableHeadings = headings;
        this.renderFreshTable();

        // construct table html from results matrix
        var constructedResults = '';
        _.each(results.results, function(line) {
            constructedResults += '<tr><td>';
            constructedResults += line.join('</td><td>');
            constructedResults += '</td></tr>';
        });

        // insert constructed table html into DOM target
        this.$el.find('.data-table-body').html(constructedResults);

        // 'turn on' dataTables handling of table in DOM.
        this.initializeSearchTableServerSide('#reports-result-table');

    },

    serverSideDataPrep: function(data) {
        var result = {

            // run results through pre-processing step
            results: this.extractUniqAndDataSet(data.results),
            recordsTotal: data.count,
            recordsFiltered: data.count
        };
        this.cachedResults = result;
        result = JSON.stringify(result);
        return result;
    },

    // just an empty <th> element for initial render.
    serverSideTableHeadings: '' +
        '<th></th>',

    extractUniqAndDataSet: function(data) {
        var self = this;

        // strip object down to things in 'traits' and then
        // flatten object before returning it to the dataPrep function
        var result = data.map(function(record) {
            return record._source.traits;
        });

        var uniqueObjectKeys = _.uniq(_.flatten(result.map(function(record) {
            return _.keys(record);
        })));


        // START SORT

        // sort uniqueHeadings to favor order defined
        // by the hash in this.headingsToPin

        // if there is a unique key with "name" somewhere in it,
        // reorder the keys so that it is first
        var keysWithName = [];
        for (var i = 0; i < uniqueObjectKeys.length; i++) {
            var item = uniqueObjectKeys[i];
            if (this.isPinnedHeading(item)) {
                var spliced = uniqueObjectKeys.splice(i, 1);
                keysWithName[this.headingsToPin[item]] = spliced;
                i--;
            } else {
                continue;
            }
        }

        // keysWithName have been pulled out, now remove artifacts
        keysWithName = this.pruneUndefinedValues(keysWithName);

        // and sort remaining uniqueObjectKeys (sans keysWithName)
        uniqueObjectKeys = this.sortRemainingKeys(uniqueObjectKeys);

        // now put the keysWithName back at the beginning of the
        // uniqueObjectKeys array
        _.each(keysWithName, function(item) {
            uniqueObjectKeys.unshift(item[0]);
        });


        // store the sorted list so it can be used to create a map for
        // the column that is clicked for sorting
        self.cachedHeadingArray = uniqueObjectKeys;

        // END SORT

        // now use the uniqueObjectKeys to construct the table header
        // for the upcoming render
        var headerResult = '';
        _.each(uniqueObjectKeys, function(heading) {
            headerResult += '<th>' + heading + '</th>';
        });

        // and store for later
        self.cachedTableHeadings = headerResult;

        // make nested arrays of the final data to return
        // any undefined values will be replaced with empty string
        var finalResult = result.map(function(unit) {
            return _.map(uniqueObjectKeys, function(heading) {
                return unit[heading] || '';
            });
        });

        return finalResult;
    },

    // keys will be pinned in ascending value order of key:value pair
    headingsToPin: {
        'eventTime': 0,
        'eventType': 1,
        'id': 2,
        'action': 3,
        'outcome': 4
    },

    // main template with placeholder for table
    template: _.template(
        '<div class="alert alert-danger popup-message" hidden="true"></div>' +
        '<div class="refreshed-report-container"></div>'
    ),

    // table to be used with dataTables
    // dynamic headers to be inserted in the 'data-table-header-container'
    dataTableTemplate: _.template(
        '<table id="reports-result-table" class="table table-hover">' +
        '<thead class="data-table-thead">' +
        '<tr class="header data-table-header-container">' +

        // <th> elements will be dynamically inserted
        '</tr>' +
        '</thead>' +
        '<tbody class="data-table-body"></tbody>' +
        '</table>'
    ),

    renderFreshTable: function() {

        // the main table template only needs to be added once, to avoid 
        // poor UX from erasing and re-rendering entire table.
        if (!$('.data-table-body').length) {
            $(this.el).find('.refreshed-report-container').html(this.dataTableTemplate());
        }

        // add the default or generated table headings
        $(this.el).find('.data-table-header-container').html(this.serverSideTableHeadings);

        return this;
    },

    initializeSearchTableServerSide: function(location) {
        // params will include "deferLoading" after initial table rendering
        // in order for table to be able to recursively spawn itself
        // without infinite loop
        var oTableParams = this.oTableParamGeneratorBase();

        // initialize dataTable
        this.oTable = $(location).DataTable(oTableParams);

        // set reference to dataTable api to be used for fnDestroy();
        this.oTableApi = $(location).dataTable();

        // bring focus to search box
        if ($('input.form-control').val() !== undefined) {
            $('input.form-control').focus();

            // firefox puts the cursor at the beginning of the search box
            // after re-focus. Use the native 'input' element method
            // setSelectionRange to force cursor position to end of input box
            if ($('input')[0].setSelectionRange) {
                var len = $('input.form-control').val().length * 2; // ensure end
                $('input.form-control')[0].setSelectionRange(len, len);
            } else {

                // IE hack, replace input with itself, hopefully to 
                // end up with cursor at end of input element
                $('input.form-control').val($('input.form-control').val());
            }

            // in case input element is a text field
            $('input.form-control').scrollTop = 1e6;
        }

        // reposition page to pre-refresh height
        if (this.currentTop !== undefined) {
            $(document).scrollTop(this.currentTop);
        }
        if (this.currentScrollLeft !== undefined) {
            $('.dataTables_scrollBody').scrollLeft(this.currentScrollLeft);
        }
    }
});
