import { CompileToIRResult } from './ir';
export declare class IRCompiler {
    private diagnostics;
    compileToIR(source: string): CompileToIRResult;
    private transformProgram;
    private transformModule;
    private transformEntity;
    private transformProperty;
    private transformComputedProperty;
    private transformRelationship;
    private transformConstraint;
    private transformStore;
    private transformEvent;
    private transformCommand;
    private transformParameter;
    private transformAction;
    private transformPolicy;
    private transformType;
    private transformExpression;
    private transformExprToValue;
    private literalToValue;
}
export declare function compileToIR(source: string): CompileToIRResult;
//# sourceMappingURL=ir-compiler.d.ts.map