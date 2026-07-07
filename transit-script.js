const appState = {
    map: null,
    layers: {
        greenLine: null,
        orangeLine: null,
        stations: null,
        buses: null,
        landmarks: null
    },
    weather: null,
    simulatedBuses: [],
    busSimInterval: null,
    countdownInterval: null,
    nextDepartureTime: null
};

const fromStationSelect = document.getElementById("from-station");
const toStationSelect = document.getElementById("to-station");
const timetableStationSelect = document.getElementById("timetable-station");
const lineSelect = document.getElementById("line-select");
const routeResult = document.getElementById("route-result");
const serviceStatus = document.getElementById("service-status");
const nextDepartures = document.getElementById("next-departures");
const countdownBox = document.getElementById("countdown-box");
const scheduleTable = document.getElementById("schedule-table");
const weatherWidget = document.getElementById("weather-widget");
const rainAlert = document.getElementById("rain-alert");

document.addEventListener("DOMContentLoaded", function () {
    setupTabs();
    populateDropdowns();
    initMap();
    fetchWeather();
    fetchNearbyLandmarks();
    setupLayerButtons();
    setupRoutePlanner();
    setupTimetable();
    startBusSimulation();
});

function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const selectedTab = button.dataset.tab;

            document.querySelectorAll(".tab-btn").forEach(function (tabButton) {
                tabButton.classList.toggle("active", tabButton === button);
            });

            document.querySelectorAll(".tab-panel").forEach(function (panel) {
                panel.classList.toggle("active-panel", panel.id === selectedTab);
            });

            if (selectedTab === "map-panel" && appState.map) {
                window.setTimeout(function () {
                    appState.map.invalidateSize();
                }, 100);
            }
        });
    });
}

function populateDropdowns() {
    const allStations = [...GREEN_LINE.stations, ...ORANGE_LINE.stations];
    fromStationSelect.innerHTML = "";
    toStationSelect.innerHTML = "";

    allStations.forEach(function (station) {
        const optionText = `${station.name} (${station.id})`;
        fromStationSelect.appendChild(createOption(station.id, optionText));
        toStationSelect.appendChild(createOption(station.id, optionText));
    });

    if (toStationSelect.options.length > 1) {
        toStationSelect.selectedIndex = 1;
    }

    populateTimetableStations(GREEN_LINE);
}

function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

function populateTimetableStations(line) {
    timetableStationSelect.innerHTML = "";

    line.stations.forEach(function (station) {
        timetableStationSelect.appendChild(createOption(station.id, station.name));
    });
}

function initMap() {
    if (!window.L) {
        document.getElementById("karachi-map").textContent = "Map library could not load.";
        return;
    }

    appState.map = L.map("karachi-map").setView([KARACHI_CENTER.lat, KARACHI_CENTER.lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(appState.map);

    appState.layers.greenLine = L.polyline(getLineCoordinates(GREEN_LINE), {
        color: GREEN_LINE.color,
        weight: 6,
        opacity: 0.9
    }).addTo(appState.map);

    appState.layers.orangeLine = L.polyline(getLineCoordinates(ORANGE_LINE), {
        color: ORANGE_LINE.color,
        weight: 6,
        opacity: 0.9
    }).addTo(appState.map);

    appState.layers.stations = L.layerGroup().addTo(appState.map);
    appState.layers.buses = L.layerGroup().addTo(appState.map);
    appState.layers.landmarks = L.layerGroup().addTo(appState.map);

    addStationMarkers(GREEN_LINE);
    addStationMarkers(ORANGE_LINE);
}

function getLineCoordinates(line) {
    return line.stations.map(function (station) {
        return [station.lat, station.lng];
    });
}

function addStationMarkers(line) {
    line.stations.forEach(function (station) {
        const marker = L.marker([station.lat, station.lng]);
        marker.bindPopup(renderStationPopup(station, line));
        marker.addTo(appState.layers.stations);
    });
}

function renderStationPopup(station, line) {
    return `
    <h3 class="popup-title" style="color: ${line.color};">${station.name}</h3>
    <p class="popup-meta"><strong>Line:</strong> ${line.name}</p>
    <p class="popup-meta"><strong>Next Bus:</strong> Every ${line.frequency} minutes</p>
    <p class="popup-meta"><strong>Fare:</strong> Rs ${line.fare.minimum} - Rs ${line.fare.maximum}</p>
  `;
}

async function fetchWeather() {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${KARACHI_CENTER.lat}&longitude=${KARACHI_CENTER.lng}&current=temperature_2m,precipitation,wind_speed_10m`;

    try {
        const response = await fetch(weatherUrl);

        if (!response.ok) {
            throw new Error("Weather request failed.");
        }

        const data = await response.json();
        appState.weather = data.current;
        renderWeather(data.current);
    } catch (error) {
        weatherWidget.innerHTML = `
      <strong>Weather unavailable</strong><br>
      Could not fetch live weather right now.
    `;
    }
}

function renderWeather(weather) {
    const temperature = weather.temperature_2m;
    const precipitation = weather.precipitation;
    const windSpeed = weather.wind_speed_10m;

    weatherWidget.innerHTML = `
    <strong>Karachi Weather</strong><br>
    Temperature: ${temperature} C<br>
    Rain: ${precipitation} mm<br>
    Wind: ${windSpeed} km/h
  `;

    rainAlert.classList.toggle("hidden", precipitation <= 0);
}

async function fetchNearbyLandmarks() {
    if (!appState.map) {
        return;
    }

    const overpassQuery = `
    [out:json][timeout:25];
    (
      node["tourism"="attraction"](around:3500,${KARACHI_CENTER.lat},${KARACHI_CENTER.lng});
      node["amenity"="bus_station"](around:6000,${KARACHI_CENTER.lat},${KARACHI_CENTER.lng});
      node["railway"="station"](around:6000,${KARACHI_CENTER.lat},${KARACHI_CENTER.lng});
    );
    out body 20;
  `;

    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: overpassQuery
        });

        if (!response.ok) {
            throw new Error("Landmark request failed.");
        }

        const data = await response.json();
        data.elements.forEach(addLandmarkMarker);
    } catch (error) {
        console.warn("Landmarks unavailable:", error);
    }
}

function addLandmarkMarker(place) {
    if (!place.tags || !place.tags.name || !place.lat || !place.lon) {
        return;
    }

    const marker = L.marker([place.lat, place.lon]);
    const type = place.tags.amenity || place.tags.tourism || place.tags.railway || "landmark";

    marker.bindPopup(`
    <h3 class="popup-title" style="color: #00f5ff;">${place.tags.name}</h3>
    <p class="popup-meta"><strong>Source:</strong> OpenStreetMap</p>
    <p class="popup-meta"><strong>Type:</strong> ${type}</p>
  `);

    marker.addTo(appState.layers.landmarks);
}

function setupRoutePlanner() {
    document.getElementById("plan-route-btn").addEventListener("click", function () {
        planRoute(fromStationSelect.value, toStationSelect.value);
    });

    document.getElementById("refresh-weather-btn").addEventListener("click", function () {
        fetchWeather();
        routeResult.appendChild(createMessage("Weather refreshed. Check the map weather card for latest conditions."));
    });
}

function createMessage(text) {
    const message = document.createElement("div");
    message.className = "inline-message";
    message.textContent = text;
    return message;
}

function findStationById(stationId) {
    const greenStation = GREEN_LINE.stations.find(function (station) {
        return station.id === stationId;
    });

    if (greenStation) {
        return { station: greenStation, line: GREEN_LINE, lineKey: "green" };
    }

    const orangeStation = ORANGE_LINE.stations.find(function (station) {
        return station.id === stationId;
    });

    return { station: orangeStation, line: ORANGE_LINE, lineKey: "orange" };
}

function planRoute(fromId, toId) {
    const originData = findStationById(fromId);
    const destinationData = findStationById(toId);

    if (!originData.station || !destinationData.station) {
        routeResult.textContent = "Could not find one of the selected stations.";
        return;
    }

    if (fromId === toId) {
        routeResult.textContent = "Origin and destination are the same station.";
        return;
    }

    if (originData.lineKey === destinationData.lineKey) {
        renderDirectRoute(originData, destinationData);
        return;
    }

    renderTransferRoute(originData, destinationData);
}

function renderDirectRoute(originData, destinationData) {
    const stops = Math.abs(destinationData.station.sequence - originData.station.sequence);
    const estimatedTime = Math.ceil(stops * 2.5);
    const fare = fareCalculator(originData.station.sequence, destinationData.station.sequence);

    routeResult.innerHTML = `
    <div class="route-card" style="border-left-color: ${originData.line.color};">
      <h3>${originData.line.name}</h3>
      <p><strong>Board:</strong> ${originData.station.name}</p>
      <p><strong>Ride:</strong> ${stops} stops</p>
      <p><strong>Alight:</strong> ${destinationData.station.name}</p>
      <p><strong>Estimated Time:</strong> ${estimatedTime} minutes</p>
      <p><strong>Fare:</strong> Rs ${fare}</p>
    </div>
  `;
}

function renderTransferRoute(originData, destinationData) {
    const transferName = TRANSFER_STATIONS[0] || "Board Office";
    const originTransfer = originData.line.stations.find(function (station) {
        return station.name === transferName;
    });
    const destinationTransfer = destinationData.line.stations.find(function (station) {
        return station.name === transferName;
    });

    if (!originTransfer || !destinationTransfer) {
        routeResult.textContent = "No supported transfer station was found for this route.";
        return;
    }

    const firstLegStops = Math.abs(originTransfer.sequence - originData.station.sequence);
    const secondLegStops = Math.abs(destinationData.station.sequence - destinationTransfer.sequence);
    const totalStops = firstLegStops + secondLegStops;
    const estimatedTime = Math.ceil(totalStops * 2.5 + 5);
    const fare = Math.min(originData.line.fare.maximum, fareCalculator(1, totalStops + 1));

    routeResult.innerHTML = `
    <div class="route-card transfer-route" style="border-left-color: ${originData.line.color};">
      <h3>Transfer Route</h3>
      <p><strong>Step 1:</strong> Board ${originData.line.name} at ${originData.station.name}</p>
      <p><strong>Transfer:</strong> Change at ${transferName}</p>
      <p><strong>Step 2:</strong> Take ${destinationData.line.name} toward ${destinationData.station.name}</p>
      <p><strong>Total Stops:</strong> ${totalStops}</p>
      <p><strong>Estimated Time:</strong> ${estimatedTime} minutes including transfer time</p>
      <p><strong>Estimated Fare:</strong> Rs ${fare}</p>
    </div>
  `;
}

function setupTimetable() {
    renderTimetable("green", timetableStationSelect.value);

    lineSelect.addEventListener("change", function () {
        const selectedLine = getLineByKey(lineSelect.value);
        populateTimetableStations(selectedLine);
        renderTimetable(lineSelect.value, timetableStationSelect.value);
    });

    timetableStationSelect.addEventListener("change", function () {
        renderTimetable(lineSelect.value, timetableStationSelect.value);
    });

    document.getElementById("print-timetable-btn").addEventListener("click", function () {
        window.print();
    });
}

function getLineByKey(lineKey) {
    return lineKey === "orange" ? ORANGE_LINE : GREEN_LINE;
}

function renderTimetable(lineKey, stationId) {
    const line = getLineByKey(lineKey);
    const station = line.stations.find(function (item) {
        return item.id === stationId;
    });

    if (!station) {
        return;
    }

    renderServiceStatus(line);
    renderNextDepartures(line, station);
    renderScheduleTable(line);

    window.clearInterval(appState.countdownInterval);
    appState.countdownInterval = window.setInterval(updateCountdown, 1000);
    updateCountdown();
}

function renderServiceStatus(line) {
    const status = checkServiceStatus(line);
    const statusClass = status === "ACTIVE" ? "status-active" : "status-closed";

    serviceStatus.innerHTML = `
    <strong>Service Status:</strong>
    <span class="${statusClass}">${status}</span>
    <span class="muted-text">(${line.hours.start}:00 - ${line.hours.end}:00)</span>
  `;
}

function checkServiceStatus(line) {
    const currentHour = new Date().getHours();
    return currentHour >= line.hours.start && currentHour < line.hours.end ? "ACTIVE" : "CLOSED";
}

function renderNextDepartures(line, station) {
    const departures = getNextDepartures(line, station);
    appState.nextDepartureTime = departures[0];

    const items = departures.map(function (departure, index) {
        const label = index === 0 ? "Next" : "Upcoming";
        return `<li><strong>${label}:</strong> ${formatTime(departure)}</li>`;
    }).join("");

    nextDepartures.innerHTML = `
    <strong>${station.name}</strong>
    <p>Next 5 departures:</p>
    <ul class="departure-list">${items}</ul>
  `;
}

function getNextDepartures(line, station) {
    const now = new Date();
    const departures = [];
    const serviceStart = new Date();
    serviceStart.setHours(line.hours.start, 0, 0, 0);

    const serviceEnd = new Date();
    serviceEnd.setHours(line.hours.end, 0, 0, 0);

    const stationOffsetMinutes = Math.round((station.sequence - 1) * 2.5);
    let nextDeparture = new Date(serviceStart.getTime() + stationOffsetMinutes * 60000);

    while (nextDeparture < now) {
        nextDeparture = new Date(nextDeparture.getTime() + line.frequency * 60000);
    }

    while (departures.length < 5 && nextDeparture < serviceEnd) {
        departures.push(new Date(nextDeparture));
        nextDeparture = new Date(nextDeparture.getTime() + line.frequency * 60000);
    }

    if (departures.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(line.hours.start, stationOffsetMinutes, 0, 0);
        departures.push(tomorrow);
    }

    return departures;
}

function updateCountdown() {
    if (!appState.nextDepartureTime) {
        return;
    }

    const difference = appState.nextDepartureTime - new Date();

    if (difference <= 0) {
        renderTimetable(lineSelect.value, timetableStationSelect.value);
        return;
    }

    const minutes = Math.floor(difference / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);
    countdownBox.innerHTML = `<strong>Next Bus Countdown:</strong> ${minutes}m ${seconds}s`;
}

function renderScheduleTable(line) {
    const rows = line.stations.map(function (station) {
        const cumulativeTime = Math.round((station.sequence - 1) * 2.5);
        return `
      <tr>
        <td>${station.sequence}</td>
        <td>${station.name}</td>
        <td>+${cumulativeTime} min</td>
        <td>Every ${line.frequency} min</td>
      </tr>
    `;
    }).join("");

    scheduleTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Station</th>
          <th>Travel Time</th>
          <th>Frequency</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatTime(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function startBusSimulation() {
    if (!appState.map) {
        return;
    }

    appState.simulatedBuses = [
        { id: "BUS-GL-01", line: GREEN_LINE, progress: 0.05, speed: 0.015, marker: null },
        { id: "BUS-GL-02", line: GREEN_LINE, progress: 0.45, speed: 0.012, marker: null },
        { id: "BUS-OL-01", line: ORANGE_LINE, progress: 0.2, speed: 0.02, marker: null }
    ];

    appState.simulatedBuses.forEach(function (bus) {
        const position = interpolateBusPosition(bus.line.stations, bus.progress);
        bus.marker = L.marker([position.lat, position.lng], {
            icon: createBusIcon(bus.line.color)
        });

        bus.marker.bindPopup(`
      <h3 class="popup-title" style="color: ${bus.line.color};">${bus.id}</h3>
      <p class="popup-meta"><strong>Line:</strong> ${bus.line.name}</p>
      <p class="popup-meta"><strong>Status:</strong> Simulated position</p>
    `);

        bus.marker.addTo(appState.layers.buses);
    });

    appState.busSimInterval = window.setInterval(updateSimulatedBuses, 3000);
}

function updateSimulatedBuses() {
    appState.simulatedBuses.forEach(function (bus) {
        bus.progress += bus.speed;

        if (bus.progress >= 1) {
            bus.progress = 0;
        }

        const position = interpolateBusPosition(bus.line.stations, bus.progress);
        bus.marker.setLatLng([position.lat, position.lng]);
    });
}

function interpolateBusPosition(stations, progress) {
    const totalSegments = stations.length - 1;
    const exactSegment = progress * totalSegments;
    const segmentIndex = Math.min(Math.floor(exactSegment), totalSegments - 1);
    const segmentProgress = exactSegment - segmentIndex;
    const startStation = stations[segmentIndex];
    const endStation = stations[segmentIndex + 1];

    return {
        lat: startStation.lat + (endStation.lat - startStation.lat) * segmentProgress,
        lng: startStation.lng + (endStation.lng - startStation.lng) * segmentProgress
    };
}

function createBusIcon(lineColor) {
    return L.divIcon({
        className: "bus-icon-wrapper",
        html: `
      <div class="bus-icon" style="border-color: ${lineColor};">
        BUS
        <span>SIM</span>
      </div>
    `,
        iconSize: [62, 34],
        iconAnchor: [31, 17]
    });
}

function setupLayerButtons() {
    document.querySelectorAll(".layer-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const layerName = button.dataset.layer;
            const layer = appState.layers[layerName];
            const shouldShow = !button.classList.contains("active");

            button.classList.toggle("active", shouldShow);

            if (layer) {
                toggleLayer(layer, shouldShow);
            }
        });
    });
}

function toggleLayer(layer, shouldShow) {
    if (!appState.map) {
        return;
    }

    if (shouldShow) {
        layer.addTo(appState.map);
    } else {
        appState.map.removeLayer(layer);
    }
}
