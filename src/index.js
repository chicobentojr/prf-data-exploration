const BAR_FILTERS = [
  'pessoas', 'mortos', 'feridos_leves',
  'feridos_graves', 'ilesos', 'ignorados',
  'feridos', 'veiculos'
]

const PIE_FILTERS = ['dia_semana', 'causa_acidente']

const PIE_CONFIG = {
  'dia_semana': {
    'cap': Infinity
  },
  'causa_acidente': {
    'cap': 3
  }
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
let geoCities = null;

let infoDetailControl = null;

let selectedState = "";

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
      addPieFiltersElements();
      addBarFiltersElements();
      addTimelineChartFilter()
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

const resetSelection = () => {
  if (markersLayerGroup) {
    markersLayerGroup.clearLayers();
  }
  selectedState = ""
  updateFilters(data)
  plotStates()
}

const addBarFiltersElements = () => {
  BAR_FILTERS.map((k, i) => {
    filtersChart.innerHTML += `
                <div class='chart'>
                  <div id='bar-chart-${k}'>
                    <h4>${FIELDS[k]} <a class='reset'
                        href='javascript:resetFilter("${k}");'
                        style="display: none;">reset</a>
                    </h4>
                  </div>
                </div>
            `;
    setTimeout(function () {
      addBarChartFilter(k);
    }, 0);
  });
  // dimensions['uf'] = dataFiltered.dimension(d => d['uf'])
  // dimensionsGroup['uf'] = dimensions['uf'].group().reduceCount();
  dc.renderAll();
};

const addPieFiltersElements = () => {
  PIE_FILTERS.forEach((k) => {
    filtersChart.innerHTML += `
    <div class='chart'>
    <div id='pie-chart-${k}'>
      <h4>${FIELDS[k]}
      </h4>
    </div>
  </div>
            `;
    setTimeout(function () {
      addPieChartFilter(k);
    }, 0);
  });
  // dimensions['uf'] = dataFiltered.dimension(d => d['uf'])
  // dimensionsGroup['uf'] = dimensions['uf'].group().reduceCount();
  dc.renderAll();
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

const addPieChartFilter = field => {

  charts[field] = dc.pieChart(`#pie-chart-${field}`);

  dimensions[field] = dataFiltered.dimension(function (d) {
    return d[field];
  });
  dimensionsGroup[field] = dimensions[field].group().reduceCount();

  charts[field]
    .cap(PIE_CONFIG[field]['cap'])
    .othersLabel('Outros')
    .width(320)
    .height(350)
    .radius(100)
    .innerRadius(30)
    .legend(dc.legend())
    .label(() => '')
    // .label((g) => {
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
  loadGeoData(map);
};

const loadGeoData = (map) => {
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
            `${selectedState} selecionado <br> <a href="javascript:resetSelection();">Mostrar todos</a>`
            : 'Selecione um estado'))}`;
    };

    infoDetailControl.addTo(map);

    plotStates(dataFiltered)

  })
  d3.json('src/utils/brasil-municipios.geojson').then((cities) => {
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
  console.log('dataFilterd all len', dataFiltered.allFiltered().length)
  dataFiltered = crossfilter(newData)

  const allFilters = ['uf', ...BAR_FILTERS, ...PIE_FILTERS]

  allFilters.forEach(f => {
    dimensions[f] = dataFiltered.dimension(d => d[f])
    dimensionsGroup[f] = dimensions[f].group().reduceCount()
    // const group = dataFiltered.dimension(d => d[f]).group().reduceCount()
    if (charts.hasOwnProperty(f)) {
      charts[f].group(dimensionsGroup[f])
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

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // map.on("zoomend", (e) => {
  //   // const zoomValue = e.target._zoom
  //   // console.log('zoomend', zoomValue)

  //   // if (zoomValue <= 5) {
  //   //   dataFiltered = crossfilter(data);
  //   //   // dataFiltered.add(data);
  //   //   // console.log('dataFiltered', dataFiltered.size())
  //   //   // dc.redrawAll();
  //   //   plotStates(dataFiltered)
  //   // }
  // })

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

  $("#accordion").accordion({
    collapsible: true
  });
};

window.onload = main;
