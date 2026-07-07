# Karachi Transit Tracker

A civic mobility dashboard for visualizing Karachi BRT routes, stations, simulated buses, weather, route planning, and timetable data.

Karachi Transit Tracker is built with HTML, CSS, Leaflet, OpenStreetMap tiles, Open-Meteo weather data, and vanilla JavaScript. The project uses static route data for the Green Line and Orange Line, while bus movement is clearly labeled as simulated.

## Live Demo

https://fazal305.github.io/karachi-transit-tracker/

## Features

- Interactive Leaflet map of Karachi
- Green Line and Orange Line route overlays
- Station markers with route details
- Clearly labeled simulated bus markers
- Optional landmark markers from OpenStreetMap Overpass API
- Live Karachi weather from Open-Meteo
- Rain alert for possible travel delays
- Route planner between stations
- Transfer route handling through Board Office
- Fare and estimated travel time calculation
- Timetable view with next departures
- Live countdown to the next scheduled bus
- Printable timetable table
- Responsive dashboard layout
- Vanilla JavaScript UI logic

## Data Notice

This is a portfolio and educational project. Route, station, fare, frequency, and simulated vehicle data are static demo data and should not be treated as official real-time transit information.

Weather data is requested from Open-Meteo. Map tiles and optional landmark data use OpenStreetMap services.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Leaflet
- OpenStreetMap
- Open-Meteo API
- Overpass API

## Project Structure

```text
karachi-transit-tracker/
|-- index.html
|-- transit-styles.css
|-- transit-data.js
|-- transit-script.js
|-- LICENSE
`-- README.md
```

## What I Practiced

- Working with map libraries
- Rendering static geospatial route data
- Building route planner logic
- Handling external API fallbacks
- Simulating vehicle movement along coordinates
- Managing timetable and countdown logic
- Building a responsive civic dashboard
- Keeping simulated and live data clearly labeled

## Run Locally

Open `index.html` in a browser.

An internet connection is required for map tiles, Leaflet, weather data, and optional landmark data.

## Author

Built by Fazal Abbas.

- GitHub: https://github.com/fazal305
- LinkedIn: https://www.linkedin.com/in/fazal-abbas-4653dg86

## License

This project is licensed under the MIT License.
