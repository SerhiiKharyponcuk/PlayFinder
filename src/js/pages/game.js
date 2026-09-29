import { gamesService } from "../services/games-service.js";
import { showMessage } from "../components/load-section.js";
import { safeImage } from "../utils/urls.js";

export async function init() {
  const container = document.getElementById("gameDetails");
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    showMessage(container, "Обери гру в каталозі.");
    return;
  }
  try {
    const game = await gamesService.getGame(id);
    // getGame вже додає мінімальну поточну ціну та CheapShark ID.
    // Не шукаємо гру повторно і не підміняємо її випадковим includes-збігом.
    document.querySelector("h1").textContent = game.title;
    const img = document.createElement("img");
    img.src = safeImage(game.image);
    img.alt = game.title;
    img.width = 360;
    const platforms = document.createElement("p");
    platforms.textContent = game.platforms.join(", ");
    const price = document.createElement('p');
    price.className = 'game-card__price';
    price.textContent = Number.isFinite(game.price)
      ? `Від ${game.price.toFixed(2)} USD · PC`
      : 'Немає доступних пропозицій для PC';
    container.replaceChildren(img, platforms, price);
  } catch (error) {
    showMessage(container, error.message);
  }
}

