// Genera operación aleatoria con dos operandos
function generarOperacion() {
    const operaciones = ["+", "-", "*", "/", "%", "^"];
    const op = operaciones[Math.floor(Math.random() * operaciones.length)];
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    return { op, a, b };
}

// Crea un proceso con tiempos y operación
function crearProceso(id, global) {
    const TME = Math.floor(Math.random() * 15) + 6; // 6-20 s
    const { op, a, b } = generarOperacion();
    return {
        id,
        tme: TME,
        transcurrido: 0,
        restante: TME,
        status: "NUEVO",
        operacion: `${a} ${op} ${b}`,
        tiempoLlegada: global.transcurrido, // tiempo de llegada basado en contador global
        tiempoRespuesta: null,
        tiempoFinalizacion: null,
        tiempoRetorno: null,
        tiempoEspera: 0,
        tiempoServicio: 0,
        resultado: null
    };
}

// Mostrar tabla dinámica (listos y bloqueados)
function mostrarTabla(tablaId, procesos, incluirTranscurrido = false) {
    const thead = document.querySelector(`#${tablaId} thead`);
    thead.innerHTML = "<tr><th>#</th><th>ID</th><th>TME (s)</th><th>Operación / Tiempo (s)</th></tr>";

    const tbody = document.querySelector(`#${tablaId} tbody`);
    tbody.innerHTML = "";

    for (let i = 0; i < 3; i++) {
        const p = procesos[i];
        const fila = document.createElement("tr");

        if (p) {
            fila.innerHTML = `
                <td>${i + 1}</td>
                <td>${p.id}</td>
                <td>${p.tme}</td>
                <td>${incluirTranscurrido ? p.transcurrido.toFixed(1) : p.operacion}</td>
            `;
        } else {
            fila.innerHTML = `<td>${i + 1}</td><td colspan="3">[ vacío ]</td>`;
        }

        tbody.appendChild(fila);
    }
}

// Arreglo global de bloqueados
let bloqueados = [];

// Manejo de formulario
const generarProcesos = () => {
    document.getElementById("formProcesos").addEventListener("submit", e => {
        e.preventDefault();

        const num = parseInt(document.getElementById("numProcesos").value);
        if (isNaN(num) || num <= 0) { alert('Ingrese un valor válido'); return; }

        let global = { transcurrido: 0 }; // contador global en segundos
        const procesos = [];
        for (let i = 1; i <= num; i++) procesos.push(crearProceso(i, global));

        // Memoria: máximo 4
        const enMemoria = new Array(4).fill(null);
        const primeros = procesos.slice(0, 4);
        primeros.forEach((p, idx) => {
            p.memoriaIndex = idx;
            p.status = idx === 0 ? "EJECUCION" : "LISTO";
            p.arrivalOrder = idx + 1; // orden FCFS
            enMemoria[idx] = p;
        });
        const nuevos = procesos.slice(4);

        // Cola de listos
        let listos = enMemoria.filter((p, idx) => p && idx !== 0);
        const ejecucion = enMemoria[0] || null;

        iniciarEjecucion(enMemoria, nuevos, listos, ejecucion, num, global);
    });
};

// Función principal de ejecución
const iniciarEjecucion = async (enMemoria, nuevos, listos, ejecucion, numProcesos, global) => {
    const divContGlobal = document.getElementById('contadorGlobal');
    divContGlobal.classList.add('contProcesos');

    document.getElementById('formProcesos').style.display = "none";

    // UI nuevos
    const divNuevos = document.getElementById('nuevos');
    const contNuevos = document.createElement('div');
    contNuevos.classList.add('contProcesos');
    divNuevos.appendChild(contNuevos);
    contNuevos.innerText = `Procesos Nuevos: ${nuevos.length}`;

    const mostrarEjecucion = document.getElementById('procesoEjecucion');
    const mostrarBloqueo = document.getElementById('procesoBloqueado');
    const tablaTerminados = document.getElementById('tablaTerminados');
    tablaTerminados.classList.add('contProcesos');
    tablaTerminados.tHead.innerHTML = "<tr><th>ID</th><th>Operación</th><th>Resultado</th></tr>";

    let procesosTerminados = [];

    // Contador de llegada para FCFS
    let memArrivalCounter = enMemoria.filter(p => p).length;

    // Sincroniza la cola de listos según memoria y FCFS
    const syncListosConMemoria = () => {
        const candidatos = enMemoria.filter(p => p && p.status === "LISTO")
            .sort((a, b) => (a.arrivalOrder || 0) - (b.arrivalOrder || 0));

        listos.length = 0;
        for (let i = 0; i < candidatos.length && listos.length < 3; i++) listos.push(candidatos[i]);

        mostrarTabla("tablaListos", listos, true);
    };

    // Inicializa bloqueo concurrente
    iniciarBloqueoConcurrente(mostrarBloqueo, enMemoria, syncListosConMemoria, global);

    // Helper: incorporar bloqueados listos
    const intentarTraerBloqueados = () => {
        for (let i = 0; i < bloqueados.length; i++) {
            const bp = bloqueados[i];
            if (bp.readyToList) {
                const numListosEnMemoria = enMemoria.filter(x => x && x.status === "LISTO").length;
                if (numListosEnMemoria < 3) {
                    bp.status = "LISTO"; bp.readyToList = false;
                    bloqueados.splice(i, 1); i--;
                } else { bp.status = "LISTO"; }
            }
        }
        syncListosConMemoria();
    };

    // Bucle principal de ejecución
    while (procesosTerminados.length < numProcesos) {
        if (!ejecucion) {
            intentarTraerBloqueados();
            if (listos.length > 0) {
                ejecucion = listos.shift();
                ejecucion.status = "EJECUCION";
                if (ejecucion.tiempoRespuesta === null) {
                    // tiempoRespuesta: primer momento en que el proceso entra a CPU
                    ejecucion.tiempoRespuesta = global.transcurrido - ejecucion.tiempoLlegada;
                    if (ejecucion.tiempoRespuesta < 0) ejecucion.tiempoRespuesta = 0;
                }
            } else { await new Promise(r => setTimeout(r, 200)); continue; }
        }

        mostrarTabla("tablaListos", listos, true);
        await cronometroAsync(ejecucion, global, mostrarEjecucion);
        mostrarEjecucion.innerHTML = "";

        const idxMem = ejecucion.memoriaIndex;

        if (ejecucion.status === "BLOQUEADO") {
            ejecucion.transcurridoBloqueado = ejecucion.transcurridoBloqueado || 0;
            bloqueados.push(ejecucion);
        } else {
            // TERMINADO / ERROR
            ejecucion.resultado = ejecucion.status === "ERROR"
                ? "ERROR" : math.evaluate(ejecucion.operacion);
            if (typeof ejecucion.resultado === "number") ejecucion.resultado = ejecucion.resultado.toFixed(2);
            ejecucion.status = "TERMINADO";

            // Calculamos métricas finales usando el contador global en segundos
            ejecucion.tiempoFinalizacion = global.transcurrido;
            ejecucion.tiempoServicio = ejecucion.transcurrido;
            ejecucion.tiempoRetorno = ejecucion.tiempoFinalizacion - ejecucion.tiempoLlegada;
            ejecucion.tiempoEspera = ejecucion.tiempoRetorno - ejecucion.tiempoServicio;
            if (ejecucion.tiempoRespuesta === null) ejecucion.tiempoRespuesta = ejecucion.tiempoEspera;

            procesosTerminados.push(ejecucion);

            const filaTerminado = document.createElement('tr');
            filaTerminado.innerHTML = `<td>${ejecucion.id}</td><td>${ejecucion.operacion}</td><td>${ejecucion.resultado}</td>`;
            tablaTerminados.appendChild(filaTerminado);

            if (typeof idxMem === "number") enMemoria[idxMem] = null;
        }

        intentarTraerBloqueados();

        // Llenar memoria con nuevos
        if (typeof idxMem === "number" && enMemoria[idxMem] === null && nuevos.length > 0) {
            const siguienteNuevo = nuevos.shift();
            siguienteNuevo.memoriaIndex = idxMem;
            siguienteNuevo.status = "LISTO";
            siguienteNuevo.arrivalOrder = ++memArrivalCounter;
            enMemoria[idxMem] = siguienteNuevo;
            syncListosConMemoria();
            contNuevos.innerText = `Procesos Nuevos: ${nuevos.length}`;
        }

        if (listos.length > 0) {
            ejecucion = listos.shift();
            ejecucion.status = "EJECUCION";
            if (ejecucion.tiempoRespuesta === null) {
                ejecucion.tiempoRespuesta = global.transcurrido - ejecucion.tiempoLlegada;
                if (ejecucion.tiempoRespuesta < 0) ejecucion.tiempoRespuesta = 0;
            }
            mostrarTabla("tablaListos", listos, true);
        } else { ejecucion = null; }
    }

    mostrarTabla("tablaListos", listos, true);

    // Mostrar métricas finales
    mostrarMetricasFinales(procesosTerminados);
};

// Función para mostrar métricas finales de todos los procesos
const mostrarMetricasFinales = (procesosTerminados) => {
    const contenedor = document.createElement('div');
    contenedor.classList.add('contProcesos');
    contenedor.innerHTML = "<h2>Métricas finales de procesos</h2>";

    const tabla = document.createElement('table');
    tabla.classList.add('infoProceso');

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
        <th>ID</th><th>Operación</th><th>Resultado</th>
        <th>Llegada (s)</th><th>Respuesta (s)</th><th>Servicio (s)</th>
        <th>Espera (s)</th><th>Retorno (s)</th><th>Status</th>
    </tr>`;
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');
    procesosTerminados.forEach(p => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${p.id}</td>
            <td>${p.operacion}</td>
            <td>${p.resultado}</td>
            <td>${p.tiempoLlegada.toFixed(1)}</td>
            <td>${p.tiempoRespuesta.toFixed(1)}</td>
            <td>${p.tiempoServicio.toFixed(1)}</td>
            <td>${p.tiempoEspera.toFixed(1)}</td>
            <td>${p.tiempoRetorno.toFixed(1)}</td>
            <td>${p.status}</td>
        `;
        tbody.appendChild(fila);
    });

    tabla.appendChild(tbody);
    contenedor.appendChild(tabla);
    document.getElementById('contenMain').appendChild(contenedor);
};

// Bloqueados concurrente
const iniciarBloqueoConcurrente = (mostrarBloqueo, enMemoria, syncListosConMemoria, global) => {
    const intervalo = 0.1; // en segundos
    const tiempoBloqueo = 8; // 8 segundos
    setInterval(() => {
        if (bloqueados.length === 0) { mostrarBloqueo.innerHTML = ""; return; }

        let html = `<table class="infoProceso"><tr><th colspan="3">Procesos Bloqueados</th></tr><tr><th>ID</th><th>Transcurrido (s)</th><th>Restante (s)</th></tr>`;

        bloqueados.forEach((p, i) => {
            p.transcurridoBloqueado = p.transcurridoBloqueado || 0;
            p.transcurridoBloqueado += intervalo;
            const restante = tiempoBloqueo - p.transcurridoBloqueado;

            html += `<tr><td>${p.id}</td><td>${p.transcurridoBloqueado.toFixed(1)}</td><td>${Math.max(restante,0).toFixed(1)}</td></tr>`;

            if (p.transcurridoBloqueado >= tiempoBloqueo) {
                p.readyToList = true;
                const numListosEnMemoria = enMemoria.filter(x => x && x.status === "LISTO").length;
                if (numListosEnMemoria < 3) {
                    p.status = "LISTO"; p.readyToList = false;
                    bloqueados.splice(i, 1); i--;
                    syncListosConMemoria();
                } else { p.status = "LISTO"; }
            }
        });

        mostrarBloqueo.innerHTML = html + "</table>";
    }, intervalo * 1000);
};

// Cronómetro asíncrono basado en contador global en segundos
const cronometroAsync = async (proceso, global, mostrarEjecucion) => {
    let tiempoTranscurrido = proceso.transcurrido || 0;
    const intervalo = 0.1; // segundos

    return new Promise((resolve) => {
        const timer = setInterval(() => {
            tiempoTranscurrido += intervalo;
            proceso.transcurrido = tiempoTranscurrido;
            proceso.restante = proceso.tme - tiempoTranscurrido;
            global.transcurrido += intervalo;

            mostrarEjecucion.innerHTML = `
                <table class="infoProceso">
                    <tr><th colspan="2">Información del Proceso</th></tr>
                    <tr><td><b>ID:</b></td><td>${proceso.id}</td></tr>
                    <tr><td><b>TME:</b></td><td>${proceso.tme.toFixed(1)} s</td></tr>
                    <tr><td><b>Operación:</b></td><td>${proceso.operacion}</td></tr>
                    <tr><td><b>Tiempo transcurrido:</b></td><td>${tiempoTranscurrido.toFixed(1)} s</td></tr>
                    <tr><td><b>Tiempo restante:</b></td><td>${Math.max(proceso.restante,0).toFixed(1)} s</td></tr>
                </table>`;

            document.getElementById('contadorGlobal').innerText = `Tiempo total global: ${global.transcurrido.toFixed(1)} s`;

            if (tiempoTranscurrido >= proceso.tme || proceso.status === "ERROR" || proceso.status === "BLOQUEADO") {
                clearInterval(timer);
                resolve();
            }
        }, intervalo * 1000);
    });
};

// Inicializa la simulación
document.getElementById('btnIniciar').addEventListener('click', () => generarProcesos());
