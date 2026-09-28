/* Karachi Transit Tracker Static Data */

const KARACHI_CENTER = {
  lat: 24.8607,
  lng: 67.0011,
};

const GREEN_LINE = {
  name: "Green Line BRT",
  color: "#00c853",
  operator: "SIDCL / Karachi Breeze",
  fare: {
    minimum: 15,
    maximum: 55,
    cardFare: 5,
  },
  hours: {
    start: 7,
    end: 22,
  },
  frequency: 3,
  stations: [
    { id: "GL01", name: "Surjani Town", lat: 24.938, lng: 67.061, sequence: 1 },
    {
      id: "GL02",
      name: "4K Chowrangi",
      lat: 24.9305,
      lng: 67.067,
      sequence: 2,
    },
    { id: "GL03", name: "Power House", lat: 24.922, lng: 67.074, sequence: 3 },
    { id: "GL04", name: "UP Mor", lat: 24.9135, lng: 67.0825, sequence: 4 },
    {
      id: "GL05",
      name: "Nagan Chowrangi",
      lat: 24.904,
      lng: 67.09,
      sequence: 5,
    },
    {
      id: "GL06",
      name: "Sakhi Hassan",
      lat: 24.8965,
      lng: 67.0955,
      sequence: 6,
    },
    { id: "GL07", name: "Five Star", lat: 24.889, lng: 67.1015, sequence: 7 },
    {
      id: "GL08",
      name: "KDA Chowrangi",
      lat: 24.881,
      lng: 67.108,
      sequence: 8,
    },
    {
      id: "GL09",
      name: "Board Office",
      lat: 24.874,
      lng: 67.1145,
      sequence: 9,
    },
    {
      id: "GL10",
      name: "Ayesha Manzil",
      lat: 24.8675,
      lng: 67.1215,
      sequence: 10,
    },
    {
      id: "GL11",
      name: "Federal B Area",
      lat: 24.8615,
      lng: 67.128,
      sequence: 11,
    },
    { id: "GL12", name: "Water Pump", lat: 24.855, lng: 67.135, sequence: 12 },
    { id: "GL13", name: "Ancholi", lat: 24.8485, lng: 67.1415, sequence: 13 },
    {
      id: "GL14",
      name: "Musa Colony",
      lat: 24.8425,
      lng: 67.1475,
      sequence: 14,
    },
    {
      id: "GL15",
      name: "Jinnah College",
      lat: 24.836,
      lng: 67.1535,
      sequence: 15,
    },
    { id: "GL16", name: "Lasbela", lat: 24.83, lng: 67.1595, sequence: 16 },
    {
      id: "GL17",
      name: "Guru Mandir",
      lat: 24.824,
      lng: 67.1655,
      sequence: 17,
    },
    { id: "GL18", name: "Numaish", lat: 24.818, lng: 67.171, sequence: 18 },
    {
      id: "GL19",
      name: "Civil Hospital",
      lat: 24.813,
      lng: 67.1765,
      sequence: 19,
    },
    {
      id: "GL20",
      name: "Merewether Tower",
      lat: 24.808,
      lng: 67.1815,
      sequence: 20,
    },
    { id: "GL21", name: "Tower", lat: 24.8035, lng: 67.186, sequence: 21 },
    {
      id: "GL22",
      name: "Numaish Chowrangi",
      lat: 24.801,
      lng: 67.19,
      sequence: 22,
    },
  ],
};

const ORANGE_LINE = {
  name: "Orange Line BRT",
  color: "#ff6d00",
  operator: "Sindh Mass Transit Authority",
  fare: {
    minimum: 15,
    maximum: 55,
    cardFare: 5,
  },
  hours: {
    start: 7,
    end: 22,
  },
  frequency: 3,
  stations: [
    {
      id: "OL01",
      name: "Board Office",
      lat: 24.874,
      lng: 67.1145,
      sequence: 1,
    },
    { id: "OL02", name: "Nazimabad", lat: 24.868, lng: 67.1185, sequence: 2 },
    { id: "OL03", name: "Gol Market", lat: 24.8625, lng: 67.1235, sequence: 3 },
    {
      id: "OL04",
      name: "Shahrah-e-Quaideen",
      lat: 24.857,
      lng: 67.1295,
      sequence: 4,
    },
  ],
};

const TRANSFER_STATIONS = ["Board Office"];

/* Calculate fare based on stop count */
function fareCalculator(originSequence, destinationSequence) {
  const stopCount = Math.abs(destinationSequence - originSequence);

  if (stopCount <= 5) {
    return 15;
  }

  if (stopCount <= 10) {
    return 30;
  }

  if (stopCount <= 15) {
    return 45;
  }

  return 55;
}
