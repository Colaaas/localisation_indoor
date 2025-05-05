let idCounter = 1;
const points = [];

function init() {
  ["plan1", "plan2"].forEach(planId => {
    const plan = document.getElementById(planId);
    plan.addEventListener("click", e => {
      if (e.target.tagName === "IMG") {
        const rect = plan.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ajouterPoint(planId, x, y);
      }
    });
  });

  // Ajout de l'écouteur pour mettre à jour automatiquement la localisation
  ["distances-inputs-plan1", "distances-inputs-plan2"].forEach(inputDivId => {
    const inputDiv = document.getElementById(inputDivId);
    inputDiv.addEventListener("input", () => {
      const planId = inputDivId.includes("plan1") ? "plan1" : "plan2";
      localiserPoint(planId, inputDivId);
    });
  });
}

function ajouterPoint(planId, x, y) {
  const plan = document.getElementById(planId);
  const point = document.createElement("div");
  point.classList.add("point");
  point.textContent = idCounter;
  point.style.left = `${x}px`;
  point.style.top = `${y}px`;
  point.draggable = true;

  const id = idCounter++;
  point.dataset.id = id;
  plan.appendChild(point);

  const pointData = { id, x, y, point, planId: planId === "plan1" ? 1 : 2 };
  points.push(pointData);

  makeDraggable(point, pointData);
  afficherCoordonnees();
}

function makeDraggable(point, pointData) {
  point.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", pointData.id);
  });

  const plan = point.closest(".plan");
  plan.addEventListener("dragover", e => e.preventDefault());
  plan.addEventListener("drop", e => {
    e.preventDefault();
    const rect = plan.getBoundingClientRect();
    const id = Number(e.dataTransfer.getData("text/plain"));
    const p = points.find(p => p.id === id);
    if (p) {
      p.x = e.clientX - rect.left;
      p.y = e.clientY - rect.top;
      p.point.style.left = `${p.x}px`;
      p.point.style.top = `${p.y}px`;
      afficherCoordonnees();
    }
  });
}

function afficherCoordonnees() {
  const container1 = document.getElementById("plan1-points");
  const container2 = document.getElementById("plan2-points");
  container1.innerHTML = "";
  container2.innerHTML = "";

  points.forEach(({ id, x, y, planId }) => {
    const ligne = document.createElement("div");
    ligne.className = "coordonnees-ligne";

    ligne.innerHTML = `
      <label>Point ${id} (P${planId})</label>
      X <input type="number" value="${Math.round(x)}" data-id="${id}" data-coord="x">
      Y <input type="number" value="${Math.round(y)}" data-id="${id}" data-coord="y">
      <button data-id="${id}">❌</button>
    `;

    (planId === 1 ? container1 : container2).appendChild(ligne);
  });

  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      const id = Number(input.dataset.id);
      const coord = input.dataset.coord;
      const val = Number(input.value);
      const p = points.find(p => p.id === id);
      if (p) {
        p[coord] = val;
        p.point.style[coord === "x" ? "left" : "top"] = `${val}px`;
      }
    });
  });

  document.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => supprimerPoint(Number(btn.dataset.id)));
  });

  updateTriangulationForm();
}

function supprimerPoint(id) {
  const index = points.findIndex(p => p.id === id);
  if (index !== -1) {
    points[index].point.remove();
    points.splice(index, 1);
    afficherCoordonnees();
  }
}

function updateTriangulationForm() {
  ["plan1", "plan2"].forEach(planId => {
    const inputDiv = document.getElementById("distances-inputs-" + planId);
    inputDiv.innerHTML = "";
    points
      .filter(p => p.planId === (planId === "plan1" ? 1 : 2))
      .forEach(p => {
        const div = document.createElement("div");
        div.innerHTML = `Point ${p.id} distance : <input type="number" step="1" data-id="${p.id}">`;
        inputDiv.appendChild(div);
      });
  });
}

function localiserPoint(planId, inputDivId) {
  const inputs = document.querySelectorAll(`#${inputDivId} input`);
  const distances = [];
  const knownPoints = [];

  inputs.forEach(input => {
    const val = Number(input.value);
    if (!isNaN(val)) {
      const id = Number(input.dataset.id);
      const p = points.find(p => p.id === id);
      if (p) {
        distances.push(val);
        knownPoints.push(p);
      }
    }
  });

  if (distances.length < 3) {
    alert("Il faut au moins 3 distances pour localiser un point.");
    return;
  }

  const pos = estimerPosition(knownPoints, distances);
  
  // Chercher si un point rouge existe déjà sur le plan
  const existingRedPoint = document.querySelector(`#${planId} .point.red`);
  if (existingRedPoint) {
    existingRedPoint.remove(); // Supprimer l'ancien point rouge
  }

  // Créer un nouveau point rouge
  const plan = document.getElementById(planId);
  const point = document.createElement("div");
  point.classList.add("point", "red");
  point.textContent = "X";
  point.style.left = `${pos.x}px`;
  point.style.top = `${pos.y}px`;
  plan.appendChild(point);
}

function estimerPosition(knownPoints, distances) {
  let x = 0, y = 0;
  knownPoints.forEach((p, i) => {
    const angle = (2 * Math.PI * i) / knownPoints.length;
    x += p.x + distances[i] * Math.cos(angle);
    y += p.y + distances[i] * Math.sin(angle);
  });
  return { x: x / knownPoints.length, y: y / knownPoints.length };
}

window.addEventListener("DOMContentLoaded", init);
