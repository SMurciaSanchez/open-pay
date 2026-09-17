// snarkjs no publica tipos propios. Solo se declara lo que el portal usa:
// verificar una prueba Groth16 contra una clave de verificación.
declare module 'snarkjs' {
  export namespace groth16 {
    function verify(
      verificationKey: unknown,
      publicSignals: string[],
      proof: unknown,
    ): Promise<boolean>;
  }
}
