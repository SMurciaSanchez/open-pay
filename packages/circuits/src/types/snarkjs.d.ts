// snarkjs no publica tipos propios. Solo se declara lo que este paquete usa.
declare module 'snarkjs' {
  export namespace groth16 {
    function fullProve(
      input: unknown,
      wasmPath: string,
      zkeyPath: string,
    ): Promise<{ proof: unknown; publicSignals: string[] }>;

    function verify(
      verificationKey: unknown,
      publicSignals: string[],
      proof: unknown,
    ): Promise<boolean>;
  }
}
