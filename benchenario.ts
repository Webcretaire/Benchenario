import { evalExpr, sequentialMap } from "./util.ts";

export interface RequestStat {
    time: number,
    status: number
}

export interface ResponseSummary {
    content: unknown,
    status: number
}

export interface RequestStats {
    detail: RequestStat[]
}

export interface Step {
    name?: string,
    path: string,
    method?: string,
    body?: string | Record<string | number | symbol, unknown> | Array<unknown>,
    assign?: string
}

export interface Scenario {
    iterations: number,
    warmup: number,
    baseUrl?: string,
    steps: Step[]
}

const measureRequest = async (scenario: Scenario, step: Step, context: Record<string, string>, stats: RequestStats) => {
    const t = performance.now();
    const response = await performRequest(scenario, step, context);
    stats.detail.push({
        status: response.status,
        time: performance.now() - t
    });

    return response;
}

const performRequest = async (scenario: Scenario, step: Step, context: Record<string, string | ResponseSummary>) => {
    const options: RequestInit = {
        method: step.method ?? 'GET'
    };

    if (step.body) {
        options.body = typeof step.body === 'string'
            ? await evalExpr(step.body, context)
            : JSON.stringify(step.body);
    }

    const response = await fetch(new URL(await evalExpr(step.path, context), scenario.baseUrl).toString(), options);

    if (step?.assign) {
        context[step.assign] = {
            content: response.headers.get('Content-Type')?.includes('json') ? await response.json() : await response.text(),
            status: response.status
        };
    }

    return response;
}

const runAllSteps = async (scenario: Scenario, isWarmup: boolean) => {
    const stats: RequestStats = { detail: [] };

    const context: Record<string, string> = Deno.env.toObject();

    await sequentialMap<Step, Response>(
        scenario.steps,
        (step: Step) => {
            return isWarmup ? performRequest(scenario, step, context) : measureRequest(scenario, step, context, stats);
        }
    );
}

export const runScenario = async (scenario: Scenario) => {
    for (let i = 0; i < scenario.warmup; ++i)
        await runAllSteps(scenario, true);

    for (let i = 0; i < scenario.iterations; ++i)
        await runAllSteps(scenario, false);
}
