goldstone.namespace('nova.dom')
goldstone.namespace('nova.discover')
goldstone.namespace('nova.report')
goldstone.namespace('nova.spawns')
goldstone.namespace('nova.spawns.renderlets')
goldstone.namespace('nova.cpu')
goldstone.namespace('nova.cpu.renderlets')
goldstone.namespace('nova.mem')
goldstone.namespace('nova.mem.renderlets')
goldstone.namespace('nova.disk')
goldstone.namespace('nova.disk.renderlets')
goldstone.namespace('nova.zones')
goldstone.namespace('nova.zones.renderlets')

goldstone.nova._url = function (ns, start, end, interval, render, path) {
    "use strict";
    var gt = goldstone.time
    start = start ? gt.toPyTs(start) : gt.toPyTs(ns.start)
    end = end ? gt.toPyTs(end) : gt.toPyTs(ns.end)
    interval = interval ? interval : ns.interval

    var url = path +
        "?start=" + start +
        "&end=" + end +
        "&interval=" + interval
    if (typeof render !== 'undefined') {
        url += "&render=" + render
    }
    return url
}

goldstone.nova.spawns.url = function (start, end, interval, render) {
    "use strict";
    var ns = goldstone.nova.spawns,
        path = "/nova/hypervisor/spawns"
    return goldstone.nova._url(ns, start, end, interval, render, path)
}

goldstone.nova.cpu.url = function (start, end, interval, render) {
    "use strict";
    var ns = goldstone.nova.cpu,
        path = "/nova/hypervisor/cpu"
    return goldstone.nova._url(ns, start, end, interval, render, path)
}

goldstone.nova.mem.url = function (start, end, interval, render) {
    "use strict";
    var ns = goldstone.nova.mem,
        path = "/nova/hypervisor/mem"
    return goldstone.nova._url(ns, start, end, interval, render, path)
}


goldstone.nova.disk.url = function (start, end, interval, render) {
    "use strict";
    var ns = goldstone.nova.disk,
        path = "/nova/hypervisor/disk"
    return goldstone.nova._url(ns, start, end, interval, render, path)
}

goldstone.nova.zones.url = function (start, end, interval, render) {
    "use strict";
    var ns = goldstone.nova.zones,
        path = "/nova/zones"
    return goldstone.nova._url(ns, start, end, interval, render, path)
}

goldstone.nova._loadUrl = function (ns, start, end, interval, location, render) {
    "use strict";
    location = location ? location : ns.parent

    ns.parent = location
    ns.start = start
    ns.end = end
    ns.interval = interval

    render = typeof render !== 'undefined' ? render : false
    if (render) {
        $(ns.parent).load(ns.url(start, end, interval, render))
    } else {
        // just get the data and set it in the spawn object
        $.getJSON(ns.url(start, end, interval, render), function (data) {
            ns.data = data
            // TODO trigger a redraw of the chart with the new data
        })
    }
}

goldstone.nova.spawns.loadUrl = function (start, end, interval, location, render) {
    "use strict";
    var ns = goldstone.nova.spawns

    goldstone.nova._loadUrl(ns, start, end, interval, location, render)
}

goldstone.nova.cpu.loadUrl = function (start, end, interval, location, render) {
    "use strict";
    var ns = goldstone.nova.cpu

    goldstone.nova._loadUrl(ns, start, end, interval, location, render)
}

goldstone.nova.mem.loadUrl = function (start, end, interval, location, render) {
    "use strict";
    var ns = goldstone.nova.mem

    goldstone.nova._loadUrl(ns, start, end, interval, location, render)
}

goldstone.nova.disk.loadUrl = function (start, end, interval, location, render) {
    "use strict";
    var ns = goldstone.nova.disk

    goldstone.nova._loadUrl(ns, start, end, interval, location, render)
}

goldstone.nova.zones.loadUrl = function (start, end, interval, location, render) {
    "use strict";
    var ns = goldstone.nova.zones

    goldstone.nova._loadUrl(ns, start, end, interval, location, render)
}

goldstone.nova.spawns.drawChart = function () {
    // now we can customize it to handle our data.  Data structure looks like:
        // {'timestamp'(String): [successes(Number), failures(Number)], ...}
    var ns = goldstone.nova.spawns
    if (ns.data !== 'undefined') {
        if (Object.keys(ns.data).length === 0) {
            $(ns.location).append("<p> Response was empty.")
            $(ns.spinner).hide()
        } else {
            // this gets us a basic chart
            ns.chart = goldstone.charts.lineChartBase(ns.location, null, ns.renderlets.clickDrill)
            var events = _.map(ns.data, function (v, k) {
                return [new Date(Number(k)), v[0], v[1]]
            })
            var xf = crossfilter(events),
                timeDim = xf.dimension(function (d) {
                    return d[0]
                }),
                minDate = timeDim.bottom(1)[0][0],
                maxDate = timeDim.top(1)[0][0],
                successGroup = timeDim.group().reduceSum(function (d) { return d[1] }),
                failureGroup = timeDim.group().reduceSum(function (d) { return d[2] })

            ns.chart
                .height(ns.height)
                .elasticY(true)
                .hidableStacks(true)
                .dimension(timeDim)
                .group(successGroup, "Success").valueAccessor(function (d) {
                    return d.value
                })
                .stack(failureGroup, "Fail", function (d) {
                    return d.value
                })
                .x(d3.time.scale().domain([minDate, maxDate]))
                .title(function (d) {
                    return d.key + ": " + d.value + " events"
                })
                .yAxisLabel("Spawn Events")
                .legend(dc.legend().x(45).y(0).itemHeight(15).gap(5).horizontal(true))

            ns.chart.render()
            $(ns.spinner).hide()
        }
    }
}

goldstone.nova.spawns.renderlets.clickDrill = function (_chart) {
    "use strict";
    var ns = goldstone.nova.spawns
    var gt = goldstone.time
    _chart.selectAll("circle.dot")
        .on("click", function (d) {
            var oldInterval = Number(ns.interval.slice(0, -1))
            var start = (new Date(d.data.key)).addSeconds(-1 * oldInterval),
                end = (new Date(d.data.key)).addSeconds(oldInterval),
                newInterval = gt.autoSizeInterval(start, end)

            ns.loadUrl(start, end, newInterval, ns.parent, true)

        })
}

goldstone.nova.cpu.drawChart = function () {
    // now we can customize it to handle our data.  Data structure looks like:
        // {'timestamp'(String): [total_phys(Number), used_phys(Number),
        //                       [total_virt(Number), used_virt(Number)], ...}
    var ns = goldstone.nova.cpu
    if (ns.data !== 'undefined') {
        if (Object.keys(ns.data).length === 0) {
            $(ns.location).append("<p> Response was empty.")
            $(ns.spinner).hide()
        } else {
            // this gets us a basic chart
            ns.chart = goldstone.charts.lineChartBase(ns.location, null, ns.renderlets.clickDrill)
            var events = _.map(ns.data, function (v, k) {
                return [new Date(Number(k)), v[0], v[1], v[2], v[3]]
            })
            var xf = crossfilter(events),
                timeDim = xf.dimension(function (d) {
                    return d[0]
                }),
                minDate = timeDim.bottom(1)[0][0],
                maxDate = timeDim.top(1)[0][0],
                totalPhys = timeDim.group().reduceSum(function (d) { return d[1] }),
                usedPhys = timeDim.group().reduceSum(function (d) { return d[2] }),
                totalVirt = timeDim.group().reduceSum(function (d) { return d[3] }),
                usedVirt = timeDim.group().reduceSum(function (d) { return d[4] })

            ns.chart
                .height(ns.height)
                .elasticY(true)
                .hidableStacks(true)
                .dimension(timeDim)
                .group(usedVirt, "Used vCPUs").valueAccessor(function (d) {
                    return d.value
                })
                .stack(usedPhys, "Used pCPUs", function (d) {
                    return d.value
                })
                .stack(totalPhys, "Total pCPUs", function (d) {
                    return d.value
                })
                .stack(totalVirt, "Total vCPUs", function (d) {
                    return d.value
                })
                .x(d3.time.scale().domain([minDate, maxDate]))
                .title(function (d) {
                    return d.key + ": " + d.value
                })
                .yAxisLabel("CPU Count")
                .legend(dc.legend().x(45).y(0).itemHeight(15).gap(5).horizontal(true))

            ns.chart.render()
            $(ns.spinner).hide()
        }
    }
}

goldstone.nova.mem.drawChart = function () {
    // now we can customize it to handle our data.  Data structure looks like:
        // {'timestamp'(String): [total_phys(Number), used_phys(Number),
        //                       [total_virt(Number), used_virt(Number)], ...}
    var ns = goldstone.nova.mem
    if (ns.data !== 'undefined') {
        if (Object.keys(ns.data).length === 0) {
            $(ns.location).append("<p> Response was empty.")
            $(ns.spinner).hide()
        } else {
            // this gets us a basic chart
            ns.chart = goldstone.charts.lineChartBase(ns.location, null, ns.renderlets.clickDrill)
            var events = _.map(ns.data, function (v, k) {
                return [new Date(Number(k)), v[0], v[1], v[2], v[3]]
            })
            var xf = crossfilter(events),
                timeDim = xf.dimension(function (d) {
                    return d[0]
                }),
                minDate = timeDim.bottom(1)[0][0],
                maxDate = timeDim.top(1)[0][0],
                totalPhys = timeDim.group().reduceSum(function (d) { return d[1] }),
                usedPhys = timeDim.group().reduceSum(function (d) { return d[2] }),
                totalVirt = timeDim.group().reduceSum(function (d) { return d[3] }),
                usedVirt = timeDim.group().reduceSum(function (d) { return d[4] })

            ns.chart
                .height(ns.height)
                .elasticY(true)
                .hidableStacks(true)
                .dimension(timeDim)
                .group(usedVirt, "Used vRAM").valueAccessor(function (d) {
                    return d.value
                })
                .stack(usedPhys, "Used pRAM", function (d) {
                    return d.value
                })
                .stack(totalPhys, "Total pRAM", function (d) {
                    return d.value
                })
                .stack(totalVirt, "Total vRAM", function (d) {
                    return d.value
                })
                .x(d3.time.scale().domain([minDate, maxDate]))
                .title(function (d) {
                    return d.key + ": " + d.value
                })
                .yAxisLabel("RAM GBs")
                .legend(dc.legend().x(45).y(0).itemHeight(15).gap(5).horizontal(true))

            ns.chart.render()
            $(ns.spinner).hide()
        }
    }
}

goldstone.nova.disk.drawChart = function () {
    // now we can customize it to handle our data.  Data structure looks like:
        // {'timestamp'(String): [successes(Number), failures(Number)], ...}
    var ns = goldstone.nova.disk
    if (ns.data !== 'undefined') {
        if (Object.keys(ns.data).length === 0) {
            $(ns.location).append("<p> Response was empty.")
            $(ns.spinner).hide()
        } else {
            // this gets us a basic chart
            ns.chart = goldstone.charts.lineChartBase(ns.location, null, ns.renderlets.clickDrill)
            var events = _.map(ns.data, function (v, k) {
                return [new Date(Number(k)), v[0], v[1]]
            })
            var xf = crossfilter(events),
                timeDim = xf.dimension(function (d) {
                    return d[0]
                }),
                minDate = timeDim.bottom(1)[0][0],
                maxDate = timeDim.top(1)[0][0],
                totalPhys = timeDim.group().reduceSum(function (d) { return d[1] }),
                usedPhys = timeDim.group().reduceSum(function (d) { return d[2] })

            ns.chart
                .height(ns.height)
                .elasticY(true)
                .hidableStacks(true)
                .dimension(timeDim)
                .group(usedPhys, "Used").valueAccessor(function (d) {
                    return d.value
                })
                .stack(totalPhys, "Total", function (d) {
                    return d.value
                })
                .x(d3.time.scale().domain([minDate, maxDate]))
                .title(function (d) {
                    return d.key + ": " + d.value
                })
                .yAxisLabel("Disk GB")
                .legend(dc.legend().x(45).y(0).itemHeight(15).gap(5).horizontal(true))

            ns.chart.render()
            $(ns.spinner).hide()
        }
    }
}

/*
A collabsible tree view of the nova zone heirarchy
 */
goldstone.nova.zones.drawChart = function () {
    "use strict";
    var ns = goldstone.nova.zones,
        i = 0,
        m = [20, 80, 20, 80],
        panelWidth = $(ns.location).width() - m[1] - m[3],
        panelHeight = ns.height - m[0] - m[2],
        tree = d3.layout.tree().size([ns.height, panelWidth]),
        diagonal = d3.svg.diagonal()
            .projection(function (d) { return [d.y, d.x]; }),
        vis = d3.select(ns.location).append("svg")
            .attr("width", panelWidth + m[1] + m[3])
            .attr("height", panelHeight + m[0] + m[2])
            .append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")"),
        root



    if (ns.data !== 'undefined') {
        if (Object.keys(ns.data).length === 0) {
            $(ns.location).append("<p> Response was empty.")
            $(ns.spinner).hide()
        } else {
            (function (json) {
                root = json
                root.x0 = panelHeight / 2
                root.y0 = 0

                console.log("root[x0,y0] = [" + root.x0 + ", " + root.y0 + "]")

                function toggleAll(d) {
                    if (d.children) {
                        d.children.forEach(toggleAll)
                        toggle(d)
                    }
                }

                // Initialize the display to show only the first tier of children
                root.children.forEach(toggleAll)
                update(root)
            })(ns.data);
        }
    }

    function update(source) {
        var duration = d3.event && d3.event.altKey ? 5000 : 500;

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse();

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            // TODO make the tree branch length configurable
            d.y = d.depth * 120;
        });

        // Update the nodes…
        var node = vis.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("svg:g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on("click", function (d) {
                toggle(d);
                update(d);
            });

        nodeEnter.append("image")
            .attr("class", "network-icon")
            .attr("xlink:href", "/static/images/icon_network.svg")
            .attr("width", 1e-6)
            .attr("height", 1e-6)
            .attr("x", -10)
            .style("fill", function (d) {
                    return d._children ? "lightsteelblue" : "#fff";
                });

        //nodeEnter.append("svg:circle")
        //    .attr("r", 1e-6)
        //    .style("fill", function (d) {
        //        return d._children ? "lightsteelblue" : "#fff";
        //    });

        nodeEnter.append("svg:text")
            //.attr("x", function (d) {
            //    return d.children || d._children ? -10 : 10;
            //})
            .attr("x", 0)
            .attr("dy", "-1em")
            .attr("text-anchor", "middle")
            //.attr("text-anchor", function (d) {
            //    return d.children || d._children ? "end" : "start";
            //})
            .text(function (d) {
                return d.name;
            })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select(".network-icon")
            .attr("height", 20)
            .attr("width", 20)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = vis.selectAll("path.link")
            .data(tree.links(nodes), function (d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function (d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            })
            .transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function (d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Toggle children.
    function toggle(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
    }
}

