var map = L.map("map");

async function initializeMap() {
  const displayMap = document.getElementById("map");
  const lebar = displayMap.clientWidth;
  const tinggi = displayMap.clientHeight;
  let zoomLevel = 3;
  if (lebar >= 2100 && tinggi >= 850) {
    zoomLevel = 6;
  } else if (lebar >= 1100 && tinggi >= 450) {
    zoomLevel = 5;
  } else if (lebar >= 550 && tinggi >= 220) {
    zoomLevel = 4;
  } else {
    zoomLevel = 3;
  }
  map.setView([-3, 118], zoomLevel);
  map.zoomControl.setPosition("bottomleft");
  map.attributionControl.setPosition("topleft");
  map.attributionControl.setPrefix(`<a href="https://leafletjs.com/" target="_blank">Leaflet</a>`);
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 3,
    maxZoom: 13,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
  });
  osm.addTo(map);
  map.attributionControl.addAttribution(`Sumber data: BMKG`);
  setCreditsButton();
  setSidebarDisplay();
}

function loadFaultsLines() {
  // const faultStyleRoad = {
  //   "color": "#6554AF",
  //   "weight": 1.2,
  //   "opacity": 1
  // };
  // const faultStyleTerrain = {
  //   "color": "FD8D14",
  //   "weight": 1.2,
  //   "opacity": 1
  // };

  getJSON("https://bmkg-content-inatews.storage.googleapis.com/indo_faults_lines.geojson")
    .then((faults_geojson) => {
      const faults = L.geoJSON(faults_geojson);
      faults.addTo(map);
      faults.bringToBack();
      faults.eachLayer((layer) => {
        L.DomUtil.addClass(layer.getElement(), "faults-area");
      });
    })
    .catch((e) => {
      console.error("Gagal memuat data sesar gempa:", e);
    });
}

class EntriGempa {
  // Gunakan function tambahLingkaran/InfoHTML() untuk menempelkan event
  constructor({ eventId, magnitudo, kedalaman, lokasi, waktu, lat, lng }) {
    this._eventId = eventId || "";
    this._mag = parseFloat(magnitudo) || 0;
    this._kedalaman = parseFloat(kedalaman) || 0;
    this._lokasi = lokasi || "";
    this._waktu = waktu || "";
    this._lat = parseFloat(lat) || 0;
    this._lng = parseFloat(lng) || 0;
    this._lingkaran = L.circleMarker();
    this._HTMLInfo = this._getKerangkaHTML();
    // this.tambahLingkaran();
    // this.tambahInfoHTML();
  }
  #visible = false;
  #defaultStyle = {};
  #hoverStyle = {};

  _getKerangkaHTML() {
    const html = new DOMParser();
    const htmlnew = html.parseFromString(
      `
    <div class="entri">
      <div class="mag"></div>
      <div class="info">
        <div class="lokasi"></div>
        <div class="kedalaman"></div>
        <div class="waktu"></div>
      </div>
    </div>
  `,
      "text/html"
    );

    return htmlnew.querySelector(".entri");
  }

  _getLuasLingkaran(magnitudo) {
    const mag = parseFloat(magnitudo);
    if (isNaN(mag)) {
      return 7;
    }
    switch (Math.floor(Math.round(mag * 10) / 10)) {
      case 5:
        return 10;
      case 6:
        return 14;
      case 7:
        return 17;
      case 8:
        return 19;
      case 9:
        return 22;
      default:
        return 7;
    }
  }

  tambahLingkaran() {
    this.updateLingkaran();
    this._lingkaran.on("popupopen", (e) => {
      // e.target.setStyle(this.#hoverStyle);
      e.target.bringToFront();
      L.DomUtil.addClass(e.target.getElement(), "clicked");
    });
    this._lingkaran.on("popupclose", (e) => {
      // e.target.setStyle(this.#defaultStyle);
      L.DomUtil.removeClass(e.target.getElement(), "clicked");
    });
    if (!this.#visible) {
      this.#visible = true;
      this._lingkaran.addTo(map);
      L.DomUtil.addClass(this._lingkaran.getElement(), "lingkaran-episenter");
    }
  }

  hapusLingkaran() {
    this.#visible = false;
    this._lingkaran.removeFrom(map);
  }

  updateLingkaran() {
    this._lingkaran.setLatLng([this._lat, this._lng]);
    const luas = this._getLuasLingkaran(this._mag);
    this.#defaultStyle = {
      // fillOpacity: 0.5,
      // opacity: 1,
      radius: luas,
      // weight: 1
    };
    this.#hoverStyle = {
      // color: 'black',
      // fillColor: 'white',
      // fillOpacity: 0.8,
      // weight: 2
    };
    this._lingkaran.setStyle(this.#defaultStyle);
    this._lingkaran.bindPopup(
      L.popup().setContent(`
      <div class="popup-titik">
        <div class="mag">
          <span>${getDisplayedMagnitude(this._mag)}</span>
        </div>
        <div class="info">
          <div class="lokasi">${this._lokasi}</div>
          <div class="kedalaman">Kedalaman: ${Math.round(this._kedalaman)} km</div>
          <div class="waktu">${getLocalTime(this._waktu)}</div>
        </div>
      </div>
      `)
    );
  }

  tambahInfoHTML() {
    this.updateInfoHTML();
    const dftr = document.querySelector("#daftar");
    dftr.insertBefore(this._HTMLInfo, dftr.firstChild);
    this._HTMLInfo.addEventListener("click", () => {
      map.panTo([this._lat, this._lng]);
      this._lingkaran.openPopup();
    });
  }

  updateInfoHTML() {
    this._HTMLInfo.querySelector(".mag").textContent = getDisplayedMagnitude(this._mag);
    this._HTMLInfo.querySelector(".lokasi").textContent = this._lokasi;
    this._HTMLInfo.querySelector(".kedalaman").textContent = `${Math.round(this._kedalaman)} km`;
    this._HTMLInfo.querySelector(".waktu").textContent = getLocalTime(this._waktu);
    if (this._mag >= 7) {
      this._HTMLInfo.classList.add("bahaya");
    } else if (this._mag >= 5) {
      this._HTMLInfo.classList.remove("bahaya");
      this._HTMLInfo.classList.add("signifikan");
    } else {
      this._HTMLInfo.classList.remove("signifikan", "bahaya");
    }
  }

  setParameter({ eventId, magnitudo, kedalaman, lokasi, waktu, lat, lng }) {
    this._eventId = eventId || this._eventId || "";
    this._mag = parseFloat(magnitudo) || this._mag || 0;
    this._kedalaman = parseFloat(kedalaman) || this._kedalaman || 0;
    this._lokasi = lokasi || this._lokasi || "";
    this._waktu = waktu || this._waktu || "";
    this._lat = parseFloat(lat) || this._lat || 0;
    this._lng = parseFloat(lng) || this._lng || 0;
    this.updateLingkaran();
    this.updateInfoHTML();
  }
}

var daftarGempa = [];

function hapusKelebihanDaftar() {
  const batasJumlah = 200;
  if (daftarGempa.length > batasJumlah) {
    const removedEvents = daftarGempa.splice(batasJumlah);
    removedEvents.forEach((event) => {
      event.entri.hapusLingkaran();
      event.entri._HTMLInfo.remove();
    });
  }
}

var daftarInterval;
async function susunDaftarRealtime() {
  const sumber = await getJSON("https://bmkg-content-inatews.storage.googleapis.com/gempaQL.json");

  if (daftarGempa.length > 0) {
    daftarGempa.forEach((event) => {
      event.entri._HTMLInfo.remove();
      event.entri.hapusLingkaran();
    });
  }

  sumber.features.forEach((event) => {
    const eventId = event.properties.id;
    const mag = event.properties.mag;
    const waktu = event.properties.time;
    const kedalaman = event.properties.depth;
    const tempat = event.properties.place;

    const lat = parseFloat(event.geometry.coordinates[1]);
    let lng = parseFloat(event.geometry.coordinates[0]);
    if (lng < -20) {
      lng = 180 + 180 + lng;
    }

    const existingEvent = daftarGempa.find((event) => event.id == eventId);

    if (existingEvent) {
      existingEvent.waktu = event.properties.time;
      existingEvent.entri.setParameter({
        magnitudo: mag,
        kedalaman: kedalaman,
        lokasi: tempat,
        waktu: waktu,
        lat: lat,
        lng: lng,
      });
    } else {
      const infoBaru = new EntriGempa({
        eventId: eventId,
        magnitudo: mag,
        kedalaman: kedalaman,
        lokasi: tempat,
        waktu: waktu,
        lat: lat,
        lng: lng,
      });
      daftarGempa.push({
        id: eventId,
        waktu: event.properties.time,
        entri: infoBaru,
      });
    }
  });

  // Dokumentasi Array.sort()
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
  daftarGempa.sort((a, b) => {
    if (a.waktu < b.waktu) {
      return 1;
    } else if (a.waktu > b.waktu) {
      return -1;
    } else {
      if (a.id < b.id) {
        return 1;
      } else if (a.id > b.id) {
        return -1;
      } else {
        return 0;
      }
    }
  });

  hapusKelebihanDaftar();
  // Urutan array sudah sesuai, namun harus dibalik agar tampilan di html sama
  [...daftarGempa].reverse().forEach((event) => {
    event.entri.tambahInfoHTML();
    event.entri.tambahLingkaran();
  });
}

var realtimeInterval = {
  _interval: null,
  start: () => {
    this._interval = setInterval(() => {
      getDataRealtime();
    }, 5000);
  },
  stop: () => {
    clearInterval(this._interval);
  },
};

var currentData;
async function getDataRealtime() {
  let latestData;
  try {
    latestData = await getJSON("https://bmkg-content-inatews.storage.googleapis.com/lastQL.json", {
      cache: "no-cache",
    });
  } catch (errNetwork) {
    showInnerMessage(`Kesalahan jaringan:\n${errNetwork}`);
    latestData = false;
  }
  if (latestData != false) {
    try {
      if (currentData != JSON.stringify(latestData)) {
        currentData = JSON.stringify(latestData);
        const eventid = latestData.features[0].properties.id;
        const mag = latestData.features[0].properties.mag;
        const waktu = latestData.features[0].properties.time;
        const kedalaman = latestData.features[0].properties.depth;
        const tempat = latestData.features[0].properties.place;
        const lat = parseFloat(latestData.features[0].geometry.coordinates[1]);
        let lng = parseFloat(latestData.features[0].geometry.coordinates[0]);
        if (lng < -20) {
          lng = 180 + 180 + lng;
        }

        const existingEvent = daftarGempa.find((event) => event.id == eventid);

        if (existingEvent) {
          existingEvent.waktu = waktu;
          existingEvent.entri.setParameter({
            magnitudo: mag,
            kedalaman: kedalaman,
            lokasi: tempat,
            waktu: waktu,
            lat: lat,
            lng: lng,
          });
          existingEvent.entri.updateInfoHTML();
          existingEvent.entri.updateLingkaran();
          playAudio("aud-update");
        } else {
          const infoBaru = new EntriGempa({
            eventId: eventid,
            magnitudo: mag,
            kedalaman: kedalaman,
            lokasi: tempat,
            waktu: waktu,
            lat: lat,
            lng: lng,
          });
          daftarGempa.unshift({
            id: eventid,
            waktu: latestData.features[0].properties.time,
            entri: infoBaru,
          });
          infoBaru.tambahInfoHTML();
          infoBaru.tambahLingkaran();
          hapusKelebihanDaftar();
          if (parseFloat(mag) >= 7) {
            if (document.hidden) {
              playAudio("aud-alert");
              const stopAlert = function () {
                document.querySelector("#aud-alert").pause();
                document.querySelector("#aud-alert").currentTime = 0;
                playAudio("aud-warning");
                document.removeEventListener("visibilitychange", stopAlert);
              };
              document.addEventListener("visibilitychange", stopAlert);
            }
          } else if (parseFloat(mag) >= 6) {
            playAudio("aud-warning");
          } else {
            playAudio("aud-info");
          }
        }
      }
      showTopError();
    } catch (error) {
      showTopError(`Terjadi kesalahan. (${error})`);
    }
  }
}

// Variabel untuk menandai izin autoplay suara
var audioActivated = false;
async function playAudio(audioId) {
  if (!audioActivated) {
    return;
  }
  try {
    let aud;
    try {
      aud = document.querySelector(`#${audioId}`);
      if (aud === null || typeof aud === "undefined") {
        throw "Objek audio tidak ditemukan";
      } else {
        if (typeof aud.play !== "function") {
          throw "Objek yang dipilih bukan audio";
        }
      }
    } catch (error_dom) {
      throw error_dom;
    }

    try {
      await aud.play();
    } catch (error) {
      throw "Gagal memutar suara:\nMohon berikan izin autoplay untuk website ini.";
    }
  } catch (error) {
    showInnerMessage(error);
  }
}

async function askAutoplay() {
  const aud = document.querySelector("#aud-empty");
  let errAutoplay;
  let setelanAudio = window.localStorage.getItem("setelanAudio");
  let bukaModal = true;

  try {
    await aud.play();
  } catch (error) {
    errAutoplay = error;
  }

  if ((errAutoplay && setelanAudio === "0") || (!errAutoplay && setelanAudio === "1")) {
    bukaModal = false;
  }
  // Tampilkan modal jika user pertama kali membuka website
  // atau jika user ingin selalu mengaktifkan suara, namun tidak memberikan izin autoplay
  if (bukaModal) {
    const chkJangan = document.querySelector("#modal-autoplay #chk-jangan");
    document.querySelector("#modal-autoplay-container").classList.add("show");
    const tutupModal = () => {
      document.querySelector("#modal-autoplay-container").classList.remove("show");
    };
    const btnYa = document.querySelector("#modal-autoplay #btn-ya");
    btnYa.addEventListener("click", () => {
      audioActivated = true;
      if (chkJangan.checked == true) {
        window.localStorage.setItem("setelanAudio", "1");
        if (errAutoplay) {
          showInnerMessage(
            "Untuk mengaktifkan suara secara permanen,\nmohon berikan izin autoplay untuk website ini\npada pengaturan browser Anda.",
            15000
          );
        }
      }
      tutupModal();
    });
    const btnTidak = document.querySelector("#modal-autoplay #btn-tdk");
    btnTidak.addEventListener("click", () => {
      audioActivated = false;
      if (chkJangan.checked == true) {
        window.localStorage.setItem("setelanAudio", "0");
      }
      tutupModal();
    });
  } else {
    if (setelanAudio === "1") {
      audioActivated = true;
    }
  }
}

function getDisplayedMagnitude(magnitudo) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
  }).format(Math.round(parseFloat(magnitudo) * 10) / 10);
}

async function getXML(url) {
  const parser = new DOMParser();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`);
  }
  const xml = await res.text();
  return parser.parseFromString(xml, "text/xml");
}

async function getJSON(url, options) {
  if (!options) {
    opt = {};
  }
  const res = await fetch(url, opt);
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  return json;
}

function showTopError(message) {
  const modalErr = document.querySelector("#modal-error-container");
  if (message) {
    modalErr.querySelector("span").textContent = message;
    modalErr.classList.add("show");
  } else {
    modalErr.classList.remove("show");
  }
}

function showInnerMessage(message, timerMS = 5000) {
  const innerErr = L.control({ position: "topright" });
  innerErr.onAdd = function () {
    const div = L.DomUtil.create("div", "inner-message");
    div.textContent = `${message}`;
    return div;
  };
  innerErr.onRemove = function () {};

  innerErr.addTo(map);
  window.setTimeout(() => {
    innerErr.remove();
  }, timerMS);
}

function setCreditsButton() {
  const divCredits = L.control({ position: "topleft" });
  divCredits.onAdd = function (map) {
    const div = L.DomUtil.create("div", "credits");
    const btn = L.DomUtil.create("button", "btn-credits");
    btn.addEventListener("click", () => {
      document.querySelector("#modal-credits-container").classList.add("show");
    });
    L.DomEvent.addListener(btn, "dblclick", L.DomEvent.stop);
    L.DomEvent.addListener(btn, "mousedown", L.DomEvent.stop);
    L.DomEvent.addListener(btn, "mouseup", L.DomEvent.stop);
    btn.textContent = "Credits";
    div.appendChild(btn);
    return div;
  };
  divCredits.addTo(map);
  document.querySelector("#modal-credits > button").addEventListener("click", () => {
    document.querySelector("#modal-credits-container").classList.remove("show");
  });
}

function setSidebarDisplay() {
  const sidebar = document.querySelector("#sidebar");
  if (window.localStorage.getItem("hidebar") == "1") {
    sidebar.classList.add("hide");
    map.invalidateSize();
  }
  document.querySelector("#sidebar-title").addEventListener("click", () => {
    sidebar.classList.toggle("hide");
    map.invalidateSize();
    const hiddenValue = sidebar.classList.contains("hide") ? "1" : "0";
    window.localStorage.setItem("hidebar", hiddenValue);
  });
}

async function ambilData() {
  let err;

  try {
    loadFaultsLines();
    await susunDaftarRealtime();
    askAutoplay();
  } catch (e) {
    err = e;
  }
  if (err) {
    const retry = confirm(`Terjadi kesalahan saat pengambilan data. Coba lagi?\n(${err})`);
    if (retry) {
      window.setTimeout(() => ambilData(), 500);
    } else {
      document.querySelector(".spinner").style.display = "none";
      showTopError(`Terjadi kesalahan, mohon refresh halaman ini. (${err})`);
    }
  } else {
    document.querySelector(".loading").style.display = "none";
    realtimeInterval.start();
    daftarInterval = setInterval(() => {
      realtimeInterval.stop();
      susunDaftarRealtime()
        .catch((e) => {
          showInnerMessage(`Terjadi kesalahan saat memuat daftar gempa:\n${e}`, 10000);
        })
        .finally(() => {
          realtimeInterval.start();
        });
    }, 1800000);
  }
}

initializeMap()
  .then(() => ambilData())
  .catch((e) => showTopError(`Terjadi kesalahan saat memuat peta. (${e})`));
