import { isDirectIndexNowScript, runIndexNowPlan } from './indexnow-plan.mjs';

// A source template addition is not proof that every game's URL exists or is indexable.
if (isDirectIndexNowScript(import.meta.url)) {
  try { runIndexNowPlan(process.argv.slice(2), { command: 'indexnow:new-pages' }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
