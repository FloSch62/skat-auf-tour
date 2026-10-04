// Kitchen lines (src/content/texts.ts KITCHEN): the partner's goodbye and welcome, or a quiet kitchen moment.
import { KITCHEN } from "../content/texts";

export function homeLines() {
  return {
    partnerGoodbye: KITCHEN.partnerGoodbye as readonly string[],
    partnerWelcome: KITCHEN.partnerWelcome as readonly string[],
    ambience: KITCHEN.ambience as readonly string[],
    welcomeAlone: KITCHEN.welcomeAlone as readonly string[],
  };
}
