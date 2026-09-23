// Every text intent → its handler. Record<Intent, …> makes TypeScript reject a missing one.
import { FALLBACK_REPLY, type Handler, type Intent } from "./types";
import { gratitude, habits, journal, lessons, mood, water } from "./journal";
import { addTask, completeTask, queryTasks } from "./tasks";
import { queryMemory, queryRun, queryToday, queryWeek } from "./queries";
import { rescheduleSession, skipSession } from "./training";
import { createAsanaTask } from "./asana";
import { draftEod } from "./eod";
import { logMetric } from "./metrics";

const unknown: Handler = async (ctx, parsed) => {
  await ctx.reply(parsed.reply || FALLBACK_REPLY);
};

export const handlers: Record<Intent, Handler> = {
  journal, gratitude, lessons, mood, water, habits,
  add_task: addTask,
  query_tasks: queryTasks,
  complete_task: completeTask,
  query_today: queryToday,
  query_week: queryWeek,
  query_run: queryRun,
  query_memory: queryMemory,
  reschedule_session: rescheduleSession,
  skip_session: skipSession,
  create_asana_task: createAsanaTask,
  draft_eod: draftEod,
  log_metric: logMetric,
  unknown,
};
