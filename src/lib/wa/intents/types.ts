import type { ParsedMessage } from "../../whatsapp";
import type { Ctx } from "../context";

export type Intent = ParsedMessage["intent"];
export type Handler = (ctx: Ctx, parsed: ParsedMessage) => Promise<void>;

export const FALLBACK_REPLY =
  "Just write freely — your day, how you're feeling, what you're grateful for. I'll figure out the rest 🙂";
