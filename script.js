
require([
  "esri/WebMap",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/widgets/LayerList",
  "esri/widgets/Legend",
  "esri/widgets/Expand"
], function (
  WebMap,
  MapView,
  Graphic,
  GraphicsLayer,
  LayerList,
  Legend,
  Expand
) {

  // ==========================================
  // 1. CONFIGURACIÓN DEL MAPA
  // ==========================================

  const mapa = new WebMap({
    portalItem: {
      id: "8aa8724d46df417d8110acd29ada0afb",
      portal: {
        url: "https://mopvmt.maps.arcgis.com"
      }
    }
  });

  const vista = new MapView({
    container: "viewDiv",
    map: mapa,
    popupEnabled: false
  });

  const capaSeleccion = new GraphicsLayer({
    title: "Selección temporal",
    listMode: "hide"
  });

  mapa.add(capaSeleccion);

  // ==========================================
  // 2. BOTÓN DE CAPAS
  // ==========================================

  const listaCapas = new LayerList({
    view: vista,
    visibleElements: {
      heading: true,
      statusIndicators: true
    }
  });

  const botonCapas = new Expand({
    view: vista,
    content: listaCapas,
    expandIcon: "layers",
    expandTooltip: "Mostrar u ocultar capas",
    expanded: false,
    group: "herramientasMapa"
  });

  vista.ui.add(botonCapas, {
    position: "top-right",
    index: 0
  });

  // ==========================================
  // 3. BOTÓN DE LEYENDA
  // ==========================================

  const leyenda = new Legend({
    view: vista
  });

  const botonLeyenda = new Expand({
    view: vista,
    content: leyenda,
    expandIcon: "legend",
    expandTooltip: "Ver leyenda del mapa",
    expanded: false,
    group: "herramientasMapa"
  });

  vista.ui.add(botonLeyenda, {
    position: "top-right",
    index: 1
  });

  // ==========================================
  // 4. CONFIGURACIÓN DE VIDEOS
  // ==========================================

  const videosCamaras = {
    CAM001: "videos/CAM001.mp4",
    CAM002: "videos/CAM002.mp4",
    CAM003: "videos/CAM003.mp4",
    CAM004: "videos/CAM004.mp4",
    CAM005: "videos/CAM005.mp4"
  };

  const videosSemaforos = {
    SEM001: "videos/SEM001.mp4"
  };

  // Campos que pueden contener identificadores
  // de cámaras o semáforos en ArcGIS Online.

  const camposIdentificadores = [
    "CODIGO",
    "COD_CAMARA",
    "CODIGO_CAMARA",
    "ID_CAMARA",
    "IDCAMARA",
    "COD_SEMAFORO",
    "CODIGO_SEMAFORO",
    "ID_SEMAFORO",
    "IDSEMAFORO",
    "SEMAFORO",
    "CAMARA",
    "CAMERA",
    "NOMBRE",
    "NAME",
    "IDENTIFICADOR",
    "ID"
  ];

  // Correspondencias manuales opcionales.
  // Usa los OBJECTID reales de ArcGIS.
  // No se asume que OBJECTID = número de cámara.

  const camarasPorObjectId = {
    // "15": "CAM001",
    // "27": "CAM002"
  };

  const semaforosPorObjectId = {
    // "32": "SEM001"
  };

  // ==========================================
  // 5. IDENTIFICACIÓN DEL SEMÁFORO SEM001
  // ==========================================

  // Coordenadas observadas en los atributos
  // del semáforo de Carretera Litoral
  // y Calle a Garita Palmera.

  const ubicacionesSemaforos = [
    {
      codigo: "SEM001",
      latitud: 13.781205,
      longitud: -90.034144
    }
  ];

  // Tolerancia aproximada de 1 metro.
  // Se utiliza únicamente para relacionar
  // el punto correcto con el video.

  const toleranciaCoordenadas = 0.00001;

  // ==========================================
  // 6. ELEMENTOS HTML
  // ==========================================

  const panelVideo =
    document.getElementById("panelVideo");

  const panelDatos =
    document.getElementById("panelDatos");

  const reproductor =
    document.getElementById("reproductor");

  const tituloVideo =
    document.getElementById("tituloVideo");

  const tituloDatos =
    document.getElementById("tituloDatos");

  const mensajeVideo =
    document.getElementById("mensajeVideo");

  const datosPunto =
    document.getElementById("datosPunto");

  const area =
    document.getElementById("areaTrabajo");

  const estadoSistema =
    document.getElementById("estadoSistema");

  // ==========================================
  // 7. RELOJ Y FECHA
  // ==========================================

  function actualizarReloj() {

    const ahora = new Date();

    const fecha = document.getElementById(
      "fechaActual"
    );

    const hora = document.getElementById(
      "horaActual"
    );

    if (fecha) {
      fecha.textContent = ahora.toLocaleDateString(
        "es-SV",
        {
          weekday: "long",
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );
    }

    if (hora) {
      hora.textContent = ahora.toLocaleTimeString(
        "es-SV",
        {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      );
    }
  }

  actualizarReloj();

  setInterval(actualizarReloj, 1000);

  // ==========================================
  // 8. NORMALIZACIÓN DE TEXTOS
  // ==========================================

  function normalizarTexto(valor) {

    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();
  }

  // ==========================================
  // 9. RECONOCER CAPAS
  // ==========================================

  function identificarTipo(capa) {

    const nombre = normalizarTexto(
      capa.title || ""
    );

    if (
      nombre === "SEMAFORO" ||
      nombre === "SEMAFOROS"
    ) {
      return "semaforo";
    }

    if (
      nombre === "CAMARAS" ||
      nombre.includes("CAMARAS_XYTABLETOPOINT")
    ) {
      return "camara";
    }

    return null;
  }

  // ==========================================
  // 10. OBTENER COORDENADAS
  // ==========================================

  function obtenerValorNumerico(
    atributos,
    nombresCampos
  ) {

    for (const nombreBuscado of nombresCampos) {

      const nombreReal = Object.keys(
        atributos
      ).find(
        clave =>
          normalizarTexto(clave) ===
          nombreBuscado
      );

      if (!nombreReal) {
        continue;
      }

      const valor = atributos[nombreReal];

      if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
      ) {
        continue;
      }

      const numero = Number(
        String(valor).replace(",", ".")
      );

      if (Number.isFinite(numero)) {
        return numero;
      }
    }

    return null;
  }

  // ==========================================
  // 11. IDENTIFICAR CÓDIGO DE VIDEO
  // ==========================================

  function buscarCodigo(
    atributos,
    tipo,
    capa
  ) {

    const prefijo =
      tipo === "camara" ? "CAM" : "SEM";

    const mapaVideos =
      tipo === "camara"
        ? videosCamaras
        : videosSemaforos;

    const campoObjectId =
      capa.objectIdField || "OBJECTID";

    const objectId =
      atributos[campoObjectId];

    // --------------------------------------
    // A. IDENTIFICACIÓN MANUAL POR OBJECTID
    // --------------------------------------

    if (tipo === "camara") {

      const codigoManual =
        camarasPorObjectId[String(objectId)];

      if (
        codigoManual &&
        videosCamaras[codigoManual]
      ) {
        return codigoManual;
      }
    }

    if (tipo === "semaforo") {

      const codigoManual =
        semaforosPorObjectId[String(objectId)];

      if (
        codigoManual &&
        videosSemaforos[codigoManual]
      ) {
        return codigoManual;
      }
    }

    // --------------------------------------
    // B. IDENTIFICACIÓN POR CÓDIGO O NOMBRE
    // --------------------------------------

    for (const campo of camposIdentificadores) {

      const nombreReal = Object.keys(
        atributos
      ).find(
        clave =>
          normalizarTexto(clave) === campo
      );

      if (!nombreReal) {
        continue;
      }

      const valor = normalizarTexto(
        atributos[nombreReal]
      );

      if (!valor) {
        continue;
      }

      // Reconocer CAM001, CAM002,
      // SEM001, SEM002, etc.

      const coincidencia = valor.match(
        new RegExp(
          prefijo + "[\\s_-]*0*(\\d+)"
        )
      );

      if (coincidencia) {

        const codigo =
          prefijo +
          String(
            Number(coincidencia[1])
          ).padStart(3, "0");

        if (mapaVideos[codigo]) {
          return codigo;
        }
      }

      // Reconocer "Cámara 4" o "Semáforo 1".

      const patronNombre =
        tipo === "camara"
          ? /(?:CAMARA|CAMERA)[\s_-]*0*(\d+)/
          : /SEMAFORO[\s_-]*0*(\d+)/;

      const numeroTexto =
        valor.match(patronNombre);

      if (numeroTexto) {

        const codigo =
          prefijo +
          String(
            Number(numeroTexto[1])
          ).padStart(3, "0");

        if (mapaVideos[codigo]) {
          return codigo;
        }
      }

      // Si un campo identificador contiene
      // únicamente el número.

      if (/^\d+$/.test(valor)) {

        const codigo =
          prefijo +
          String(
            Number(valor)
          ).padStart(3, "0");

        if (mapaVideos[codigo]) {
          return codigo;
        }
      }
    }

    // --------------------------------------
    // C. IDENTIFICACIÓN POR COORDENADAS
    //    DEL SEMÁFORO SEM001
    // --------------------------------------

    if (tipo === "semaforo") {

      const latitud = obtenerValorNumerico(
        atributos,
        ["LATITUD", "LATITUDE", "LAT"]
      );

      const longitud = obtenerValorNumerico(
        atributos,
        ["LONGITUD", "LONGITUDE", "LON", "LNG"]
      );

      if (
        latitud !== null &&
        longitud !== null
      ) {

        for (
          const ubicacion of ubicacionesSemaforos
        ) {

          const coincideLatitud =
            Math.abs(
              latitud - ubicacion.latitud
            ) <= toleranciaCoordenadas;

          const coincideLongitud =
            Math.abs(
              longitud - ubicacion.longitud
            ) <= toleranciaCoordenadas;

          if (
            coincideLatitud &&
            coincideLongitud &&
            videosSemaforos[ubicacion.codigo]
          ) {

            console.log(
              "Semáforo identificado por coordenadas:",
              ubicacion.codigo
            );

            return ubicacion.codigo;
          }
        }
      }
    }

    // No asignar un video incorrecto
    // a otro punto.

    return null;
  }

  // ==========================================
  // 12. REPRODUCTOR DE VIDEO
  // ==========================================

  let intentoReproduccion = 0;

  function abrirVideo(tipo, codigo) {

    const intento = ++intentoReproduccion;

    panelVideo.classList.remove(
      "oculto",
      "minimizada"
    );

    reproductor.pause();
    reproductor.removeAttribute("src");
    reproductor.load();

    mensajeVideo.textContent = "";

    const esCamara = tipo === "camara";

    tituloVideo.textContent = esCamara
      ? "Cámara de monitoreo"
      : "Semáforo de monitoreo";

    if (!codigo) {

      mensajeVideo.textContent = esCamara
        ? "No se identificó un video para esta cámara."
        : "No se identificó un video para este semáforo.";

      return;
    }

    const archivo = esCamara
      ? videosCamaras[codigo]
      : videosSemaforos[codigo];

    if (!archivo) {

      mensajeVideo.textContent =
        "No existe un video configurado para " +
        codigo;

      return;
    }

    tituloVideo.textContent =
      (esCamara ? "Cámara " : "Semáforo ") +
      codigo;

    reproductor.src = archivo;
    reproductor.muted = true;
    reproductor.load();

    reproductor.play().catch(error => {

      if (intento !== intentoReproduccion) {
        return;
      }

      if (!reproductor.error) {

        mensajeVideo.textContent =
          "Presiona reproducir para iniciar el video.";
      }

      console.warn(
        "No se inició automáticamente:",
        error
      );
    });

    console.log(
      "Código identificado:",
      codigo
    );

    console.log(
      "Archivo de video:",
      archivo
    );
  }

  function cerrarVideo() {

    ++intentoReproduccion;

    reproductor.pause();
    reproductor.removeAttribute("src");
    reproductor.load();

    panelVideo.classList.add("oculto");
  }

  reproductor.addEventListener(
    "error",
    () => {

      if (reproductor.error) {

        mensajeVideo.textContent =
          "No se pudo cargar el video. " +
          "Verifica que el archivo MP4 exista " +
          "y pueda reproducirse en el navegador.";

        console.error(
          "Error del reproductor:",
          reproductor.error
        );
      }
    }
  );

  // ==========================================
  // 13. CONTROLES DE VENTANAS
  // ==========================================

  document.getElementById(
    "cerrarVideo"
  ).addEventListener(
    "click",
    cerrarVideo
  );

  document.getElementById(
    "cerrarDatos"
  ).addEventListener(
    "click",
    () => {

      panelDatos.classList.add("oculto");
    }
  );

  document.getElementById(
    "minVideo"
  ).addEventListener(
    "click",
    () => {

      panelVideo.classList.toggle(
        "minimizada"
      );
    }
  );

  document.getElementById(
    "minDatos"
  ).addEventListener(
    "click",
    () => {

      panelDatos.classList.toggle(
        "minimizada"
      );
    }
  );

  document.getElementById(
    "maxVideo"
  ).addEventListener(
    "click",
    () => {

      panelVideo.classList.remove(
        "minimizada"
      );

      panelVideo.classList.toggle(
        "maximizada"
      );
    }
  );

  // ==========================================
  // 14. CONSULTAR ATRIBUTOS DE ARCGIS
  // ==========================================

  async function consultarDatos(grafico) {

    const capa = grafico.layer;

    await capa.load();

    const campoObjectId =
      capa.objectIdField;

    const objectId =
      grafico.attributes?.[campoObjectId];

    if (
      objectId === undefined ||
      objectId === null
    ) {

      throw new Error(
        "No se encontró el OBJECTID."
      );
    }

    const consulta = capa.createQuery();

    consulta.objectIds = [objectId];
    consulta.outFields = ["*"];
    consulta.returnGeometry = false;

    const respuesta =
      await capa.queryFeatures(consulta);

    if (!respuesta.features.length) {

      throw new Error(
        "ArcGIS no devolvió el registro."
      );
    }

    return respuesta.features[0].attributes;
  }

  // ==========================================
  // 15. MOSTRAR INFORMACIÓN DEL PUNTO
  // ==========================================

  function pintarDatos(atributos, capa) {

    datosPunto.innerHTML = "";

    const camposOcultos = [
      "OBJECTID",
      "GLOBALID",
      "SHAPE"
    ];

    Object.entries(atributos).forEach(
      ([campo, valor]) => {

        if (
          camposOcultos.includes(
            campo.toUpperCase()
          )
        ) {
          return;
        }

        const definicion =
          capa.fields?.find(
            f => f.name === campo
          );

        const fila =
          document.createElement("div");

        fila.className = "fila-dato";

        const etiqueta =
          document.createElement("strong");

        etiqueta.textContent =
          definicion?.alias || campo;

        const contenido =
          document.createElement("span");

        contenido.textContent =
          valor === null ||
          valor === undefined ||
          valor === ""
            ? "Sin información"
            : String(valor);

        fila.appendChild(etiqueta);
        fila.appendChild(contenido);

        datosPunto.appendChild(fila);
      }
    );

    if (!datosPunto.children.length) {

      datosPunto.textContent =
        "No hay atributos disponibles.";
    }
  }

  // ==========================================
  // 16. ANIMACIÓN DE SELECCIÓN
  // ==========================================

  let animacion = null;

  function seleccionarPunto(grafico) {

    if (animacion !== null) {

      cancelAnimationFrame(animacion);
      animacion = null;
    }

    capaSeleccion.removeAll();

    if (
      !grafico.geometry ||
      grafico.geometry.type !== "point"
    ) {
      return;
    }

    const anillo = new Graphic({
      geometry: grafico.geometry.clone(),
      symbol: {
        type: "simple-marker",
        style: "circle",
        size: 24,
        color: [0, 150, 255, 0.08],
        outline: {
          color: [0, 150, 255, 1],
          width: 3
        }
      }
    });

    capaSeleccion.add(anillo);

    const inicio = performance.now();

    function animar(tiempo) {

      const progreso =
        ((tiempo - inicio) % 1400) / 1400;

      anillo.symbol = {
        type: "simple-marker",
        style: "circle",
        size: 20 + progreso * 38,
        color: [0, 150, 255, 0.03],
        outline: {
          color: [
            0,
            150,
            255,
            Math.max(0, 1 - progreso)
          ],
          width: 3
        }
      };

      animacion =
        requestAnimationFrame(animar);
    }

    animacion =
      requestAnimationFrame(animar);
  }

  // ==========================================
  // 17. SELECCIONAR CÁMARA O SEMÁFORO
  // ==========================================

  let seleccionActual = 0;

  vista.on("click", async evento => {

    const seleccion = ++seleccionActual;

    try {

      const respuesta =
        await vista.hitTest(evento);

      if (seleccion !== seleccionActual) {
        return;
      }

      const resultado =
        respuesta.results.find(item => {

          const grafico = item.graphic;

          if (!grafico?.layer) {
            return false;
          }

          return identificarTipo(
            grafico.layer
          ) !== null;
        });

      if (!resultado) {
        return;
      }

      const grafico = resultado.graphic;
      const capa = grafico.layer;

      const tipo = identificarTipo(capa);

      tituloDatos.textContent =
        tipo === "camara"
          ? "Información de la cámara"
          : "Información del semáforo";

      seleccionarPunto(grafico);

      panelDatos.classList.remove(
        "oculto",
        "minimizada"
      );

      datosPunto.textContent =
        "Consultando información de ArcGIS...";

      abrirVideo(tipo, null);

      const atributos =
        await consultarDatos(grafico);

      if (seleccion !== seleccionActual) {
        return;
      }

      console.log(
        "Capa seleccionada:",
        capa.title
      );

      console.log(
        "Atributos completos:",
        atributos
      );

      pintarDatos(atributos, capa);

      const codigo = buscarCodigo(
        atributos,
        tipo,
        capa
      );

      console.log(
        "Video identificado:",
        codigo
      );

      abrirVideo(tipo, codigo);

    } catch (error) {

      if (seleccion !== seleccionActual) {
        return;
      }

      console.error(
        "Error al seleccionar punto:",
        error
      );

      datosPunto.textContent =
        "No fue posible consultar los atributos.";

      mensajeVideo.textContent =
        "No fue posible identificar el video.";
    }
  });

  // ==========================================
  // 18. VENTANAS ARRASTRABLES
  // ==========================================

  let zActual = 30;

  function hacerArrastrable(panel, barra) {

    barra.addEventListener(
      "pointerdown",
      evento => {

        if (
          evento.target.closest("button")
        ) {
          return;
        }

        if (
          panel.classList.contains(
            "maximizada"
          )
        ) {
          return;
        }

        evento.preventDefault();

        const rect =
          panel.getBoundingClientRect();

        const rectArea =
          area.getBoundingClientRect();

        const offsetX =
          evento.clientX - rect.left;

        const offsetY =
          evento.clientY - rect.top;

        panel.style.left =
          (rect.left - rectArea.left) + "px";

        panel.style.top =
          (rect.top - rectArea.top) + "px";

        panel.style.right = "auto";
        panel.style.zIndex = ++zActual;

        barra.setPointerCapture(
          evento.pointerId
        );

        function mover(e) {

          const maxX = Math.max(
            0,
            area.clientWidth - panel.offsetWidth
          );

          const maxY = Math.max(
            0,
            area.clientHeight -
            barra.offsetHeight
          );

          const x = Math.max(
            0,
            Math.min(
              e.clientX -
              rectArea.left -
              offsetX,
              maxX
            )
          );

          const y = Math.max(
            0,
            Math.min(
              e.clientY -
              rectArea.top -
              offsetY,
              maxY
            )
          );

          panel.style.left = x + "px";
          panel.style.top = y + "px";
        }

        function terminar() {

          barra.removeEventListener(
            "pointermove",
            mover
          );

          barra.removeEventListener(
            "pointerup",
            terminar
          );

          barra.removeEventListener(
            "pointercancel",
            terminar
          );
        }

        barra.addEventListener(
          "pointermove",
          mover
        );

        barra.addEventListener(
          "pointerup",
          terminar
        );

        barra.addEventListener(
          "pointercancel",
          terminar
        );
      }
    );
  }

  hacerArrastrable(
    panelVideo,
    document.getElementById("barraVideo")
  );

  hacerArrastrable(
    panelDatos,
    document.getElementById("barraDatos")
  );

  // ==========================================
  // 19. ESTADO DEL MAPA
  // ==========================================

  vista.when(() => {

    if (estadoSistema) {

      estadoSistema.textContent =
        "Mapa conectado";
    }

    console.log(
      "Centro de Monitoreo Vial listo."
    );

    console.log(
      "Cámaras y semáforos habilitados."
    );

    console.log(
      "Semáforo SEM001 configurado."
    );

  }).catch(error => {

    if (estadoSistema) {

      estadoSistema.textContent =
        "Error de conexión";
    }

    const indicador =
      document.querySelector(
        ".indicador-sistema"
      );

    if (indicador) {
      indicador.classList.add("error");
    }

    console.error(
      "Error al cargar el mapa:",
      error
    );
  });

});
