import { parse } from "jsr:@std/yaml@1.0.10";
import { Scenario } from "./benchenario.ts";

export const sequentialMap = async <T, U>(arr: T[], fn: (arg: T) => U | Promise<U>): Promise<U[]> => {
    const out: U[] = [];
    let p: Promise<void> = Promise.resolve();

    arr.forEach(element => {
        p = p.then(async () => {
            out.push(await fn(element));
        });
    });

    await p;

    return out;
};

export const evalExpr = (expression: string, context: Record<string, unknown> = {}): Promise<string> => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./evalExprWorker.js', import.meta.url), { type: "module" });

    worker.onmessage = (e) => {
        if (e.data.error)
            reject(e.data.error);
        else
            resolve(e.data.result);

        worker.terminate();
    };

    worker.postMessage({
        expression,
        context
    });
});

export const parseScenario = async (scenarioContent: string): Promise<Scenario> => {
    const scenario: Scenario = {
        ...{
            iterations: 1,
            warmup: 0,
            steps: [],
        },
        ...(parse(scenarioContent) as Record<string, unknown>)
    };
    
    scenario.baseUrl = await evalExpr(scenario.baseUrl ?? '');

    return scenario
}