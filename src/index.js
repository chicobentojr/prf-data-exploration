
function main() {
    var map = L.map('map').setView([-30.0699828, -51.1198806], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([-30.0699828, -51.1198806]).addTo(map)
        .bindPopup('Work in progress!')
        .openPopup();
}






window.onload = main