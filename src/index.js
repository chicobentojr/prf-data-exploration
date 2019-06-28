let map = null;
let markers = null;
let markersLayerGroup = null;
let data = null;

const filtersChart = document.getElementById('filters-chart');

let charts = {}

const getPointDetails = (point) => {
    return Object.keys(point).reduce((a, k) => {
        return `${a}${k}: ${point[k]}<br>`
    }, '');
}

const convertPointsToMarkers = (points) =>
    points.map((p) =>
        L.circleMarker([p.latitude, p.longitude], {
            color: '#3388ff'
        }).bindPopup(getPointDetails(p))
    )

const addFiltersElements = (keys) => {
    console.log('keys', keys)
    console.log(filtersChart)

    // keys.map(k => {
    let a = ['pessoas', 'mortos']
    keys.map((k, i) => {
        // console.log('k', k)
        if (k !== 'id') {
            filtersChart.innerHTML += `
            <div class="clearfix"></div>
                <div>
                    <h4>${k}</h4>
                    <div id='bar-chart-${k}'></div>
                </div>
            `
            console.log('adding chart')
            console.log(i)
            setTimeout(function () {
                console.log('timing out')
                addChartFilter(k)
            }, i * 0)
        }
    })
    dc.renderAll()
}

const addChartFilter = (field) => {

    console.log('addding filter')
    console.log(data)

    var ndx = crossfilter(data);
    var all = ndx.groupAll();

    console.log(all)

    charts[field] = dc.barChart(`#bar-chart-${field}`);

    var fluctuation = ndx.dimension(function (d) {
        return d[field];
    });
    var fluctuationGroup = fluctuation.group().reduceCount();


    charts[field] /* dc.barChart('#volume-month-chart', 'chartGroup') */
        .width(300)
        .height(180)
        .margins({ top: 10, right: 50, bottom: 30, left: 40 })
        .dimension(fluctuation)
        .group(fluctuationGroup)
        .elasticY(true)
        .filterPrinter(function (filters) {
            console.log(filters)
            rd = fluctuation.filter(filters[0])
            nd = rd.top(Infinity);
            updateData(nd)
            return filters;
        })
        .x(d3.scaleLinear()
            .domain([0, 15])
            .rangeRound([0, 500]))

        ;
    charts[field].xAxis().tickFormat(
        function (v) { return v });
    charts[field].yAxis().ticks(5);

    charts[field].render()

}

const loadData = (map) => {
    console.log('loading data');

    Papa.parse('/src/data/datatran2018.csv', {
        delimiter: ';',
        header: true,
        download: true,
        complete: (results) => {
            console.log('Data Loaded')
            console.log(results)
            dataLoaded(map, results.data.slice(0, 100))
            addFiltersElements(Object.keys(results.data[0]))
        }
    })
}

const dataLoaded = (map, points) => {
    data = points;
    markers = convertPointsToMarkers(points)

    markersLayerGroup = L.layerGroup(markers).addTo(map)

    // addHeatMap(map, data)
    // plotFilters(map, points)
}

const addHeatMap = (map, data) => {
    const heatPoints = data.map((r) => {
        return [r.latitude, r.longitude]
    })

    L.heatLayer(heatPoints, { maxZoom: 11 }).addTo(map);
}

const plotMap = () => {
    var map = L.map('map', {
        preferCanvas: true,
    }).setView([-30.0699828, -51.1198806], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);


    return map;
}

const plotFilters = (map, data) => {

    var ndx = crossfilter(data);
    var all = ndx.groupAll();

    console.log(all)

    var fluctuationChart = dc.barChart('#bar-chart');

    var fluctuation = ndx.dimension(function (d) {
        return d.pessoas;
    });
    var fluctuationGroup = fluctuation.group().reduceCount();

    console.log('flut', fluctuation)
    console.log('group', fluctuationGroup)
    console.log('chart', fluctuationChart)

    console.log('all', fluctuationGroup.all());

    console.log('top', fluctuation.top(1)[0].pessoas)
    console.log('bottom', fluctuation.bottom(1)[0].pessoas)


    fluctuationChart /* dc.barChart('#volume-month-chart', 'chartGroup') */
        .width(300)
        .height(180)
        .margins({ top: 10, right: 50, bottom: 30, left: 40 })
        .dimension(fluctuation)
        .group(fluctuationGroup)
        .elasticY(true)
        .filterPrinter(function (filters) {
            console.log(filters)
            // var filter = filters[0], s = '';
            // s += numberFormat(filter[0]) + '% -> ' + numberFormat(filter[1]) + '%';
            // return s;
            rd = fluctuation.filter(filters[0])

            nd = rd.top(Infinity);

            updateData(nd)


            return filters;
        })
        .x(d3.scaleLinear()
            .domain([0, 15])
            .rangeRound([0, 500]))

        ;
    fluctuationChart.xAxis().tickFormat(
        function (v) { return v });
    fluctuationChart.yAxis().ticks(5);

    fluctuationChart.render()
}

const updateData = (newPoints) => {
    console.log(newPoints)

    markersLayerGroup.clearLayers();

    markers = convertPointsToMarkers(newPoints)

    markersLayerGroup = L.layerGroup(markers).addTo(map)

    console.log(map)
}

const main = () => {
    map = plotMap()
    loadData(map)
}

window.onload = main