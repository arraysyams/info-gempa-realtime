var map = L.map('map');

async function initializeMap() {
  map.setView([-3, 118], 3);
  map.attributionControl.setPosition("bottomleft");
  var faults;
  faultStyleRoad = {
    "color": "#6554AF",
    "weight": 1.2,
    "opacity": 1
  };
  faultStyleTerrain = {
    "color": "FD8D14",
    "weight": 1.2,
    "opacity": 1
  };
  var faultRequest = await getJSON("https://bmkg-content-inatews.storage.googleapis.com/indo_faults_lines.geojson")
  faults = L.geoJSON(faultRequest, {
    style: faultStyleRoad
  }).addTo(map);

  var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 3,
    maxZoom: 13,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }); osm.addTo(map);

  map.attributionControl.addAttribution("Sumber data: BMKG")
}

class DivObject {
  constructor(textContent, className, idName) {
    let div = document.createElement("div");
    if (textContent) {
      div.textContent = textContent;
    }
    if (className) {
      div.classList.add(className)
    }
    if (idName) {
      div.id = idName;
    }
    this.this = div;
  }
}

class EntriGempa {
  // Gunakan function tambahLingkaran/InfoHTML() untuk menempelkan event
  constructor(eventId, magnitudo, kedalaman, lokasi, waktu, lat, lng) {
    this._eventId = eventId;
    this._mag = parseFloat(magnitudo);
    this._kedalaman = parseFloat(kedalaman);
    this._lokasi = lokasi;
    this._waktu = waktu;
    this._lat = lat;
    this._lng = lng;
    this._lingkaran = L.circleMarker();
    this._HTMLInfo = "";
    this.tambahLingkaran()
    this.tambahInfoHTML()
  }
  #visible = false;
  #defaultStyle = {};
  #hoverStyle = {};

  _getKerangkaHTML () {
    const html = new DOMParser();
    const htmlnew = html.parseFromString(`
    <div class="entri">
      <div class="mag"></div>
      <div class="info">
        <div class="lokasi"></div>
        <div class="kedalaman"></div>
        <div class="waktu"></div>
      </div>
    </div>
  `, "text/html");

    return htmlnew.querySelector(".entri");
  };

  _getLuasLingkaran(magnitudo) {
    const mag = parseFloat(magnitudo);
    if (isNaN(mag)) {
      return 7;
    }
    switch (Math.floor(Math.round(mag * 10) / 10) ) {
      case 5: return 10;
      case 6: return 14;
      case 7: return 17;
      case 8: return 19;
      case 9: return 22;
      default: return 7;
    }
  }

  tambahLingkaran () {
    this.updateLingkaran();
    if (!this.#visible) {
      this.#visible = true
      this._lingkaran.addTo(map);
    }
  };

  hapusLingkaran() {
    this.#visible = false;
    this._lingkaran.removeFrom(map);
  }

  updateLingkaran() {
    this._lingkaran.setLatLng([this._lat, this._lng]);
    const luas = this._getLuasLingkaran(this._mag);
    this.#defaultStyle = {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      opacity: 1,
      radius: luas,
      weight: 1
    }
    this.#hoverStyle = {
      color: 'black',
      fillColor: 'white',
      fillOpacity: 0.8,
      weight: 2
    }
    this._lingkaran.setStyle(this.#defaultStyle);
    this._lingkaran.bindPopup(
      L.popup().setContent(`
      <div class="popup-titik">
        <div class="mag"><b>M${getDisplayedMagnitude(this._mag)}</b></div>
        <div>${this._lokasi}</div>
        <div>Kedalaman: ${Math.round(this._kedalaman)} km</div>
      </div>
      `)
    )
  }

  tambahInfoHTML() {
    this._HTMLInfo = this._getKerangkaHTML();
    this.updateInfoHTML();
    const dftr = document.querySelector("#daftar");
    // document.querySelector("#daftar").appendChild(this._HTMLInfo);
    dftr.insertBefore(this._HTMLInfo, dftr.firstChild)
    this._HTMLInfo.addEventListener("click", () => {
      map.panTo([this._lat, this._lng]);
      this._lingkaran.openPopup();
    })
  }

  updateInfoHTML() {
    this._HTMLInfo.querySelector(".mag").textContent = getDisplayedMagnitude(this._mag);
    this._HTMLInfo.querySelector(".lokasi").textContent = this._lokasi;
    this._HTMLInfo.querySelector(".kedalaman").textContent = `${Math.round(this._kedalaman)} km`;
    this._HTMLInfo.querySelector(".waktu").textContent = this._waktu;
    if (this._mag >= 7) {
      this._HTMLInfo.classList.add("bahaya");
    } else if (this._mag >= 5) {
      this._HTMLInfo.classList.add("signifikan");
    } else {
      this._HTMLInfo.classList.remove("signifikan", "bahaya");
    }
  }

  updateParameter(magnitudo, kedalaman, lokasi, waktu, lat, lng){
    if (magnitudo) {this._mag = parseFloat(magnitudo);}
    if (kedalaman) {this._kedalaman = parseFloat(kedalaman)}
    if (lokasi) {this._lokasi = lokasi}
    if (waktu) {this._waktu = waktu}
    if (lat) {this._lat = parseFloat(lat)}
    if (lng) {this._lng = parseFloat(lng)}
    this.updateLingkaran();
    this.updateInfoHTML();
  }
}

var daftarGempa = {}

async function susunDaftarRealtime() {
  const sumber = await getXML("https://bmkg-content-inatews.storage.googleapis.com/live30event.xml");
  const data = [];
  sumber.querySelectorAll("gempa").forEach((entri) => {
    data.unshift(entri)
  })
  data.forEach((entri) => {
    const eventId = entri.querySelector("eventid").textContent;
    const mag = entri.querySelector("mag").textContent;
    const waktu = entri.querySelector("waktu").textContent.split(".")[0] + " UTC";
    const kedalaman = entri.querySelector("dalam").textContent;
    const tempat = entri.querySelector("area").textContent;

    const lat = parseFloat(entri.querySelector("lintang").textContent);
    let lng = parseFloat(entri.querySelector("bujur").textContent);
    if (lng<-20) {
      lng = 180 + 180 + lng
    }
    const infoBaru = new EntriGempa(eventId, mag, kedalaman, tempat, waktu, lat, lng);
    daftarGempa[eventId] = infoBaru;
  })
}

var currentData;
async function getDataRealtime() {
  try {
    const latestData = await getJSON("https://bmkg-content-inatews.storage.googleapis.com/lastQL.json", {cache: "no-cache"});
    if (currentData != JSON.stringify(latestData)) {
      currentData = JSON.stringify(latestData);
      const eventid = latestData.features[0].properties.id;
      const mag = latestData.features[0].properties.mag;
      const waktu = latestData.features[0].properties.time.split(".")[0].replaceAll("-", "/") + " UTC";
      const kedalaman = latestData.features[0].properties.depth;
      const tempat = latestData.features[0].properties.place;
      const lat = parseFloat(latestData.features[0].geometry.coordinates[1]);
      let lng = parseFloat(latestData.features[0].geometry.coordinates[0]);
      if (lng<-20) {
        lng = 180 + 180 + lng
      }

      if (daftarGempa[eventid]) {
        daftarGempa[eventid].updateParameter(mag, kedalaman, tempat, waktu, lat, lng);
      } else {
        const infoBaru = new EntriGempa(eventid, mag, kedalaman, tempat, waktu, lat, lng);
        daftarGempa[eventid] = infoBaru;
      }
    }
    showTopError()
  } catch (error) {
    showTopError(`Kesalahan jaringan. (${error})`)
  }
  window.setTimeout(() => {getDataRealtime()}, 5000)
}

function getDisplayedMagnitude(magnitudo) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1
  }).format(
    Math.round(parseFloat(magnitudo) * 10) / 10
  );
}

async function getXML(url) {
  const parser = new DOMParser();
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`)
  }
	const xml = await res.text();
	return parser.parseFromString(xml, "text/xml");
}

async function getJSON(url, options) {
  if (!options) {
    opt = {}
  }
  const res = await fetch(url, opt)
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`)
  }
  const json = await res.json();
  return json;
}

function showTopError(message) {
  const tErr = document.querySelector("#modal-error");
  if (message) {
    tErr.querySelector("span").textContent = message;
    tErr.style.display = "flex"
  } else {
    tErr.style.display = "none"
  }
}

async function mulai() {
  let err;
  try {
    await initializeMap();
    await susunDaftarRealtime();
  } catch (e) {
    err = e;
  }
  if (err) {
    const retry = confirm(`Terjadi kesalahan saat pengambilan data. Coba lagi?\n(${err})`);
    if (retry) {
      window.setTimeout(() => mulai(), 500)
    } else {
      document.querySelector(".spinner").style.display = "none";
      showTopError(`Terjadi kesalahan, mohon refresh halaman ini. (${err})`)
    }
  } else {
    document.querySelector(".loading").style.display = "none";
    getDataRealtime();
  }
}

mulai()