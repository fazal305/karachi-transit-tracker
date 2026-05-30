/* Karachi Transit Tracker Main Logic */

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

/* Start the app after the page loads */
$(document).ready(function () {
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

/* Switch between dashboard tabs */
function setupTabs() {
    $(".transit-tabs .nav-link").on("click", function () {
        const selectedTab = $(this).data("tab");

        $(".transit-tabs .nav-link").removeClass("active");
        $(this).addClass("active");

        $(".tab-panel").removeClass("active-panel");
        $("#" + selectedTab).addClass("active-panel");

        if (selectedTab === "map-panel" && appState.map) {
            setTimeout(function () {
                appState.map.invalidateSize();
            }, 100);
        }
    });
}

/* Fill all station dropdowns with transit data */
function populateDropdowns() {
    const allStations = [...GREEN_LINE.stations, ...ORANGE_LINE.stations];

    $("#from-station").empty();
    $("#to-station").empty();
    $("#timetable-station").empty();

    allStations.forEach(function (station) {
        const optionText = station.name + " (" + station.id + ")";

        $("#from-station").append(`<option value="${station.id}">${optionText}</option>`);
        $("#to-station").append(`<option value="${station.id}">${optionText}</option>`);
    });

    populateTimetableStations(GREEN_LINE);
}

/* Fill timetable station dropdown for selected line */
function populateTimetableStations(line) {
    $("#timetable-station").empty();

    line.stations.forEach(function (station) {
        $("#timetable-station").append(`<option value="${station.id}">${station.name}</option>`);
    });
}

/* Create the Leaflet map and draw routes */
function initMap() {
    appState.map = L.map("karachi-map").setView([KARACHI_CENTER.lat, KARACHI_CENTER.lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(appState.map);

    const greenCoordinates = GREEN_LINE.stations.map(function (station) {
        return [station.lat, station.lng];
    });

    const orangeCoordinates = ORANGE_LINE.stations.map(function (station) {
        return [station.lat, station.lng];
    });

    appState.layers.greenLine = L.polyline(greenCoordinates, {
        color: GREEN_LINE.color,
        weight: 6,
        opacity: 0.9
    }).addTo(appState.map);

    appState.layers.orangeLine = L.polyline(orangeCoordinates, {
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

/* Add station markers to the map */
function addStationMarkers(line) {
    line.stations.forEach(function (station) {
        const marker = L.marker([station.lat, station.lng]);

        marker.bindPopup(renderStationPopup(station, line));

        marker.addTo(appState.layers.stations);
    });
}

/* Build popup content for station markers */
function renderStationPopup(station, line) {
    return `
        <h3 class="popup-title" style="color: ${line.color};">${station.name}</h3>
        <p class="popup-meta"><strong>Line:</strong> ${line.name}</p>
        <p class="popup-meta"><strong>Next Bus:</strong> Every ${line.frequency || GREEN_LINE.frequency} minutes</p>
        <p class="popup-meta"><strong>Fare:</strong> Rs ${GREEN_LINE.fare.minimum} - Rs ${GREEN_LINE.fare.maximum}</p>
    `;
}

/* Fetch Karachi weather from Open-Meteo */
async function fetchWeather() {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${KARACHI_CENTER.lat}&longitude=${KARACHI_CENTER.lng}&current=temperature_2m,precipitation,wind_speed_10m`;

    try {
        const response = await fetch(weatherUrl);
        const data = await response.json();

        appState.weather = data.current;

        const temperature = data.current.temperature_2m;
        const precipitation = data.current.precipitation;
        const windSpeed = data.current.wind_speed_10m;

        $("#weather-widget").html(`
            <strong>Karachi Weather</strong><br>
            🌡️ Temperature: ${temperature}°C<br>
            🌧️ Rain: ${precipitation} mm<br>
            💨 Wind: ${windSpeed} km/h
        `);

        if (precipitation > 0) {
            $("#rain-alert").removeClass("d-none");
        } else {
            $("#rain-alert").addClass("d-none");
        }
    } catch (error) {
        $("#weather-widget").html(`
            <strong>Weather unavailable</strong><br>
            Could not fetch live weather right now.
        `);
    }
}

/* Fetch real landmarks near Karachi from OpenStreetMap */
async function fetchNearbyLandmarks() {
    const overpassQuery = `
        [out:json][timeout:25];
        (
            node["tourism"="attraction"](around:3500,${KARACHI_CENTER.lat},${KARACHI_CENTER.lng});
            node["amenity"="bus_station"](around:6000,${KARACHI_CENTER.lat},${KARACHI_CENTER.lng});
            node["railway"="station"](around:6000,${KARACHI_CENTER.lat},${KARACHI_CENTER.lng});
        );
        out body 20;
    `;

    const overpassUrl = "https://overpass-api.de/api/interpreter";

    try {
        const response = await fetch(overpassUrl, {
            method: "POST",
            body: overpassQuery
        });

        const data = await response.json();

        data.elements.forEach(function (place) {
            if (!place.tags || !place.tags.name) {
                return;
            }

            const marker = L.marker([place.lat, place.lon]);

            marker.bindPopup(`
                <h3 class="popup-title" style="color: #00f5ff;">${place.tags.name}</h3>
                <p class="popup-meta"><strong>Source:</strong> OpenStreetMap</p>
                <p class="popup-meta"><strong>Type:</strong> ${place.tags.amenity || place.tags.tourism || place.tags.railway || "landmark"}</p>
            `);

            marker.addTo(appState.layers.landmarks);
        });
    } catch (error) {
        console.log("Overpass API failed:", error);
    }
}

/* Connect route planner buttons */
function setupRoutePlanner() {
    $("#plan-route-btn").on("click", function () {
        const fromId = $("#from-station").val();
        const toId = $("#to-station").val();

        planRoute(fromId, toId);
    });

    $("#refresh-weather-btn").on("click", function () {
        fetchWeather();

        $("#route-result").append(`
            <div class="mt-3 text-info">
                Weather refreshed. Check the map weather card for latest conditions.
            </div>
        `);
    });
}

/* Find station and line by station id */
function findStationById(stationId) {
    const greenStation = GREEN_LINE.stations.find(function (station) {
        return station.id === stationId;
    });

    if (greenStation) {
        return {
            station: greenStation,
            line: GREEN_LINE,
            lineKey: "green"
        };
    }

    const orangeStation = ORANGE_LINE.stations.find(function (station) {
        return station.id === stationId;
    });

    return {
        station: orangeStation,
        line: ORANGE_LINE,
        lineKey: "orange"
    };
}

/* Calculate and render route result */
function planRoute(fromId, toId) {
    const originData = findStationById(fromId);
    const destinationData = findStationById(toId);

    if (!originData.station || !destinationData.station) {
        $("#route-result").html("Could not find one of the selected stations.");
        return;
    }

    if (fromId === toId) {
        $("#route-result").html("Origin and destination are the same station.");
        return;
    }

    if (originData.lineKey === destinationData.lineKey) {
        renderDirectRoute(originData, destinationData);
        return;
    }

    renderTransferRoute(originData, destinationData);
}

/* Render route when both stations are on the same line */
function renderDirectRoute(originData, destinationData) {
    const stops = Math.abs(destinationData.station.sequence - originData.station.sequence);
    const estimatedTime = Math.ceil(stops * 2.5);
    const fare = fareCalculator(originData.station.sequence, destinationData.station.sequence);

    $("#route-result").html(`
        <div class="card route-card" style="border-left: 5px solid ${originData.line.color};">
            <div class="card-body">
                <h3>${originData.line.name}</h3>
                <p><strong>Board:</strong> ${originData.station.name}</p>
                <p><strong>Ride:</strong> ${stops} stops</p>
                <p><strong>Alight:</strong> ${destinationData.station.name}</p>
                <p><strong>Estimated Time:</strong> ${estimatedTime} minutes</p>
                <p><strong>Fare:</strong> Rs ${fare}</p>
            </div>
        </div>
    `);
}

/* Render route when journey needs transfer */
function renderTransferRoute(originData, destinationData) {
    const transferName = "Board Office";

    const originTransfer = originData.line.stations.find(function (station) {
        return station.name === transferName;
    });

    const destinationTransfer = destinationData.line.stations.find(function (station) {
        return station.name === transferName;
    });

    const firstLegStops = Math.abs(originTransfer.sequence - originData.station.sequence);
    const secondLegStops = Math.abs(destinationData.station.sequence - destinationTransfer.sequence);
    const totalStops = firstLegStops + secondLegStops;
    const estimatedTime = Math.ceil(totalStops * 2.5 + 5);
    const fare = Math.min(GREEN_LINE.fare.maximum, fareCalculator(1, totalStops + 1));

    $("#route-result").html(`
        <div class="card route-card" style="border-left: 5px solid ${originData.line.color};">
            <div class="card-body">
                <h3>Transfer Route</h3>
                <p><strong>Step 1:</strong> Board ${originData.line.name} at ${originData.station.name}</p>
                <p><strong>Transfer:</strong> Change at ${transferName}</p>
                <p><strong>Step 2:</strong> Take ${destinationData.line.name} toward ${destinationData.station.name}</p>
                <p><strong>Total Stops:</strong> ${totalStops}</p>
                <p><strong>Estimated Time:</strong> ${estimatedTime} minutes including transfer time</p>
                <p><strong>Estimated Fare:</strong> Rs ${fare}</p>
            </div>
        </div>
    `);
}

/* Connect timetable events */
function setupTimetable() {
    renderTimetable("green", $("#timetable-station").val());

    $("#line-select").on("change", function () {
        const selectedLine = getLineByKey($(this).val());

        populateTimetableStations(selectedLine);
        renderTimetable($(this).val(), $("#timetable-station").val());
    });

    $("#timetable-station").on("change", function () {
        renderTimetable($("#line-select").val(), $(this).val());
    });

    $("#print-timetable-btn").on("click", function () {
        window.print();
    });
}

/* Get line object from dropdown value */
function getLineByKey(lineKey) {
    if (lineKey === "orange") {
        return ORANGE_LINE;
    }

    return GREEN_LINE;
}

/* Render timetable for selected line and station */
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

    if (appState.countdownInterval) {
        clearInterval(appState.countdownInterval);
    }

    appState.countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
}

/* Show active or closed service status */
function renderServiceStatus(line) {
    const status = checkServiceStatus(line);
    const statusClass = status === "ACTIVE" ? "status-active" : "status-closed";

    $("#service-status").html(`
        <strong>Service Status:</strong>
        <span class="${statusClass}">${status}</span>
        <span class="text-secondary">(${line.hours.start}:00 - ${line.hours.end}:00)</span>
    `);
}

/* Check service status by current hour */
function checkServiceStatus(line) {
    const currentHour = new Date().getHours();

    if (currentHour >= line.hours.start && currentHour < line.hours.end) {
        return "ACTIVE";
    }

    return "CLOSED";
}

/* Show next 5 departures */
function renderNextDepartures(line, station) {
    const departures = getNextDepartures(line, station);

    appState.nextDepartureTime = departures[0];

    const departureItems = departures.map(function (departure, index) {
        const label = index === 0 ? "Next" : "Upcoming";

        return `
            <li>
                <strong>${label}:</strong>
                ${formatTime(departure)}
            </li>
        `;
    }).join("");

    $("#next-departures").html(`
        <strong>${station.name}</strong>
        <p class="mb-2">Next 5 departures:</p>
        <ul class="departure-list">
            ${departureItems}
        </ul>
    `);
}

/* Calculate next departure times */
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

/* Update live countdown display */
function updateCountdown() {
    if (!appState.nextDepartureTime) {
        return;
    }

    const now = new Date();
    const difference = appState.nextDepartureTime - now;

    if (difference <= 0) {
        renderTimetable($("#line-select").val(), $("#timetable-station").val());
        return;
    }

    const minutes = Math.floor(difference / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);

    $("#countdown-box").html(`
        <strong>Next Bus Countdown:</strong>
        ${minutes}m ${seconds}s
    `);
}

/* Render full station schedule table */
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

    $("#schedule-table").html(`
        <table class="table table-striped table-bordered mb-0">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Station</th>
                    <th>Travel Time</th>
                    <th>Frequency</th>
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `);
}

/* Format date object into readable time */
function formatTime(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* Start simulated bus movement on route coordinates */
function startBusSimulation() {
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
            <p class="popup-meta"><strong>Status:</strong> SIMULATED Position</p>
        `);

        bus.marker.addTo(appState.layers.buses);
    });

    appState.busSimInterval = setInterval(updateSimulatedBuses, 3000);
}

/* Move simulated buses forward along their routes */
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

/* Calculate bus position between route stations */
function interpolateBusPosition(stations, progress) {
    const totalSegments = stations.length - 1;
    const exactSegment = progress * totalSegments;
    const segmentIndex = Math.floor(exactSegment);
    const segmentProgress = exactSegment - segmentIndex;

    const startStation = stations[segmentIndex];
    const endStation = stations[Math.min(segmentIndex + 1, stations.length - 1)];

    const lat = startStation.lat + (endStation.lat - startStation.lat) * segmentProgress;
    const lng = startStation.lng + (endStation.lng - startStation.lng) * segmentProgress;

    return { lat: lat, lng: lng };
}

/* Create a custom bus icon */
function createBusIcon(lineColor) {
    return L.divIcon({
        className: "bus-icon-wrapper",
        html: `
            <div class="bus-icon" style="border-color: ${lineColor};">
                🚌
                <span>SIM</span>
            </div>
        `,
        iconSize: [54, 34],
        iconAnchor: [27, 17]
    });
}

/* Toggle map layers on and off */
function setupLayerButtons() {
    $(".layer-btn").on("click", function () {
        const layerName = $(this).data("layer");

        $(this).toggleClass("active");

        if (layerName === "greenLine") toggleLayer(appState.layers.greenLine, $(this).hasClass("active"));
        if (layerName === "orangeLine") toggleLayer(appState.layers.orangeLine, $(this).hasClass("active"));
        if (layerName === "stations") toggleLayer(appState.layers.stations, $(this).hasClass("active"));
        if (layerName === "buses") toggleLayer(appState.layers.buses, $(this).hasClass("active"));
        if (layerName === "landmarks") toggleLayer(appState.layers.landmarks, $(this).hasClass("active"));
    });
}

/* Show or hide one Leaflet layer */
function toggleLayer(layer, shouldShow) {
    if (shouldShow) {
        layer.addTo(appState.map);
    } else {
        appState.map.removeLayer(layer);
    }
}