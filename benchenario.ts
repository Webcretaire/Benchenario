import { evalExpr, sequentialMap } from "./util.ts";

export interface RequestStats {
    time: number,
    status: number
}

export interface ResponseSummary {
    content: string,
    json?: unknown,
    status: number
}

export interface PerformRequestOutput {
    context: ExecutionContext,
    stats: RequestStats
}

export type ExecutionContext = Record<string, string | ResponseSummary>;

export interface AllRequestStats {
    detail: RequestStats[]
}

export interface Step {
    name?: string,
    path: string,
    method?: string,
    headers?: Record<string, string>,
    body?: string | Record<string | number | symbol, unknown> | Array<unknown>,
    assign?: string,
    waitBefore?: number,
    waitAfter?: number
}

export interface Scenario {
    iterations: number,
    warmup: number,
    baseUrl?: string,
    steps: Step[]
}

const performRequest = async (scenario: Scenario, step: Step, context: ExecutionContext, isWarmup: boolean): Promise<RequestStats | null> => {
    const options: RequestInit = {
        method: step.method ? await evalExpr(step.method) : 'GET'
    };

    if (step.body) {
        options.body = await evalExpr(
            typeof step.body === 'string' ? step.body : JSON.stringify(step.body),
            context
        );
    }

    if (step.headers) {
        const headersInit: Record<string, string> = {};
        // Compute all header values in parallel (1 worker each)
        await Promise.all(
            Object.keys(step.headers).map(
                async key => {
                    headersInit[key] = await evalExpr(step.headers![key] ?? '', context);
                }
            )
        );
        options.headers = headersInit;
    }

    if (step.waitBefore)
        await new Promise(res => setTimeout(res, step.waitBefore));

    const t = performance.now();
    let response = null;
    let stats = null;

    try {
        response = await fetch(new URL(await evalExpr(step.path, context), scenario.baseUrl).toString(), options);
    } finally {
        if (!isWarmup) {
            stats = {
                status: response?.status ?? 0,
                time: performance.now() - t
            };
        }
    }

    if (step?.assign && response) {
        const summary: ResponseSummary = {
            content: await response.text(),
            status: response.status
        };

        if (response.headers.get('Content-Type')?.includes('json')) {
            try {
                summary.json = JSON.parse(summary.content);
            } catch (e) {
                console.error(`Error parsing JSON response: ${e}`);
            }
        }

        context[step.assign] = summary;
    }

    if (step.waitAfter)
        await new Promise(res => setTimeout(res, step.waitAfter));

    return stats;
}

const runAllSteps = async (scenario: Scenario, isWarmup: boolean) => {
    const stats: RequestStats[] = [];
    const context: ExecutionContext = Deno.env.toObject();

    await sequentialMap<Step, void>(
        scenario.steps,
        async (step: Step) => {
            const result = await performRequest(scenario, step, context, isWarmup);
            if (!isWarmup && result)
                stats.push(result);
        }
    );

    return stats;
}

const codeStats = (stats: RequestStats[]) => stats.reduce((out: Record<number, number>, s) => {
    if (!out[s.status]) out[s.status] = 0;
    out[s.status]++;

    return out;
}, {});

const codeStatsStr = (stats: RequestStats[]) => {
    const obj: Record<string, number> = codeStats(stats);

    return Object.keys(obj)
        .map((key: string) => key.length === 3 ? ` - HTTP status ${key}: ${obj[key]} requests` : `- Network error: ${obj[key]}`)
        .join('\n');
}

const avg = (stats: RequestStats[]) => stats.reduce((acc, s) => acc + (s.time / stats.length), 0).toFixed(0);
const max = (stats: RequestStats[]) => stats.reduce((acc, s) => s.time > acc ? s.time : acc, 0).toFixed(0);

export const runScenario = async (scenario: Scenario) => {
    for (let i = 0; i < scenario.warmup; ++i)
        await runAllSteps(scenario, true);

    let allStats: RequestStats[] = [];

    for (let i = 0; i < scenario.iterations; ++i) {
        const stats = await runAllSteps(scenario, false);
        console.log(`Iteration ${i + 1} - avg time: ${avg(stats)}ms, max time: ${max(stats)}ms`);
        console.log(codeStatsStr(stats));
        allStats = allStats.concat(stats);
    }

    console.log(`\n===== Overall stats =====\n`)
    console.log(`Average request time: ${avg(allStats)}ms`);
    console.log(`Max request time: ${max(allStats)}ms\n`);
    console.log(codeStatsStr(allStats));
}
