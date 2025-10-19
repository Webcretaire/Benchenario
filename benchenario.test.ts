import { assertEquals } from "jsr:@std/assert";
import { runScenario } from "./benchenario.ts";
import { parseScenario } from "./util.ts";

interface TestServerResponse {
    url: string,
    method: string,
    headers: Record<string, unknown>,
    content: string
}

const testContext: { server?: Deno.HttpServer, requests: TestServerResponse[] } = {
    requests: []
};

Deno.test.beforeAll(() => {
    // Simple echo server which logs requests (to make assertions easier in tests)
    testContext.server = Deno.serve({ port: 8080 }, async req => {
        const requestData: TestServerResponse = {
            url: req.url,
            method: req.method,
            headers: Object.fromEntries(req.headers.entries()),
            content: await req.text()
        };
        testContext.requests.push(requestData);
        return new Response(JSON.stringify(requestData));
    });
});

Deno.test.beforeEach(() => {
    testContext.requests = [];
});

Deno.test.afterAll(() => testContext.server?.shutdown());

Deno.test({
    name: "Simple scenario test", fn: async () => {
        await runScenario(await parseScenario(Deno.readTextFileSync(new URL('examples/test.yml', import.meta.url))));

        // 2 * 1 requests warmup, 2 * 2 for iterations
        assertEquals(testContext.requests.length, 6);

        // even requests are the GET ones, odd are the POST ones
        assertEquals(testContext.requests[0].headers.accept, 'application/json');
        assertEquals(testContext.requests[1].method, 'POST');
        assertEquals(testContext.requests[2].method, 'GET');
        assertEquals(testContext.requests[3].url.endsWith('/test'), true);
    },
    // unfortunately setting up our test server inside the test file creates leaks
    // in resources and network operations, I didn't find a clean solution to this
    // problem so for now we'll just disable those checks
    sanitizeOps: false,
    sanitizeResources: false
});