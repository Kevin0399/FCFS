// Genera operación aleatoria con dos operandos
function generarOperacion() {
  const operaciones = ["+", "-", "*", "/", "%", "^"];
  const op = operaciones[Math.floor(Math.random() * operaciones.length)];
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { op, a, b };
}

// Crea un proceso
function crearProceso(id) {
  const TME = Math.floor(Math.random() * 15) + 6; // [6,20]
  const { op, a, b } = generarOperacion();
  return {
    id,
    tme: TME,
    transcurrido: 0,
    operacion: `${a} ${op} ${b}`
  };
}

// Mostrar tabla dinámica
function mostrarTabla(tablaId, procesos, incluirTranscurrido = false) {
  const tbody = document.querySelector(`#${tablaId} tbody`);
  tbody.innerHTML = "";
  procesos.forEach(p => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.id}</td>
      <td>${p.tme}</td>
      <td>${incluirTranscurrido ? p.transcurrido : p.operacion}</td>
    `;
    tbody.appendChild(fila);
  });
}

// Mostrar proceso en ejecución
function mostrarEjecucion(proceso) {
  const div = document.getElementById("procesoEjecucion");
  if (!proceso) {
    div.textContent = "Ninguno";
  } else {
    div.innerHTML = `
      <p><b>ID:</b> ${proceso.id}</p>
      <p><b>TME:</b> ${proceso.tme}</p>
      <p><b>Operación:</b> ${proceso.operacion}</p>
      <p><b>Transcurrido:</b> ${proceso.transcurrido}</p>
      <p><b>Restante:</b> ${proceso.tme - proceso.transcurrido}</p>
    `;
  }
}

// Evento formulario
document.getElementById("formProcesos").addEventListener("submit", e => {
  e.preventDefault();

  const num = parseInt(document.getElementById("numProcesos").value);
  if (isNaN(num) || num <= 0) return;

  // Generar procesos
  const procesos = [];
  for (let i = 1; i <= num; i++) {
    procesos.push(crearProceso(i));
  }

  // Dividir en memoria y nuevos
  const enMemoria = procesos.slice(0, 4); // máximo 4
  const nuevos = procesos.slice(4);

  // El primero en memoria va a ejecución
  const ejecucion = enMemoria.length > 0 ? enMemoria[0] : null;
  const listos = enMemoria.slice(1);

  // Mostrar
  mostrarTabla("tablaListos", listos, true);
  mostrarEjecucion(ejecucion);

  document.getElementById("contadorNuevos").textContent = `Nuevos: ${nuevos.length}`;
  document.getElementById("contadorListos").textContent = `Listos: ${listos.length}`;
  document.getElementById("contadorMemoria").textContent = `En Memoria: ${enMemoria.length}`;
});