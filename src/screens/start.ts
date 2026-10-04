// Entry: the first start asks for the name and the drink, every later start opens the kitchen.
import type { App, Scene } from "../core/scene";
import { settings } from "../core/save";
import { createHome } from "./home";
import { createWelcome } from "./welcome";

export function createStart(app: App): Scene {
  if (!settings.name) return createWelcome(app, { done: () => app.scenes.switchTo(createHome(app)) });
  return createHome(app);
}
