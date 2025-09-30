// ================================
// Variables globales
// ================================
let procesos = []; // Todos los procesos generados
let nuevos = []; // Cola de procesos en estado Nuevo
let listos = []; // Cola de procesos Listos
let bloqueados = []; // Cola de procesos Bloqueados
let terminados = []; // Procesos que ya terminaron
let procesoEnEjecucion = null; // Proceso que esta en CPU
let relojGlobal = 0; // Tiempo global de simulacion
let intervalo = null; // Intervalo principal de simulacion
let pausado = false; // Pausa de la simulacion
let numProcesos = 0; // Cantidad total de procesos
let idContador = 1; // Contador para asignar IDs unicos
let contTerminados = 0; // Contador de cuantos procesos han terminado

// ================================
// Fase Inicial -> crear procesos
// ================================
document.getElementById("btnIniciar").addEventListener("click", () => {
    const cantidad = parseInt(document.getElementById("numProcesos").value);
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor ingresa un numero valido de procesos");
        return;
    }
    numProcesos = cantidad;
    generarProcesos(numProcesos);

    // Pasar de Fase Inicial a Fase Ejecucion
    document.getElementById("faseInicial").style.display = "none";
    document.getElementById("faseEjecucion").style.display = "block";
    document.getElementById("faseResultados").style.display = "none";

    // Iniciar el tick cada segundo
    if (!intervalo) intervalo = setInterval(tick, 1000);
});

// ================================
// Generar procesos aleatorios
// ================================
const generarProcesos = (n) => {
    for (let i = 0; i < n; i++) {
        const tiempoMax = Math.floor(Math.random() * 15) + 6; // TME entre 6 y 20
        let a = Math.floor(Math.random() * 10) + 1;
        let b = Math.floor(Math.random() * 10) + 1;
        let ops = ["+", "-", "*", "/", "%"];
        let op = ops[Math.floor(Math.random() * ops.length)];

        // Evitar division entre cero
        if ((op === "/" || op === "%") && b === 0) b = 1;

        // Crear objeto proceso
        const proceso = {
            id: idContador++,
            op: `${a} ${op} ${b}`,
            a,
            b,
            operador: op,
            tiempoMax,
            tiempoTrans: 0,
            estado: "Nuevo",
            llegada: null,
            finalizacion: null,
            retorno: null,
            respuesta: null,
            espera: 0,
            servicio: 0,
            resultado: null,
            error: false,
            bloqueadoRestante: 0
        };
        nuevos.push(proceso);
    }
    render(); // Actualizar pantalla
}

// ================================
// Bucle principal de la simulacion
// ================================
const tick = () => {
    if (pausado) return;

    // Admitir procesos desde Nuevos a Listos si hay espacio (max 4 en memoria)
    while (listos.length + bloqueados.length + (procesoEnEjecucion ? 1 : 0) < 4 && nuevos.length > 0) {
        let proc = nuevos.shift();
        proc.estado = "Listo";

        // Primeros 4 procesos llegan en 0
        if (proc.id <= 4) {
            proc.llegada = 0;
        } else {
            proc.llegada = relojGlobal;
        }

        listos.push(proc);
    }

    // Si no hay proceso en ejecucion, tomar el siguiente de listos
    if (!procesoEnEjecucion && listos.length > 0) {
        procesoEnEjecucion = listos.shift();
        procesoEnEjecucion.estado = "Ejecucion";

        // Tiempo de respuesta: registrar solo la PRIMERA vez que entra a CPU
        if (procesoEnEjecucion.respuesta === null) {
            procesoEnEjecucion.respuesta = relojGlobal - procesoEnEjecucion.llegada;
            // Esto asegura que aunque los primeros procesos lleguen en 0, el tiempo de respuesta se calcula correcto
        }

        // Marcar primer tick en CPU para no incrementar tiempoTrans todavía
        procesoEnEjecucion._nuevoEnCPU = true;
    }

    // Ejecutar el proceso actual
    if (procesoEnEjecucion) {
        if (procesoEnEjecucion._nuevoEnCPU) {
            procesoEnEjecucion._nuevoEnCPU = false; // No incrementar en primer tick
        } else {
            procesoEnEjecucion.tiempoTrans++;
            procesoEnEjecucion.servicio++;
        }

        if (procesoEnEjecucion.tiempoTrans >= procesoEnEjecucion.tiempoMax) {
            finalizarProceso(procesoEnEjecucion);
            procesoEnEjecucion = null;
        }
    }

    // Actualizar bloqueados
    bloqueados.forEach((p, idx) => {
        p.bloqueadoRestante--;
        if (p.bloqueadoRestante < 0) {
            p.estado = "Listo";
            listos.push(p);
            bloqueados.splice(idx, 1);
        }
    });

    // Verificar si todos los procesos terminaron
    if (terminados.length === numProcesos) {
        clearInterval(intervalo);
        intervalo = null;
        let btnResultados = document.createElement('button');
        btnResultados.innerText = "Ver Resultados";
        document.getElementById('btnVerResultados').appendChild(btnResultados);
        btnResultados.addEventListener(`click`, () => {
            mostrarResultados();
        });
    }

    render(); // Actualizar pantalla

    // Incrementar reloj global AL FINAL del tick
    relojGlobal++;
}

// ================================
// Finalizar proceso (normal o error)
// ================================
const finalizarProceso = (p) => {
    p.estado = "Terminado";
    p.finalizacion = relojGlobal;
    p.retorno = p.finalizacion - p.llegada;
    p.espera = p.retorno - p.servicio;

    try {
        if (!p.error) p.resultado = eval(p.op); // Evaluar operacion
        else p.resultado = "ERROR";
    } catch {
        p.resultado = "ERROR"; // Captura cualquier error de operacion
    }

    terminados.push(p);
}

// ================================
// Manejo de teclas: E, W, P, C
// ================================
document.addEventListener("keydown", (e) => {
    const tecla = e.key.toUpperCase();

    // Si estamos en pausa, solo permitir C para continuar
    if (pausado && tecla !== "C") return; // Ignorar otras teclas mientras esta en pausa

    if (tecla === "E" && procesoEnEjecucion) {
        // Mandar proceso a bloqueados por E/S
        procesoEnEjecucion.estado = "Bloqueado";
        procesoEnEjecucion.bloqueadoRestante = 8; // 8 seg
        bloqueados.push(procesoEnEjecucion);
        procesoEnEjecucion = null;
    } else if (tecla === "W" && procesoEnEjecucion) {
        // Terminar proceso por error
        procesoEnEjecucion.error = true;
        finalizarProceso(procesoEnEjecucion);
        procesoEnEjecucion = null;
    } else if (tecla === "P") {
        pausado = true; // Pausar simulacion
    } else if (tecla === "C") {
        pausado = false; // Continuar simulacion
    }
});
// ================================
// Renderizar en pantalla
// ================================
const render = () => {
    document.getElementById("reloj").innerText = `Reloj: ${relojGlobal}`;
    document.getElementById("nuevos").innerText = nuevos.length;

    // Mostrar tabla de Listos
    let htmlListos = "<tr><th>ID</th><th>TME</th><th>Trans</th></tr>";
    listos.forEach(p => {
        htmlListos += `<tr><td>${p.id}</td><td>${p.tiempoMax}</td><td>${p.tiempoTrans}</td></tr>`;
    });
    document.getElementById("tablaListos").innerHTML = htmlListos;

let mensajeCPU = "";

const procesosEnMemoria = listos.length + bloqueados.length + (procesoEnEjecucion ? 1 : 0);

if (procesoEnEjecucion) {
    // Proceso normal en ejecución
    mensajeCPU = `
        <p>ID: ${procesoEnEjecucion.id}</p>
        <p>Operacion: ${procesoEnEjecucion.op}</p>
        <p>Trans: ${procesoEnEjecucion.tiempoTrans}</p>
        <p>Restante: ${procesoEnEjecucion.tiempoMax - procesoEnEjecucion.tiempoTrans}</p>
    `;
} else if ((procesosEnMemoria > 0 && listos.length === 0 && bloqueados.length === procesosEnMemoria) || (procesosEnMemoria <= 0)) {
    // Todos los procesos en memoria están bloqueados → Proceso nulo
    mensajeCPU = "CPU: Proceso nulo";
} else {
    // CPU libre (no hay procesos en memoria listos ni bloqueados)
    mensajeCPU = "Cambio de Contexto";
}

document.getElementById("ejecucion").innerHTML = mensajeCPU;



    // Mostrar tabla de Bloqueados
    let htmlBloq = "<tr><th>ID</th><th>Tiempo Bloq Rest</th></tr>";
    bloqueados.forEach(p => {
        htmlBloq += `<tr><td>${p.id}</td><td>${p.bloqueadoRestante}</td></tr>`;
    });
    document.getElementById("tablaBloqueados").innerHTML = htmlBloq;

    // Mostrar tabla de Terminados
    let htmlTerm = "<tr><th>ID</th><th>Operacion</th><th>Resultado</th></tr>";
    terminados.forEach(p => {
        htmlTerm += `<tr><td>${p.id}</td><td>${p.op}</td><td>${p.resultado}</td></tr>`;
    });
    document.getElementById("tablaTerminados").innerHTML = htmlTerm;
}

// ================================
// Mostrar resultados finales
// ================================
const mostrarResultados = () => {
    // Ocultar fase Ejecucion y mostrar Resultados
    document.getElementById("faseEjecucion").style.display = "none";
    document.getElementById("faseResultados").style.display = "block";

    // Crear tabla con todas las mediciones de cada proceso
    let html = "<tr><th>ID</th><th>Llegada</th><th>Final</th><th>Retorno</th><th>Respuesta</th><th>Espera</th><th>Servicio</th><th>Resultado</th></tr>";
    terminados.forEach(p => {
        html += `<tr>
            <td>${p.id}</td>
            <td>${p.llegada}</td>
            <td>${p.finalizacion}</td>
            <td>${p.retorno}</td>
            <td>${p.respuesta}</td>
            <td>${p.espera}</td>
            <td>${p.servicio}</td>
            <td>${p.resultado}</td>
        </tr>`;
    });
    document.getElementById("tablaResultados").innerHTML = html + `<button type="button" id="btnFinalizar"> Finalizar  </button>`;

    let finalizar = document.getElementById('btnFinalizar');
    finalizar.addEventListener('click', () => {
        location.reload();
    })
}
