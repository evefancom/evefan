import initWasm, { InitOutput } from './parquet_wasm';
import binary from './parquet_wasm_bg.wasm';

export class ParquetWasm {
  private static wasmInstance: InitOutput | null = null;

  static async initialize() {
    if (!this.wasmInstance) {
      console.log('Initializing Parquet Wasm WebAssembly instance');
      this.wasmInstance = await initWasm(binary);
    }
    return this.wasmInstance;
  }

  static free() {
    if (this.wasmInstance) {
      //   this.wasmInstance.__wbindgen_free(
      //     0,
      //     this.wasmInstance.memory.buffer.byteLength,
      //     8
      //   );
      this.wasmInstance = null;
    }
  }
  static getMemoryUsage(): number {
    if (this.wasmInstance) {
      return this.wasmInstance.memory.buffer.byteLength;
    }
    return 0;
  }
}
