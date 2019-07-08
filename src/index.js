const FILTER_TYPE_BAR = 'bar'
const FILTER_TYPE_PIE = 'pie'

const ALL_FILTERS = {
  // Bar
  'pessoas': { type: FILTER_TYPE_BAR },
  'mortos': { type: FILTER_TYPE_BAR },
  'feridos_leves': { type: FILTER_TYPE_BAR },
  'feridos_graves': { type: FILTER_TYPE_BAR },
  'ilesos': { type: FILTER_TYPE_BAR },
  'ignorados': { type: FILTER_TYPE_BAR },
  'feridos': { type: FILTER_TYPE_BAR },
  'veiculos': { type: FILTER_TYPE_BAR },

  // Pie
  'dia_semana': { type: FILTER_TYPE_PIE, cap: Infinity },
  'hour': { type: FILTER_TYPE_PIE, cap: Infinity },
  'causa_acidente': { type: FILTER_TYPE_PIE, cap: 9 },
}

const HOURS_GROUP = ['madrugada', 'manhã', 'tarde', 'noite']

const FIELDS = {
  "data_inversa": "Data",
  "horario": "Horário",
  "dia_semana": "Dia",
  "uf": "UF",
  "br": "BR",
  "km": "KM",
  "municipio": "Município",
  "causa_acidente": "Causa",
  "tipo_acidente": "Tipo",
  "classificacao_acidente": "Classificação",
  "fase_dia": "Fase do dia",
  "condicao_metereologica": "Tempo",
  "tipo_pista": "Tipo da pista",
  "tracado_via": "Via",
  "pessoas": "Pessoas",
  "mortos": "Mortos",
  "feridos_leves": "Feridos leves",
  "feridos_graves": "Feridos graves",
  "ilesos": "Ilesos",
  "ignorados": "Ignorados",
  "feridos": "Feridos",
  "veiculos": "Veículos",
  "regional": "Regional",
  "delegacia": "Delegacia",

  // Custom
  "hour": "Horário"
}

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

let infoDetailControl = null;

let selectedState = "";
let selectedFilters = ['dia_semana', 'causa_acidente', 'pessoas', 'mortos']


const filtersChart = document.getElementById("filters-chart");

const dateFormatSpecifier = '%Y-%m-%d';
const dateFormat = d3.timeFormat(dateFormatSpecifier);
const dateFormatParser = d3.timeParse(dateFormatSpecifier);

const loadData = map => {
  console.log("loading data");
  Papa.parse("src/data/datatran2018-novo.csv", {
    delimiter: ";",
    header: true,
    download: true,
    complete: results => {
      console.log("Data Loaded");
      console.log(results);
      dataLoaded(map, results.data.slice(0));
    }
  });
};

const getPointDetails = point => {
  return Object.keys(FIELDS).reduce((a, k) => {
    return `${a}${FIELDS[k]}: ${point[k]}<br>`;
  }, "");
};

const convertPointsToMarkers = points => {
  return points.map(p =>
    L.circleMarker([p.latitude.replace(',', '.'), p.longitude.replace(',', '.')], {
      color: "#3388ff",
      radius: 5,
    }).bindPopup(getPointDetails(p))
  );
}

const resetFilter = (key) => {
  charts[key].filterAll();
  // const newPoints = dataFiltered.dimension(d => d).top(Infinity)
  // const newPoints = charts[key].filterAll().dimension().top(Infinity)
  const newPoints = dimensions[key].filterAll().top(Infinity)
  refreshPoints(newPoints)
  dc.redrawAll()
}

const showAllRecords = () => {
  if (markersLayerGroup) {
    markersLayerGroup.clearLayers();
  }
  selectedState = ""
  updateFilters(data)
  plotStates()
  updateRecordCounterValue(data.length)
  infoDetailControl.update()
  map.setZoom(4)
}

const addFilter = (field) => {
  const filter = ALL_FILTERS[field]

  switch (filter.type) {
    case FILTER_TYPE_BAR:
      addBarFiltersElement(field)
      break;
    case FILTER_TYPE_PIE:
      addPieFiltersElement(field)
      break;
  }
}

const addBarFiltersElement = (field) => {
  filtersChart.innerHTML += `
                  <div id='bar-chart-${field}'>
                    <h4 class="chart-title">${FIELDS[field]} <a class='reset'
                        href='javascript:resetFilter("${field}");'
                        style="display: none;">limpar</a>
                    </h4>
                  </div>
            `;
  setTimeout(function () {
    addBarChartFilter(field);
  }, 0);
};

const addPieFiltersElement = (field) => {
  filtersChart.innerHTML += `
    <div id='pie-chart-${field}' class="pie-chart">
      <h4 class="chart-title">${FIELDS[field]}</h4>
    </div>`;
  setTimeout(function () {
    addPieChartFilter(field);
  }, 0);
};

const addBarChartFilter = field => {

  charts[field] = dc.barChart(`#bar-chart-${field}`);

  dimensions[field] = dataFiltered.dimension(function (d) {
    return d[field];
  });
  dimensionsGroup[field] = dimensions[field].group().reduceCount();

  const max = Math.max.apply(Math, dimensionsGroup[field].top(Infinity).map(x => x.key))
  const min = Math.min.apply(Math, dimensionsGroup[field].top(Infinity).map(x => x.key))

  charts[field]
    .width(270)
    .height(180)
    .margins({ top: 10, right: 50, bottom: 30, left: 40 })
    .dimension(dimensions[field])
    .group(dimensionsGroup[field])
    .elasticY(true)
    .round(dc.round.floor)
    .filterPrinter(function (filters) {
      rd = dimensions[field].filter(filters[0]);
      nd = rd.top(Infinity);
      refreshPoints(nd);
      return filters;
    })
    .x(
      d3
        .scaleLinear()
        // .domain([min - 1, max + 1])
        .domain([0, 10])
    );
  charts[field].xAxis().tickFormat(function (v) {
    return v;
  });
  charts[field].yAxis().ticks(5); ''
  charts[field].render();
};

const getPieLabel = (label) => {
  words = label.split(' ')

  if (words.length > 3) {
    return words.slice(0, 3).join(' ') + ' ...'
  }
  return label
}

const addPieChartFilter = field => {

  charts[field] = dc.pieChart(`#pie-chart-${field}`);

  dimensions[field] = dataFiltered.dimension(function (d) {
    return d[field];
  });
  dimensionsGroup[field] = dimensions[field].group().reduceCount();

  charts[field]
    .cap(ALL_FILTERS[field]['cap'])
    .othersLabel('Outros')
    .width(200)
    .height(180)
    .radius(100)
    .innerRadius(30)
    .legend(dc.legend().x(200).legendText((d) => getPieLabel(d.name)))
    .label(() => '')
    // .label((g) => getPieLabel(g.key))
    //   return ''
    //   // console.log(g)
    //   // return g.key.split('-')[0]
    // })
    .dimension(dimensions[field])
    .group(dimensionsGroup[field])
    .on("filtered", (chart) => {
      const filters = chart.filters()
      rd = dimensions[field].filter(v => filters.length > 0 ? filters.indexOf(v) > -1 : true);
      nd = rd.top(Infinity);
      refreshPoints(nd);
    })
  // charts[field].margins().bottom = 110
  charts[field].render();
};

const addTimelineChartFilter = (field = 'mes') => {

  charts[field] = dc.barChart(`#bar-chart-${field}`);

  dimensions[field] = dataFiltered.dimension(function (d) {
    return d['mes'];
  });
  dimensionsGroup[field] = dimensions[field].group().reduceCount();

  charts[field]
    .width(1000)
    .height(150)
    .margins({ top: 10, right: 40, bottom: 20, left: 40 })
    .dimension(dimensions[field])
    .group(dimensionsGroup[field])
    .elasticY(true)
    .filterPrinter(function (filters) {
      rd = dimensions[field].filter(filters[0]);
      nd = rd.top(Infinity);
      refreshPoints(nd);
      return filters;
    })
    .centerBar(true)
    .gap(1)
    .x(d3.scaleTime().domain([new Date(2018, 0, 1), new Date(2018, 11, 31)]))
    // .round(d3.timeMonth.round)
    // .alwaysUseRounding(true)
    .xUnits(() => 20);

  charts[field].xAxis().tickFormat(v =>
    new Date(v).toLocaleString('pt-br', { month: 'long' })
  );
  charts[field].yAxis().ticks(5);
  charts[field].render();
};


const dataLoaded = (map, points) => {
  data = points

  data.forEach(d => {
    d.mes = d3.timeMonth(dateFormatParser(d['data_inversa']))

    const hour = Number.parseInt(d['horario'].slice(0, 2))
    d.hour = HOURS_GROUP[Math.floor(hour / 6)]
  })

  dataFiltered = crossfilter(data);

  dimensions['uf'] = dataFiltered.dimension(d => d['uf'])
  dimensionsGroup['uf'] = dimensions['uf'].group().reduceCount();

  markers = convertPointsToMarkers(points);

  // markersLayerGroup = L.layerGroup(markers).addTo(map);

  // addHeatMap(map, data)
  loadStatesPolygons(map);

  // selectedFilters.forEach(filter => {
  Object.keys(ALL_FILTERS).forEach(filter => {
    console.log('adding filter', filter)
    addFilter(filter)
  })

  // addPieFiltersElement();
  // addBarFiltersElement();
  addTimelineChartFilter();

  updateRecordCounterValue(data.length)
  showRecordCounter();
};

const loadStatesPolygons = (map) => {
  console.log('plotting cloropleth map')
  d3.json('src/utils/brasil-estados.geojson').then((states) => {
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
          : (selectedState ?
            `${selectedState} selecionado <br> <a href="javascript:showAllRecords();">Mostrar todos</a>`
            : 'Selecione um estado'))}`;
    };

    infoDetailControl.addTo(map);

    plotStates(dataFiltered)

    document.querySelector('.loading-screen').style.display = 'none';
  })
}


const updateFilters = (newData) => {
  console.log('dataFilterd all len', dataFiltered.allFiltered().length)
  dataFiltered = crossfilter(newData)

  const allFilters = ['uf', 'mes', ...Object.keys(ALL_FILTERS)]

  allFilters.forEach(f => {
    dimensions[f] = dataFiltered.dimension(d => d[f])
    dimensionsGroup[f] = dimensions[f].group().reduceCount()
    // const group = dataFiltered.dimension(d => d[f]).group().reduceCount()
    if (charts.hasOwnProperty(f)) {
      charts[f].group(dimensionsGroup[f])
      charts[f].filterAll()
    }
  })
  console.log('dataFilterd all len', dataFiltered.allFiltered().length)
  dc.redrawAll();

}

const onStateSelected = (e) => {
  console.log('zoom clicked');
  console.log('dataFiltered all len:', dataFiltered.allFiltered().length);

  const state = e.target.feature.properties.Name

  // updateFilters(data);

  if (selectedState === state) {
    selectedState = null;
  }
  else {
    selectedState = state;
  }

  // dataFiltered.dimension(d => d['uf']).filter(selectedState)
  const newPoints = dataFiltered.dimension(d => d['uf']).filter(selectedState).top(Infinity)

  console.log('dataFiltered :', dataFiltered.size());
  console.log('newPoints size :', newPoints.length);

  map.fitBounds(e.target.getBounds());
  dc.redrawAll();
  plotStates()

  refreshPoints(newPoints)
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

const plotMap = (isFullMap) => {
  var map = L.map("map", {
    preferCanvas: true,
    zoomControl: false,
  }).setView([-30.0699828, -51.1198806], 4);

  const counterControl = L.control();

  counterControl.onAdd = function () {
    this._div = L.DomUtil.create('div', 'data-count');
    this._div.innerHTML = `<span class='filter-count'></span> acidentes encontrados.`
    return this._div;
  };

  counterControl.addTo(map);

  if (isFullMap) {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      noWrap: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  } else {
    const countryGeoJson = {
      type: "Polygon", coordinates: [
        [[-57.625133, -30.216295,], [-56.2909, -28.852761,], [-55.162286, -27.881915,], [-54.490725, -27.474757,], [-53.648735, -26.923473,], [-53.628349, -26.124865,], [-54.13005, -25.547639,], [-54.625291, -25.739255,], [-54.428946, -25.162185,], [-54.293476, -24.5708,], [-54.29296, -24.021014,], [-54.652834, -23.839578,], [-55.027902, -24.001274,], [-55.400747, -23.956935,], [-55.517639, -23.571998,], [-55.610683, -22.655619,], [-55.797958, -22.35693,], [-56.473317, -22.0863,], [-56.88151, -22.282154,], [-57.937156, -22.090176,], [-57.870674, -20.732688,], [-58.166392, -20.176701,], [-57.853802, -19.969995,], [-57.949997, -19.400004,], [-57.676009, -18.96184,], [-57.498371, -18.174188,], [-57.734558, -17.552468,], [-58.280804, -17.27171,], [-58.388058, -16.877109,], [-58.24122, -16.299573,], [-60.15839, -16.258284,], [-60.542966, -15.09391,], [-60.251149, -15.077219,], [-60.264326, -14.645979,], [-60.459198, -14.354007,], [-60.503304, -13.775955,], [-61.084121, -13.479384,], [-61.713204, -13.489202,], [-62.127081, -13.198781,], [-62.80306, -13.000653,], [-63.196499, -12.627033,], [-64.316353, -12.461978,], [-65.402281, -11.56627,], [-65.321899, -10.895872,], [-65.444837, -10.511451,], [-65.338435, -9.761988,], [-66.646908, -9.931331,], [-67.173801, -10.306812,], [-68.048192, -10.712059,], [-68.271254, -11.014521,], [-68.786158, -11.03638,], [-69.529678, -10.951734,], [-70.093752, -11.123972,], [-70.548686, -11.009147,], [-70.481894, -9.490118,], [-71.302412, -10.079436,], [-72.184891, -10.053598,], [-72.563033, -9.520194,], [-73.226713, -9.462213,], [-73.015383, -9.032833,], [-73.571059, -8.424447,], [-73.987235, -7.52383,], [-73.723401, -7.340999,], [-73.724487, -6.918595,], [-73.120027, -6.629931,], [-73.219711, -6.089189,], [-72.964507, -5.741251,], [-72.891928, -5.274561,], [-71.748406, -4.593983,], [-70.928843, -4.401591,], [-70.794769, -4.251265,], [-69.893635, -4.298187,], [-69.444102, -1.556287,], [-69.420486, -1.122619,], [-69.577065, -0.549992,], [-70.020656, -0.185156,], [-70.015566, 0.541414,], [-69.452396, 0.706159,], [-69.252434, 0.602651,], [-69.218638, 0.985677,], [-69.804597, 1.089081,], [-69.816973, 1.714805,], [-67.868565, 1.692455,], [-67.53781, 2.037163,], [-67.259998, 1.719999,], [-67.065048, 1.130112,], [-66.876326, 1.253361,], [-66.325765, 0.724452,], [-65.548267, 0.789254,], [-65.354713, 1.095282,], [-64.611012, 1.328731,], [-64.199306, 1.492855,], [-64.083085, 1.916369,], [-63.368788, 2.2009,], [-63.422867, 2.411068,], [-64.269999, 2.497006,], [-64.408828, 3.126786,], [-64.368494, 3.79721,], [-64.816064, 4.056445,], [-64.628659, 4.148481,], [-63.888343, 4.02053,], [-63.093198, 3.770571,], [-62.804533, 4.006965,], [-62.08543, 4.162124,], [-60.966893, 4.536468,], [-60.601179, 4.918098,], [-60.733574, 5.200277,], [-60.213683, 5.244486,], [-59.980959, 5.014061,], [-60.111002, 4.574967,], [-59.767406, 4.423503,], [-59.53804, 3.958803,], [-59.815413, 3.606499,], [-59.974525, 2.755233,], [-59.718546, 2.24963,], [-59.646044, 1.786894,], [-59.030862, 1.317698,], [-58.540013, 1.268088,], [-58.429477, 1.463942,], [-58.11345, 1.507195,], [-57.660971, 1.682585,], [-57.335823, 1.948538,], [-56.782704, 1.863711,], [-56.539386, 1.899523,], [-55.995698, 1.817667,], [-55.9056, 2.021996,], [-56.073342, 2.220795,], [-55.973322, 2.510364,], [-55.569755, 2.421506,], [-55.097587, 2.523748,], [-54.524754, 2.311849,], [-54.088063, 2.105557,], [-53.778521, 2.376703,], [-53.554839, 2.334897,], [-53.418465, 2.053389,], [-52.939657, 2.124858,], [-52.556425, 2.504705,], [-52.249338, 3.241094,], [-51.657797, 4.156232,], [-51.317146, 4.203491,], [-51.069771, 3.650398,], [-50.508875, 1.901564,], [-49.974076, 1.736483,], [-49.947101, 1.04619,], [-50.699251, 0.222984,], [-50.388211, -0.078445,], [-48.620567, -0.235489,], [-48.584497, -1.237805,], [-47.824956, -0.581618,], [-46.566584, -0.941028,], [-44.905703, -1.55174,], [-44.417619, -2.13775,], [-44.581589, -2.691308,], [-43.418791, -2.38311,], [-41.472657, -2.912018,], [-39.978665, -2.873054,], [-38.500383, -3.700652,], [-37.223252, -4.820946,], [-36.452937, -5.109404,], [-35.597796, -5.149504,], [-35.235389, -5.464937,], [-34.89603, -6.738193,], [-34.729993, -7.343221,], [-35.128212, -8.996401,], [-35.636967, -9.649282,], [-37.046519, -11.040721,], [-37.683612, -12.171195,], [-38.423877, -13.038119,], [-38.673887, -13.057652,], [-38.953276, -13.79337,], [-38.882298, -15.667054,], [-39.161092, -17.208407,], [-39.267339, -17.867746,], [-39.583521, -18.262296,], [-39.760823, -19.599113,], [-40.774741, -20.904512,], [-40.944756, -21.937317,], [-41.754164, -22.370676,], [-41.988284, -22.97007,], [-43.074704, -22.967693,], [-44.647812, -23.351959,], [-45.352136, -23.796842,], [-46.472093, -24.088969,], [-47.648972, -24.885199,], [-48.495458, -25.877025,], [-48.641005, -26.623698,], [-48.474736, -27.175912,], [-48.66152, -28.186135,], [-48.888457, -28.674115,], [-49.587329, -29.224469,], [-50.696874, -30.984465,], [-51.576226, -31.777698,], [-52.256081, -32.24537,], [-52.7121, -33.196578,], [-53.373662, -33.768378,], [-53.650544, -33.202004,], [-53.209589, -32.727666,], [-53.787952, -32.047243,], [-54.572452, -31.494511,], [-55.60151, -30.853879,], [-55.973245, -30.883076,], [-56.976026, -30.109686,], [-57.625133, -30.216295,],
        ]],
    }

    L.TileLayer.boundaryCanvas('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      boundary: countryGeoJson,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      noWrap: true,
    }).addTo(map);
  }



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

const updateRecordCounterValue = (value) => {
  document.querySelector('.data-count .filter-count').innerText = d3.format(',')(value).replace(',', '.')
}

const showRecordCounter = () => {
  dc.dataCount('.data-count')
    .crossfilter(dataFiltered)
    .groupAll(dataFiltered.groupAll())
    .formatNumber((n) => d3.format(',')(n).replace(',', '.'))
}

const main = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isFullMap = urlParams.get('fullmap');

  map = plotMap(isFullMap);

  loadData(map);
};

window.onload = main;
