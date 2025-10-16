self.onmessage = (e) => {
    const { expression, context } = e.data;
    const func = new Function(...Object.keys(context), `return \`${expression.replaceAll('`', '\\`')}\``);

    try {
        self.postMessage({ result: func(...Object.values(context)) });
    } catch (error) {
        self.postMessage({ error: error.toString() });
    }
};
