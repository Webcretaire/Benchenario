import { runScenario } from "./benchenario.ts";
import { parseScenario } from "./util.ts";

if (!Deno.args.length) {
    console.log('Usage : deno run main.ts <yaml specification>');
    Deno.exit(0);
}

const scenarioContent = Deno.readTextFileSync(Deno.args[0]);

await runScenario(await parseScenario(scenarioContent));
