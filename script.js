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
  point.style.left = `${x - 8}px`;
  point.style.top = `${y - 8}px`;
  point.draggable = true;

  const id = idCounter++;
  point.dataset.id = id;
  plan.appendChild(point);

  const pointData = { id, x: x - 8, y: y - 8, point, planId: planId === "plan1" ? 1 : 2 };
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
      p.x = e.clientX - rect.left - 10;
      p.y = e.clientY - rect.top - 10;
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
      <label>Point ${id}</label><br>
      <label>X <input type="number" value="${Math.round(x)}" data-id="${id}" data-coord="x"></label><br>
      <label>Y <input type="number" value="${Math.round(y)}" data-id="${id}" data-coord="y"></label><br>
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

  // Ajouter un écouteur pour afficher les cercles
  document.querySelectorAll(`#distances-inputs-plan1 input, #distances-inputs-plan2 input`).forEach(input => {
    input.addEventListener("input", () => {
      const id = Number(input.dataset.id);
      const radius = Number(input.value);
      const point = points.find(p => p.id === id);

      if (point) {
        // Supprimer l'ancien cercle s'il existe
        const existingCircle = point.point.querySelector(".circle");
        if (existingCircle) {
          existingCircle.remove();
        }

        // Ajouter un nouveau cercle si la distance est valide
        if (!isNaN(radius) && radius > 0) {
          const circle = document.createElement("div");
          circle.classList.add("circle");
          circle.style.width = `${radius * 2}px`;
          circle.style.height = `${radius * 2}px`;
          circle.style.left = "50%"; // Centrer horizontalement
          circle.style.top = "50%";  // Centrer verticalement
          point.point.appendChild(circle);
        }
      }
    });
  });
}

function localiserPoint(planId, inputDivId) {
  const inputs = document.querySelectorAll(`#${inputDivId} input`);
  const distances = [];
  const knownPoints = [];

  inputs.forEach(input => {
    const val = Number(input.value);
    if (!isNaN(val) && val > 0) { // Vérifie que la distance est valide
      const id = Number(input.dataset.id);
      const p = points.find(p => p.id === id);
      if (p) {
        distances.push(val);
        knownPoints.push(p);
      }
    }
  });

  // Supprimer le point rouge s'il existe et qu'il n'y a pas au moins 3 distances connues
  const existingRedPoint = document.querySelector(`#${planId} .point.red`);
  if (distances.length < 3) {
    if (existingRedPoint) {
      existingRedPoint.remove();
    }
    return;
  }

  try {
    const pos = estimerPosition(knownPoints, distances);

    // Supprimer l'ancien point rouge
    if (existingRedPoint) {
      existingRedPoint.remove();
    }

    // Créer un nouveau point rouge
    const plan = document.getElementById(planId);
    const point = document.createElement("div");
    point.classList.add("point", "red");
    point.textContent = "X";
    point.style.left = `${pos.x}px`;
    point.style.top = `${pos.y}px`;
    plan.appendChild(point);
  } catch (error) {
    // Si une erreur survient, supprimer le point rouge
    if (existingRedPoint) {
      existingRedPoint.remove();
    }
  }
}

function estimerPosition(knownPoints, distances) {
  if (knownPoints.length < 3) {
    throw new Error("Au moins 3 points sont nécessaires pour la triangulation.");
  }

  // Utiliser les trois premiers points pour la triangulation
  const [p1, p2, p3] = knownPoints;
  const [d1, d2, d3] = distances;

  // Résolution des équations de cercle
  const A = 2 * (p2.x - p1.x);
  const B = 2 * (p2.y - p1.y);
  const C = d1 ** 2 - d2 ** 2 - p1.x ** 2 + p2.x ** 2 - p1.y ** 2 + p2.y ** 2;

  const D = 2 * (p3.x - p1.x);
  const E = 2 * (p3.y - p1.y);
  const F = d1 ** 2 - d3 ** 2 - p1.x ** 2 + p3.x ** 2 - p1.y ** 2 + p3.y ** 2;

  const denominator = A * E - B * D;
  if (denominator === 0) {
    throw new Error("Les points sont colinéaires ou mal positionnés.");
  }

  const x = (C * E - B * F) / denominator;
  const y = (A * F - C * D) / denominator;

  return { x, y };
}

window.addEventListener("DOMContentLoaded", init);
