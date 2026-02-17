import type { CompilationResult, ManifestProgram } from "./types.js";
export declare class ManifestCompiler {
    private readonly parser;
    private readonly generator;
    compile(source: string): CompilationResult;
    parse(source: string): {
        program: ManifestProgram;
        errors: unknown[];
    };
}
export * from "./types.js";
//# sourceMappingURL=compiler.d.ts.map