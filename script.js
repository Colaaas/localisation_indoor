let idCounter = 1;
const points = [];

function init() {
  document.getElementById("plan-upload").addEventListener("change", function (e) {
    const file = e.target.files[0];
    document.getElementById("plan-filename").textContent = file ? file.name : "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      const plansContainer = document.getElementById("plans-container");
      plansContainer.innerHTML = "";

      const planDiv = document.createElement("div");
      planDiv.className = "plan";
      planDiv.id = "plan1";

      const img = document.createElement("img");
      img.src = evt.target.result;
      img.style.width = "100%";
      img.style.height = "auto";
      planDiv.appendChild(img);

      plansContainer.appendChild(planDiv);

      initPlan("plan1");
    };
    reader.readAsDataURL(file);
  });

  // Ajout gestion du bouton "Supprimer tous les points"
  const deleteAllBtn = document.getElementById("delete-all-points");
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", () => {
      points.forEach(p => p.point.remove());
      points.length = 0;
      afficherCoordonnees();
      updateTriangulationForm();
      // Supprimer le point rouge de localisation s'il existe
      const redPoint = document.querySelector("#plan1 .point.red");
      if (redPoint) redPoint.remove();
    });
  }
}

function initPlan(planId) {
  const plan = document.getElementById(planId);
  plan.addEventListener("click", e => {
    if (e.target.tagName === "IMG") {
      const rect = plan.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ajouterPoint(planId, x, y);
    }
  });

  // Ajoute l'écouteur pour les distances
  const inputDiv = document.getElementById("distances-inputs-" + planId);
  inputDiv.addEventListener("input", () => {
    localiserPoint(planId, inputDiv.id);
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

  const pointData = { id, x: x - 8, y: y - 8, point, planId: 1, distance: null };
  points.push(pointData);

  makeDraggable(point, pointData);
  afficherCoordonnees();
}

function makeDraggable(point, pointData) {
  point.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", pointData.id);
  });

  point.addEventListener("dragend", () => {});

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
      localiserPoint("plan1", "distances-inputs-plan1");
    }
  });
}

function afficherCoordonnees() {
  const container1 = document.getElementById("plan1-points");
  container1.innerHTML = "";

  points.forEach(({ id, x, y }) => {
    const ligne = document.createElement("div");
    ligne.className = "coordonnees-ligne";

    ligne.innerHTML = `
      <label>Point ${id}</label><br>
      <label>X <input type="number" value="${Math.round(x)}" data-id="${id}" data-coord="x"></label><br>
      <label>Y <input type="number" value="${Math.round(y)}" data-id="${id}" data-coord="y"></label><br>
      <button data-id="${id}">❌</button>
    `;

    container1.appendChild(ligne);
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
        localiserPoint("plan1", "distances-inputs-plan1");
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
    updateTriangulationForm();
  }
}

function updateTriangulationForm() {
  const inputDiv = document.getElementById("distances-inputs-plan1");
  inputDiv.innerHTML = "";
  points.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `Point ${p.id} distance : <input type="number" step="1" data-id="${p.id}" value="${p.distance || ''}">`;
    inputDiv.appendChild(div);
  });

  document.querySelectorAll(`#distances-inputs-plan1 input`).forEach(input => {
    input.addEventListener("input", () => {
      const id = Number(input.dataset.id);
      const radius = Number(input.value);
      const point = points.find(p => p.id === id);

      if (point) {
        point.distance = isNaN(radius) || radius <= 0 ? null : radius;

        // Supprimer l'ancien cercle s'il existe
        const existingCircle = point.point.querySelector(".circle");
        if (existingCircle) {
          existingCircle.remove();
        }

        // Ajouter un nouveau cercle si la distance est valide
        if (point.distance) {
          const circle = document.createElement("div");
          circle.classList.add("circle");
          circle.style.width = `${point.distance * 2}px`;
          circle.style.height = `${point.distance * 2}px`;
          circle.style.left = "50%";
          circle.style.top = "50%";
          point.point.appendChild(circle);
        }
      }
    });
  });
}

function localiserPoint(planId, inputDivId) {
  const knownPoints = points.filter(p => p.distance);

  const localisationDiv = document.getElementById("localisation-coordonnees");

  if (knownPoints.length < 3) {
    const existingRedPoint = document.querySelector(`#${planId} .point.red`);
    if (existingRedPoint) {
      existingRedPoint.remove();
    }
    if (localisationDiv) localisationDiv.textContent = "Aucune localisation possible (au moins 3 distances nécessaires)";
    return;
  }

  // Trier les points par distance croissante
  const sortedPoints = knownPoints.sort((a, b) => a.distance - b.distance);

  // Prendre les 3 plus petites distances
  const selectedPoints = sortedPoints.slice(0, 3);
  const distances = selectedPoints.map(p => p.distance);

  try {
    const pos = estimerPosition(selectedPoints, distances);

    const existingRedPoint = document.querySelector(`#${planId} .point.red`);
    if (existingRedPoint) {
      existingRedPoint.remove();
    }

    const plan = document.getElementById(planId);
    const point = document.createElement("div");
    point.classList.add("point", "red");
    point.textContent = "X";
    point.style.left = `${pos.x}px`;
    point.style.top = `${pos.y}px`;
    plan.appendChild(point);

    // Affiche les coordonnées dans la partie coordonnées
    if (localisationDiv) localisationDiv.textContent = `Point localisé : X = ${Math.round(pos.x)}, Y = ${Math.round(pos.y)}`;
  } catch (error) {
    const existingRedPoint = document.querySelector(`#${planId} .point.red`);
    if (existingRedPoint) {
      existingRedPoint.remove();
    }
    if (localisationDiv) localisationDiv.textContent = "Localisation impossible (points colinéaires ou mal positionnés)";
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