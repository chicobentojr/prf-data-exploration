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
  'causa_acidente': { type: FILTER_TYPE_PIE, cap: 3 },
}

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
  "delegacia": "Delegacia"
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
      color: "#3388ff"
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
    <div id='pie-chart-${field}'>
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

const plotMap = () => {
  var map = L.map("map", {
    preferCanvas: true,
    zoomControl: false,
  }).setView([-30.0699828, -51.1198806], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const counterControl = L.control();

  counterControl.onAdd = function () {
    this._div = L.DomUtil.create('div', 'data-count');
    this._div.innerHTML = `<span class='filter-count'></span> acidentes encontrados.`
    return this._div;
  };

  counterControl.addTo(map);

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
  map = plotMap();
  loadData(map);
};

window.onload = main;
