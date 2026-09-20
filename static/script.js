let currentMaterial = null;
let currentItem = null;
let currentLocalsAvailable = false;

// Leaflet Map globals
let leafletMap = null;
let markersGroup = null;
let userMarker = null;

// Default Center: São Paulo - SP
const SP_CENTER = [-23.55052, -46.633309];

// Initialise Leaflet Map on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  setupCoopForm();
});

function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;

  if (leafletMap) {
    leafletMap.remove();
  }

  leafletMap = L.map("map").setView(SP_CENTER, 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
  }).addTo(leafletMap);

  markersGroup = L.layerGroup().addTo(leafletMap);
}

function updateMapMarkers(points, centerCoords = null, userPos = null) {
  if (!leafletMap || !markersGroup) return;

  markersGroup.clearLayers();

  const bounds = L.latLngBounds();

  // Add User Marker if available
  if (userPos && userPos.lat && userPos.lon) {
    const userIcon = L.divIcon({
      className: "custom-user-marker",
      html: '<div style="background-color: #27ae60; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">📍</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    userMarker = L.marker([userPos.lat, userPos.lon], { icon: userIcon })
      .bindPopup("<b>Sua Localização</b>")
      .addTo(markersGroup);

    bounds.extend([userPos.lat, userPos.lon]);
  }

  // Add Recycling Points Markers
  if (points && points.length > 0) {
    points.forEach((ponto) => {
      if (ponto.latitude && ponto.longitude) {
        const marker = L.marker([ponto.latitude, ponto.longitude]);

        const distText = ponto.distancia_km !== undefined ? `<br>📏 <b>Distância:</b> ${ponto.distancia_km} km` : "";
        const materiaisText = ponto.materiais_aceitos ? `<br>♻️ <b>Aceita:</b> ${ponto.materiais_aceitos.join(", ")}` : "";
        
        let routeUrl = `https://www.openstreetmap.org/directions?engine=osrm_car&route=`;
        if (userPos && userPos.lat && userPos.lon) {
          routeUrl += `${userPos.lat}%2C${userPos.lon}%3B${ponto.latitude}%2C${ponto.longitude}`;
        } else {
          routeUrl += `%3B${ponto.latitude}%2C${ponto.longitude}`;
        }

        const popupContent = `
          <div class="map-popup-content">
            <h4 style="margin:0 0 5px 0; color:#27ae60; font-family:'Outfit',sans-serif;">${ponto.nome}</h4>
            <p style="margin:0 0 5px 0; font-size:0.9em; color:#444;">📍 ${ponto.endereco}</p>
            <p style="margin:0 0 8px 0; font-size:0.85em; color:#555;">${distText}${materiaisText}</p>
            <a href="${routeUrl}" target="_blank" style="display:inline-block; background:#2ecc71; color:white; padding:4px 10px; border-radius:4px; text-decoration:none; font-size:0.8em; font-weight:600;">🗺️ Ver Rota</a>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersGroup.addLayer(marker);
        bounds.extend([ponto.latitude, ponto.longitude]);
      }
    });

    if (bounds.isValid()) {
      leafletMap.fitBounds(bounds, { padding: [40, 40] });
    }
  } else if (centerCoords) {
    leafletMap.setView(centerCoords, 13);
  }

  setTimeout(() => {
    leafletMap.invalidateSize();
  }, 200);
}

async function verificarItem() {
  const itemInput = document.getElementById("itemInput");
  const geminiResultDiv = document.getElementById("geminiResult");
  const btnVerificar = document.getElementById("btnVerificar");

  geminiResultDiv.style.display = "none";
  const item = itemInput.value.trim();

  if (!item) {
    geminiResultDiv.innerHTML =
      '<div class="result-card error"><span class="icon">⚠️</span><span>Por favor, digite o nome de um item para verificar.</span></div>';
    geminiResultDiv.style.display = "block";
    return;
  }

  // Set Loading state
  btnVerificar.disabled = true;
  geminiResultDiv.innerHTML =
    '<div class="result-card loading"><div class="spinner"></div><span>Analisando item com a IA do Gemini...</span></div>';
  geminiResultDiv.style.display = "block";

  currentMaterial = null;
  currentItem = item;
  currentLocalsAvailable = false;
  document.getElementById("locationResult").innerHTML = "";

  try {
    const response = await fetch("/ask_gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ item: item }),
    });

    const data = await response.json();
    btnVerificar.disabled = false;

    if (response.ok) {
      let htmlContent = "";

      if (data.status === "tem_local") {
        htmlContent += `<div class="result-card success">
          <div class="badge-tag recyclable">♻️ RECICLÁVEL</div>
          <h3>${data.mensagem2 || "Esse material é reciclável!"}</h3>
          <p class="msg-highlight">${data.mensagem1}</p>
          <div class="instruction-box"><strong>Instruções:</strong> ${data.mensagem3}</div>
        </div>`;
      } else if (data.status === "reciclavel_sem_local") {
        htmlContent += `<div class="result-card info">
          <div class="badge-tag recyclable">♻️ RECICLÁVEL</div>
          <h3>${data.mensagem2 || "Dicas de Reciclagem"}</h3>
          <p>${data.mensagem1}</p>
          <div class="instruction-box"><strong>Como descartar:</strong> ${data.mensagem3}</div>
        </div>`;
      } else if (data.status === "nao_reciclavel") {
        htmlContent += `<div class="result-card warning">
          <div class="badge-tag non-recyclable">🚫 NÃO RECICLÁVEL</div>
          <h3>${data.mensagem1}</h3>
          <p><b>Orientação:</b> ${data.mensagem3}</p>
        </div>`;
      } else {
        htmlContent += `<div class="result-card neutral">
          <p>${data.mensagem1 || "Informação não encontrada."}</p>
          <p>${data.mensagem3 || ""}</p>
        </div>`;
      }

      geminiResultDiv.innerHTML = htmlContent;
      geminiResultDiv.style.display = "block";

      currentMaterial = data.gemini_raw?.material || item;
      currentLocalsAvailable = data.status === "tem_local" || (data.locais && data.locais.length > 0);

      // Render default points on map if available
      if (data.locais && data.locais.length > 0) {
        updateMapMarkers(data.locais, SP_CENTER);
      } else {
        updateMapMarkers([], SP_CENTER);
      }

    } else {
      geminiResultDiv.innerHTML = `<div class="result-card error">
        <span class="icon">❌</span>
        <span>${data.error || "Ocorreu um erro inesperado ao consultar a API."}</span>
      </div>`;
      geminiResultDiv.style.display = "block";
    }
  } catch (error) {
    btnVerificar.disabled = false;
    console.error("Erro na requisição Gemini:", error);
    geminiResultDiv.innerHTML =
      '<div class="result-card error"><span class="icon">🔌</span><span>Não foi possível conectar ao servidor. Verifique sua conexão.</span></div>';
    geminiResultDiv.style.display = "block";
  }
}

async function buscarLocalizacao(useAddressInput = false) {
  const locationInput = document.getElementById("locationInput");
  const locationResultDiv = document.getElementById("locationResult");
  locationResultDiv.style.display = "none";

  if (!currentMaterial && !currentItem) {
    locationResultDiv.innerHTML =
      '<div class="result-card warning"><span class="icon">💡</span><span>Primeiro, digite um item acima para verificar seu tipo de material.</span></div>';
    locationResultDiv.style.display = "block";
    return;
  }

  if (!currentLocalsAvailable) {
    locationResultDiv.innerHTML = `<div class="result-card info">
      <span>Não encontramos cooperativas específicas para <strong class="material-info">${currentItem || currentMaterial}</strong> cadastradas na base de São Paulo. Tente procurar por ecopontos gerais.</span>
    </div>`;
    locationResultDiv.style.display = "block";
    return;
  }

  locationResultDiv.innerHTML =
    '<div class="result-card loading"><div class="spinner"></div><span>Localizando pontos de coleta próximos...</span></div>';
  locationResultDiv.style.display = "block";

  let latitude, longitude;
  let userLocationFound = false;

  if (useAddressInput) {
    const address = locationInput.value.trim();
    if (!address) {
      locationResultDiv.innerHTML =
        '<div class="result-card error"><span>Por favor, digite um endereço ou bairro para buscar.</span></div>';
      return;
    }

    try {
      const geocodingResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address + ", São Paulo"
        )}&limit=1`
      );
      const geocodingData = await geocodingResponse.json();

      if (geocodingData && geocodingData.length > 0) {
        latitude = parseFloat(geocodingData[0].lat);
        longitude = parseFloat(geocodingData[0].lon);
        userLocationFound = true;
      } else {
        locationResultDiv.innerHTML =
          '<div class="result-card error"><span>Endereço não encontrado no OpenStreetMap. Verifique se digitou corretamente.</span></div>';
        return;
      }
    } catch (error) {
      console.error("Erro na geocodificação Nominatim:", error);
      locationResultDiv.innerHTML =
        '<div class="result-card error"><span>Erro ao buscar coordenadas do endereço. Tente novamente em instantes.</span></div>';
      return;
    }
  } else {
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        userLocationFound = true;
      } catch (error) {
        console.error("Erro ao obter localização GPS:", error);
        locationResultDiv.innerHTML =
          '<div class="result-card warning"><span>Não foi possível obter sua localização atual via GPS. Por favor, digite seu bairro ou endereço no campo de busca.</span></div>';
        return;
      }
    } else {
      locationResultDiv.innerHTML =
        '<div class="result-card error"><span>Geolocalização não é suportada por este navegador. Digite seu endereço no campo acima.</span></div>';
      return;
    }
  }

  if (!userLocationFound) {
    locationResultDiv.innerHTML =
      '<div class="result-card error"><span>Não foi possível determinar a localização para a busca.</span></div>';
    return;
  }

  try {
    const response = await fetch("/find_recycling_points", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        material: currentMaterial,
        latitude: latitude,
        longitude: longitude,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      if (data.pontos && data.pontos.length > 0) {
        let listHtml = `
          <div class="result-header">
            <h3>Pontos de Coleta Encontrados (${data.pontos.length})</h3>
            <p>Mostrando locais que aceitam <span class="material-badge">${currentMaterial || currentItem}</span> ordenados por proximidade:</p>
          </div>
          <ul class="location-list">
        `;

        data.pontos.forEach((ponto) => {
          const distancia = ponto.distancia_km !== undefined ? `${ponto.distancia_km} km` : "";
          const routeUrl = `https://www.openstreetmap.org/directions?engine=osrm_car&route=${latitude}%2C${longitude}%3B${ponto.latitude}%2C${ponto.longitude}`;

          listHtml += `
            <li class="location-item">
              <div class="location-info">
                <h4>${ponto.nome} <span class="distance-tag">📍 ${distancia}</span></h4>
                <p class="address">${ponto.endereco}</p>
                <p class="materials-tags">♻️ Aceita: ${ponto.materiais_aceitos ? ponto.materiais_aceitos.join(", ") : "Diversos"}</p>
              </div>
              <a href="${routeUrl}" target="_blank" class="btn-route">
                <span>Ver Rota</span> ↗
              </a>
            </li>
          `;
        });

        listHtml += "</ul>";
        locationResultDiv.innerHTML = listHtml;
        locationResultDiv.style.display = "block";

        // Update markers on interactive Leaflet Map
        updateMapMarkers(data.pontos, [latitude, longitude], { lat: latitude, lon: longitude });

      } else {
        locationResultDiv.innerHTML = `<div class="result-card info">
          <span>Nenhum ponto de coleta cadastrado encontrado para <strong class="material-info">${currentMaterial || currentItem}</strong> nesta região.</span>
        </div>`;
        locationResultDiv.style.display = "block";
        updateMapMarkers([], [latitude, longitude], { lat: latitude, lon: longitude });
      }
    } else {
      locationResultDiv.innerHTML = `<div class="result-card error"><span>Erro ao buscar pontos: ${data.error || "Ocorreu um erro."}</span></div>`;
      locationResultDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Erro na requisição de pontos de coleta:", error);
    locationResultDiv.innerHTML =
      '<div class="result-card error"><span>Não foi possível conectar ao servidor para buscar pontos de coleta.</span></div>';
    locationResultDiv.style.display = "block";
  }
}

function setupCoopForm() {
  const form = document.getElementById("associationForm");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const nome = document.getElementById("assocNome").value.trim();
    
    alert(`Obrigado, ${nome || "parceiro"}! O cadastro foi simulado com sucesso. Em breve entraremos em contato para validar as informações!`);
    
    this.reset();
    if (typeof closeCoopModal === "function") {
      closeCoopModal();
    }
  });
}

