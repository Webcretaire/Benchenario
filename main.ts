import { parse } from "jsr:@std/yaml@1.0.10";
import { runScenario, Scenario } from "./benchenario.ts";

if (!Deno.args.length) {
    console.log('Usage : deno run main.ts <yaml specification>');
    Deno.exit(0);
}

const scenarioContent = Deno.readTextFileSync(Deno.args[0]);
const scenario: Scenario = {
    ...{
        iterations: 1,
        warmup: 0,
        steps: [],
    },
    ...(parse(scenarioContent) as Record<string, unknown>)
};

console.log(await runScenario(scenario));
