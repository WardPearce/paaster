export async function defineConfig(env) {
    const { default: pluginJson } = await env.$import(
        "https://cdn.jsdelivr.net/npm/@inlang/plugin-json@3/dist/index.js",
    )

    // recommended to enable linting feature
    const { default: standardLintRules } = await env.$import(
        "https://cdn.jsdelivr.net/npm/@inlang/plugin-standard-lint-rules@3/dist/index.js",
    )

    return {
        referenceLanguage: "en",
        plugins: [
            pluginJson({
                pathPattern: "./frontend/src/i18n/{language}.json",
            }),
            standardLintRules(),
        ],
    }
}
