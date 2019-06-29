let map = null;
let markers = null;
let markersLayerGroup = null;
let data = null;
let dataFiltered = null;
let dataFilteredAll = null;

const filtersChart = document.getElementById("filters-chart");

let charts = {};

const loadData = map => {
  console.log("loading data");
  Papa.parse("/src/data/datatran2018.csv", {
    delimiter: ";",
    header: true,
    download: true,
    complete: results => {
      console.log("Data Loaded");
      console.log(results);
      dataLoaded(map, results.data.slice(0, 1000));
      addFiltersElements(results.data[0]);
    }
  });
};

const getPointDetails = point => {
  return Object.keys(point).reduce((a, k) => {
    return `${a}${k}: ${point[k]}<br>`;
  }, "");
};

const convertPointsToMarkers = points =>
  points.map(p =>
    L.circleMarker([p.latitude, p.longitude], {
      color: "#3388ff"
    }).bindPopup(getPointDetails(p))
  );

const resetFilter = (key) => {
  charts[key].filterAll();

  const newPoints = dataFiltered.dimension(d => d).top(Infinity)
  updateData(newPoints)
}


const addFiltersElements = obj => {
  const keys = Object.keys(obj)
  const notFiltered = ['id', 'latitude', 'longitude']

  keys.map((k, i) => {
    if (notFiltered.indexOf(k) === -1 && !isNaN(obj[k])) {
      filtersChart.innerHTML += `
                <div>
                    <h4>${k}</h4>
                    <div id='bar-chart-${k}' class='.chart'>
                      <a class='reset' href='javascript:resetFilter("${k}");'>Reset</a>
                    </div>
                </div>
            `;
      setTimeout(function () {
        addChartFilter(k);
      }, 0);
    }
  });
  dc.renderAll();
};

const addChartFilter = field => {
  // console.log("addding filter");

  // var ndx = crossfilter(data);
  // // var all = ndx.groupAll();
  // var all = dataFiltered.groupAll()

  // console.log(all);

  charts[field] = dc.barChart(`#bar-chart-${field}`);

  var fluctuation = dataFiltered.dimension(function (d) {
    return d[field];
  });
  var fluctuationGroup = fluctuation.group().reduceCount();

  // console.log('fluctuation :', fluctuation);
  // console.log('fluctuationGroup :', fluctuationGroup.top(Infinity));

  const max = Math.max.apply(Math, fluctuationGroup.top(Infinity).map(x => x.key))
  const min = Math.min.apply(Math, fluctuationGroup.top(Infinity).map(x => x.key))

  charts[field] /* dc.barChart('#volume-month-chart', 'chartGroup') */
    .width(300)
    .height(180)
    .margins({ top: 10, right: 50, bottom: 30, left: 40 })
    .dimension(fluctuation)
    .group(fluctuationGroup)
    .elasticY(true)
    // .filterPrinter(function (filters) {
    //   // console.log(filters);
    //   rd = fluctuation.filter(filters[0]);
    //   nd = rd.top(Infinity);
    //   updateData(nd);
    //   return filters;
    // })
    .x(
      d3
        .scaleLinear()
        .domain([min - 1, max + 1])
        .rangeRound([0, 500])
    );
  charts[field].xAxis().tickFormat(function (v) {
    return v;
  });
  charts[field].yAxis().ticks(5);

  charts[field].render();
};



const dataLoaded = (map, points) => {
  data = points;
  dataFiltered = crossfilter(data);
  dataFilteredAll = dataFiltered.groupAll();
  markers = convertPointsToMarkers(points);

  markersLayerGroup = L.layerGroup(markers).addTo(map);

  // addHeatMap(map, data)
  // plotFilters(map, points)
};

const addHeatMap = (map, data) => {
  const heatPoints = data.map(r => {
    return [r.latitude, r.longitude];
  });

  L.heatLayer(heatPoints, { maxZoom: 14 }).addTo(map);
};

const plotMap = () => {
  var map = L.map("map", {
    preferCanvas: true,
    zoomControl: false,
  }).setView([-30.0699828, -51.1198806], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  return map;
};

const updateData = newPoints => {
  // console.log(newPoints);

  markersLayerGroup.clearLayers();

  markers = convertPointsToMarkers(newPoints);

  markersLayerGroup = L.layerGroup(markers).addTo(map);

  // console.log(map);
};

const main = () => {
  map = plotMap();
  loadData(map);
};

window.onload = main;
