const FILTERS = [
  'pessoas', 'mortos', 'feridos_leves',
  'feridos_graves', 'ilesos', 'ignorados',
  'feridos', 'veiculos'
]

let map = null;
let markers = null;
let markersLayerGroup = null;
let data = null;
let dataFiltered = null;
let dataFilteredAll = null;

let charts = {};
let dimensions = {};
let dimensionsGroup = {};

let choroMap = null;
let geoStates = null;
let geoCities = null;

let infoDetailControl = null;

let selectedState = "";

const filtersChart = document.getElementById("filters-chart");

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
      addFiltersElements();
    }
  });
};

const getPointDetails = point => {
  return Object.keys(point).reduce((a, k) => {
    return `${a}${k}: ${point[k]}<br>`;
  }, "");
};

const convertPointsToMarkers = points => {
  return points.map(p =>
    L.circleMarker([p.latitude.replace(',', '.'), p.longitude.replace(',', '.')], {
      color: "#3388ff"
    }).bindPopup(getPointDetails(p))
  );
}

const resetFilter = (key) => {
  charts[key].filterAll();
  const newPoints = dataFiltered.dimension(d => d).top(Infinity)
  refreshPoints(newPoints)
}

const resetSelection = () => {
  if (markersLayerGroup) {
    markersLayerGroup.clearLayers();
  }
  selectedState = ""
  updateFilters(data)
  plotStates()
}

const addFiltersElements = () => {
  FILTERS.map((k, i) => {
    filtersChart.innerHTML += `
                <div class='chart'>
                    <h4>${k} <a class='reset' href='javascript:resetFilter("${k}");'>reset</a></h4>
                    <div id='bar-chart-${k}'>
                    </div>
                </div>
            `;
    setTimeout(function () {
      addChartFilter(k);
    }, 0);
  });
  dimensions['uf'] = dataFiltered.dimension(d => d['uf'])
  dimensionsGroup['uf'] = dimensions['uf'].group().reduceCount();
  dc.renderAll();
};

const addChartFilter = field => {

  charts[field] = dc.barChart(`#bar-chart-${field}`);

  dimensions[field] = dataFiltered.dimension(function (d) {
    return d[field];
  });
  dimensionsGroup[field] = dimensions[field].group().reduceCount();

  const max = Math.max.apply(Math, dimensionsGroup[field].top(Infinity).map(x => x.key))
  const min = Math.min.apply(Math, dimensionsGroup[field].top(Infinity).map(x => x.key))

  charts[field]
    .width(300)
    .height(180)
    .margins({ top: 10, right: 50, bottom: 30, left: 40 })
    .dimension(dimensions[field])
    .group(dimensionsGroup[field])
    .elasticY(true)
    .filterPrinter(function (filters) {
      rd = dimensions[field].filter(filters[0]);
      nd = rd.top(Infinity);
      refreshPoints(nd);
      return filters;
    })
    .x(
      d3
        .scaleLinear()
        .domain([min - 1, max + 1])
        .rangeRound([0, 500])
    );
  charts[field].xAxis().tickFormat(function (v) {
    return v;
  });
  charts[field].yAxis().ticks(5); ''
  charts[field].render();
};


const dataLoaded = (map, points) => {
  data = points;
  dataFiltered = crossfilter(data);

  markers = convertPointsToMarkers(points);

  // markersLayerGroup = L.layerGroup(markers).addTo(map);

  // addHeatMap(map, data)
  loadGeoData(map);
};

const loadGeoData = (map) => {
  console.log('plotting cloropleth map')
  d3.json('/src/utils/brasil-estados.geojson').then((states) => {
    console.log('data :', states);
    console.log('feat', states.features[0])
    states.features = states.features.map(f => {
      return {
        ...f,
        geometry: { ...f.geometry, type: "Polygon", coordinates: [f.geometry.coordinates] }
      }
    })
    geoStates = states;

    infoDetailControl = L.control();

    infoDetailControl.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'state-info');
      this.update();
      return this._div;
    };

    infoDetailControl.update = function (props) {
      this._div.innerHTML =
        `<h4>Acidentes por Estado</h4> 
          ${(props ?
          `<b>${props.Name}</b> ${props.Description}<br>
           <b>Quantidade: </b> ${props.Value}`
          : (selectedState ? `${selectedState} selecionado` : 'Selecione um estado'))}`;
    };

    infoDetailControl.addTo(map);

    plotStates(dataFiltered)

  })
  d3.json('/src/utils/brasil-municipios.geojson').then((cities) => {
    console.log('cities :', cities);
    console.log('cities feat', cities.features[0])
    cities.features = cities.features.map(f => {
      return {
        ...f,
        geometry: { ...f.geometry, type: "Polygon", coordinates: [f.geometry.coordinates] }
      }
    })
    geoCities = cities;

    console.log('geoCities :', geoCities);
  })
}


const updateFilters = (newData) => {
  console.log('dataFilterd', dataFiltered.allFiltered().length)
  dataFiltered = crossfilter(newData)
  FILTERS.forEach(f => {
    const group = dataFiltered.dimension(d => d[f]).group().reduceCount()
    charts[f].group(group)
  })
  console.log('dataFilterd', dataFiltered)
  dc.redrawAll();

}

const onStateSelected = (e) => {
  console.log('zoom clicked');
  console.log('dataFiltered :', dataFiltered.allFiltered().length);

  const state = e.target.feature.properties.Name

  updateFilters(data);

  if (selectedState === state) {
    selectedState = null;
  }
  else {
    selectedState = state;
  }

  dataFiltered.dimension(d => d['uf']).filter(selectedState)

  console.log('dataFiltered :', dataFiltered.size());

  map.fitBounds(e.target.getBounds());
  dc.redrawAll();
  plotStates()

  refreshPoints(dataFiltered.allFiltered())
}

const onMouseOverState = (e) => {
  var layer = e.target;
  const props = layer.feature.properties

  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  }).bringToFront();

  // const ufGroup = dataFiltered.dimension(d => d['uf']).group().reduceCount().top(Infinity);
  const ufGroup = dimensionsGroup['uf'].top(Infinity);

  const state = props ? props.Name : ""
  const found = ufGroup.find(uf => uf.key == state)
  const Value = found ? found.value : 0

  infoDetailControl.update({ ...layer.feature.properties, Value })
}

const onMouseOutState = (e) => {
  choroMap.resetStyle(e.target)
  infoDetailControl.update()
}

const plotStates = (data = dataFiltered) => {
  if (selectedState) {
    map.removeLayer(choroMap)
    return;
  }


  const geoFeatures = selectedState ? geoStates.features.filter(feat =>
    feat.properties.Name === selectedState
  ) : geoStates.features

  if (choroMap) {
    map.removeLayer(choroMap)
  }


  choroMap = L.geoJson({ ...geoStates, features: geoFeatures }, {
    style: (f) => {
      const getColor = () => {
        const state = f.properties.Name

        if (selectedState) {
          return state === selectedState ? "blue" : "grey"
        }

        var ufGroup = dimensionsGroup['uf'].top(Infinity)


        const found = ufGroup.find(uf => uf.key == state)
        const max = ufGroup[0].value
        const min = ufGroup[ufGroup.length - 1].value
        const v = found ? found.value : min

        const c = d3.scaleLinear([min, max], ["#FFEDA0", "#800026"])

        return c(v)
      }
      return {
        fillColor: getColor(),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
      }
    },
    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: onMouseOverState,
        mouseout: onMouseOutState,
        click: onStateSelected
      })
    }
  }).addTo(map);
}

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

  map.on("zoomend", (e) => {
    const zoomValue = e.target._zoom
    console.log('zoomend', zoomValue)

    // if (zoomValue <= 5) {
    //   dataFiltered = crossfilter(data);
    //   // dataFiltered.add(data);
    //   // console.log('dataFiltered', dataFiltered.size())
    //   // dc.redrawAll();
    //   plotStates(dataFiltered)
    // }
  })

  return map;
};

const refreshPoints = newPoints => {
  if (markersLayerGroup) {
    markersLayerGroup.clearLayers();
  }

  if (selectedState) {

    const filteredPoints = newPoints.filter(p => p.uf === selectedState)

    markers = convertPointsToMarkers(filteredPoints);
    markersLayerGroup = L.layerGroup(markers).addTo(map);

  } else {
    newDataFiltered = crossfilter(newPoints)
    plotStates(newDataFiltered)
  }
};

const main = () => {
  map = plotMap();
  loadData(map);
};

window.onload = main;
