function startGame() {
  alert("🎮 O jogo será iniciado em breve!");
}

document.addEventListener("DOMContentLoaded", () => {
  const table = document.querySelector("#rankingTable tbody");
  if (!table) return;

  const players = JSON.parse(localStorage.getItem("players") || "[]");
  players.sort((a, b) => b.score - a.score);

  table.innerHTML = players
    .map(
      (p, i) => `
    <tr>
      <td>${i + 1}º</td>
      <td>${p.name}</td>
      <td>${p.team}</td>
      <td>${p.score}</td>
    </tr>`
    )
    .join("");
});
