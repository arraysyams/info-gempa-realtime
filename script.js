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
    switch (Math.floor(mag)) {
      case 5: return 10;
      case 6: return 15;
      case 7: return 20;
      case 8: return 30;
      case 9: return 40;
      default: return 7;
    }
  }

  tambahLingkaran () {
    this.updateLingkaran();
    this._lingkaran.addEventListener("mouseover", () => {
      this._lingkaran.setStyle(this.#hoverStyle);
      this._lingkaran.bringToFront()
    })
    this._lingkaran.addEventListener("mouseout", () => {
      this._lingkaran.setStyle(this.#defaultStyle);
    })
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
        <div class="mag"><b>M${this._mag}</b></div>
        <div>${this._lokasi}</div>
        <div>Kedalaman: ${this._kedalaman} km</div>
      </div>
      `)
    )
  }

  tambahInfoHTML() {
    this._HTMLInfo = this._getKerangkaHTML();
    this.updateInfoHTML();
    document.querySelector("#daftar").appendChild(this._HTMLInfo);
    this._HTMLInfo.addEventListener("click", () => {
      map.panTo([this._lat, this._lng]);
    })
    this._HTMLInfo.addEventListener("mouseover", () => {
      this._lingkaran.setStyle(this.#hoverStyle);
      this._lingkaran.bringToFront()
    })
    this._HTMLInfo.addEventListener("mouseout", () => {
      this._lingkaran.setStyle(this.#defaultStyle);
    })
  }

  updateInfoHTML() {
    this._HTMLInfo.querySelector(".mag").textContent = this._mag;
    this._HTMLInfo.querySelector(".lokasi").textContent = this._lokasi;
    this._HTMLInfo.querySelector(".kedalaman").textContent = `${this._kedalaman} km`;
    this._HTMLInfo.querySelector(".waktu").textContent = this._waktu;
    if (this._mag >= 7) {
      this._HTMLInfo.classList.add("bahaya");
    } else if (this._mag >= 5) {
      this._HTMLInfo.classList.add("signifikan");
    } else {
      this._HTMLInfo.classList.remove("signifikan", "bahaya");
    }
  }

  updateInfo(){
    this.updateLingkaran()
    this.updateInfoHTML()
  }
}

var daftarGempa = {}

async function susunDaftarRealtime() {
  const sumber = await getXML("https://bmkg-content-inatews.storage.googleapis.com/live30event.xml");
  const data = sumber.querySelectorAll("gempa");
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

async function getDataRealtime() {
  
}

async function getXML(url) {
  const parser = new DOMParser();
  const res = await fetch(url)
	const xml = await res.text();
	return parser.parseFromString(xml, "text/xml");
}

async function getJSON(url) {
  const res = await fetch(url)
	const json = await res.json();
	return json;
}

initializeMap()
susunDaftarRealtime()