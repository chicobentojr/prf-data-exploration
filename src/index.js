const loadData = (map) => {
    console.log('loading data');

    Papa.parse('/src/data/datatran2018.csv', {
        delimiter: ';',
        header: true,
        download: true,
        complete: (results) => {
            console.log('Data Loaded')
            console.log(results)
            dataLoaded(results.data, map)
        }
    })
}

const dataLoaded = (data, map) => {
    // data.slice(1, 10).map((r) => {
    data.slice(1, 1000).map((r) => {
        // console.log(`id: ${r[0]} lat: ${r[25]} long: ${r[26]} `)

        L.circleMarker([r.latitude, r.longitude], {
            color: '#3388ff'
        }).addTo(map)
            .bindPopup(r[0])

    })

    console.log('loaded')
}

const plotMap = () => {
    var map = L.map('map', {
        preferCanvas: true,
    }).setView([-30.0699828, -51.1198806], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // L.marker([-30.0699828, -51.1198806]).addTo(map)
    //     .bindPopup('Work in changed')
    // .openPopup();

    return map;
}

const main = () => {
    const map = plotMap()
    loadData(map)
}






window.onload = main