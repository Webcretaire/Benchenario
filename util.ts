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