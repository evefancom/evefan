/* tslint:disable */
/* eslint-disable */
/**
* Read a Parquet file into Arrow data.
*
* This returns an Arrow table in WebAssembly memory. To transfer the Arrow table to JavaScript
* memory you have two options:
*
* - (Easier): Call {@linkcode Table.intoIPCStream} to construct a buffer that can be parsed with
*   Arrow JS's `tableFromIPC` function.
* - (More performant but bleeding edge): Call {@linkcode Table.intoFFI} to construct a data
*   representation that can be parsed zero-copy from WebAssembly with
*   [arrow-js-ffi](https://github.com/kylebarron/arrow-js-ffi) using `parseTable`.
*
* Example with IPC stream:
*
* ```js
* import { tableFromIPC } from "apache-arrow";
* import initWasm, {readParquet} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
*
* const resp = await fetch("https://example.com/file.parquet");
* const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
* const arrowWasmTable = readParquet(parquetUint8Array);
* const arrowTable = tableFromIPC(arrowWasmTable.intoIPCStream());
* ```
*
* Example with `arrow-js-ffi`:
*
* ```js
* import { parseTable } from "arrow-js-ffi";
* import initWasm, {readParquet, wasmMemory} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
* const WASM_MEMORY = wasmMemory();
*
* const resp = await fetch("https://example.com/file.parquet");
* const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
* const arrowWasmTable = readParquet(parquetUint8Array);
* const ffiTable = arrowWasmTable.intoFFI();
* const arrowTable = parseTable(
*   WASM_MEMORY.buffer,
*   ffiTable.arrayAddrs(),
*   ffiTable.schemaAddr()
* );
* ```
*
* @param parquet_file Uint8Array containing Parquet data
* @param options
*
*    Options for reading Parquet data. Optional keys include:
*
*    - `batchSize`: The number of rows in each batch. If not provided, the upstream parquet
*           default is 1024.
*    - `rowGroups`: Only read data from the provided row group indexes.
*    - `limit`: Provide a limit to the number of rows to be read.
*    - `offset`: Provide an offset to skip over the given number of rows.
*    - `columns`: The column names from the file to read.
* @param {Uint8Array} parquet_file
* @param {ReaderOptions | undefined} [options]
* @returns {Table}
*/
export function readParquet(parquet_file: Uint8Array, options?: ReaderOptions): Table;
/**
* Read an Arrow schema from a Parquet file in memory.
*
* This returns an Arrow schema in WebAssembly memory. To transfer the Arrow schema to JavaScript
* memory you have two options:
*
* - (Easier): Call {@linkcode Schema.intoIPCStream} to construct a buffer that can be parsed with
*   Arrow JS's `tableFromIPC` function. This results in an Arrow JS Table with zero rows but a
*   valid schema.
* - (More performant but bleeding edge): Call {@linkcode Schema.intoFFI} to construct a data
*   representation that can be parsed zero-copy from WebAssembly with
*   [arrow-js-ffi](https://github.com/kylebarron/arrow-js-ffi) using `parseSchema`.
*
* Example with IPC Stream:
*
* ```js
* import { tableFromIPC } from "apache-arrow";
* import initWasm, {readSchema} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
*
* const resp = await fetch("https://example.com/file.parquet");
* const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
* const arrowWasmSchema = readSchema(parquetUint8Array);
* const arrowTable = tableFromIPC(arrowWasmSchema.intoIPCStream());
* const arrowSchema = arrowTable.schema;
* ```
*
* Example with `arrow-js-ffi`:
*
* ```js
* import { parseSchema } from "arrow-js-ffi";
* import initWasm, {readSchema, wasmMemory} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
* const WASM_MEMORY = wasmMemory();
*
* const resp = await fetch("https://example.com/file.parquet");
* const parquetUint8Array = new Uint8Array(await resp.arrayBuffer());
* const arrowWasmSchema = readSchema(parquetUint8Array);
* const ffiSchema = arrowWasmSchema.intoFFI();
* const arrowTable = parseSchema(WASM_MEMORY.buffer, ffiSchema.addr());
* const arrowSchema = arrowTable.schema;
* ```
*
* @param parquet_file Uint8Array containing Parquet data
* @param {Uint8Array} parquet_file
* @returns {Schema}
*/
export function readSchema(parquet_file: Uint8Array): Schema;
/**
* Write Arrow data to a Parquet file.
*
* For example, to create a Parquet file with Snappy compression:
*
* ```js
* import { tableToIPC } from "apache-arrow";
* // Edit the `parquet-wasm` import as necessary
* import initWasm, {
*   Table,
*   WriterPropertiesBuilder,
*   Compression,
*   writeParquet,
* } from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
*
* // Given an existing arrow JS table under `table`
* const wasmTable = Table.fromIPCStream(tableToIPC(table, "stream"));
* const writerProperties = new WriterPropertiesBuilder()
*   .setCompression(Compression.SNAPPY)
*   .build();
* const parquetUint8Array = writeParquet(wasmTable, writerProperties);
* ```
*
* If `writerProperties` is not provided or is `null`, the default writer properties will be used.
* This is equivalent to `new WriterPropertiesBuilder().build()`.
*
* @param table A {@linkcode Table} representation in WebAssembly memory.
* @param writer_properties (optional) Configuration for writing to Parquet. Use the {@linkcode
* WriterPropertiesBuilder} to build a writing configuration, then call `.build()` to create an
* immutable writer properties to pass in here.
* @returns Uint8Array containing written Parquet data.
* @param {Table} table
* @param {WriterProperties | undefined} [writer_properties]
* @returns {Uint8Array}
*/
export function writeParquet(table: Table, writer_properties?: WriterProperties): Uint8Array;
/**
* Read a Parquet file into a stream of Arrow `RecordBatch`es.
*
* This returns a ReadableStream containing RecordBatches in WebAssembly memory. To transfer the
* Arrow table to JavaScript memory you have two options:
*
* - (Easier): Call {@linkcode RecordBatch.intoIPCStream} to construct a buffer that can be parsed
*   with Arrow JS's `tableFromIPC` function. (The table will have a single internal record
*   batch).
* - (More performant but bleeding edge): Call {@linkcode RecordBatch.intoFFI} to construct a data
*   representation that can be parsed zero-copy from WebAssembly with
*   [arrow-js-ffi](https://github.com/kylebarron/arrow-js-ffi) using `parseRecordBatch`.
*
* Example with IPC stream:
*
* ```js
* import { tableFromIPC } from "apache-arrow";
* import initWasm, {readParquetStream} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
*
* const stream = await wasm.readParquetStream(url);
*
* const batches = [];
* for await (const wasmRecordBatch of stream) {
*   const arrowTable = tableFromIPC(wasmRecordBatch.intoIPCStream());
*   batches.push(...arrowTable.batches);
* }
* const table = new arrow.Table(batches);
* ```
*
* Example with `arrow-js-ffi`:
*
* ```js
* import { parseRecordBatch } from "arrow-js-ffi";
* import initWasm, {readParquetStream, wasmMemory} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
* const WASM_MEMORY = wasmMemory();
*
* const stream = await wasm.readParquetStream(url);
*
* const batches = [];
* for await (const wasmRecordBatch of stream) {
*   const ffiRecordBatch = wasmRecordBatch.intoFFI();
*   const recordBatch = parseRecordBatch(
*     WASM_MEMORY.buffer,
*     ffiRecordBatch.arrayAddr(),
*     ffiRecordBatch.schemaAddr(),
*     true
*   );
*   batches.push(recordBatch);
* }
* const table = new arrow.Table(batches);
* ```
*
* @param url URL to Parquet file
* @param {string} url
* @param {number | undefined} [content_length]
* @returns {Promise<ReadableStream>}
*/
export function readParquetStream(url: string, content_length?: number): Promise<ReadableStream>;
/**
* Transform a ReadableStream of RecordBatches to a ReadableStream of bytes
*
* Browser example with piping to a file via the File System API:
*
* ```js
* import initWasm, {ParquetFile, transformParquetStream} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
*
* const fileInstance = await ParquetFile.fromUrl("https://example.com/file.parquet");
* const recordBatchStream = await fileInstance.stream();
* const serializedParquetStream = await transformParquetStream(recordBatchStream);
* // NB: requires transient user activation - you would typically do this before ☝️
* const handle = await window.showSaveFilePicker();
* const writable = await handle.createWritable();
* await serializedParquetStream.pipeTo(writable);
* ```
*
* NodeJS (ESM) example with piping to a file:
* ```js
* import { open } from "node:fs/promises";
* import { Writable } from "node:stream";
* import initWasm, {ParquetFile, transformParquetStream} from "parquet-wasm";
*
* // Instantiate the WebAssembly context
* await initWasm();
*
* const fileInstance = await ParquetFile.fromUrl("https://example.com/file.parquet");
* const recordBatchStream = await fileInstance.stream();
* const serializedParquetStream = await transformParquetStream(recordBatchStream);
*
* // grab a file handle via fsPromises
* const handle = await open("file.parquet");
* const destinationStream = Writable.toWeb(handle.createWriteStream());
* await serializedParquetStream.pipeTo(destinationStream);
*
* ```
* NB: the above is a little contrived - `await writeFile("file.parquet", serializedParquetStream)`
* is enough for most use cases.
*
* Browser kitchen sink example - teeing to the Cache API, using as a streaming post body, transferring
* to a Web Worker:
* ```js
* // prelude elided - see above
* const serializedParquetStream = await transformParquetStream(recordBatchStream);
* const [cacheStream, bodyStream] = serializedParquetStream.tee();
* const postProm = fetch(targetUrl, {
*     method: "POST",
*     duplex: "half",
*     body: bodyStream
* });
* const targetCache = await caches.open("foobar");
* await targetCache.put("https://example.com/file.parquet", new Response(cacheStream));
* // this could have been done with another tee, but beware of buffering
* const workerStream = await targetCache.get("https://example.com/file.parquet").body;
* const worker = new Worker("worker.js");
* worker.postMessage(workerStream, [workerStream]);
* await postProm;
* ```
*
* @param stream A {@linkcode ReadableStream} of {@linkcode RecordBatch} instances
* @param writer_properties (optional) Configuration for writing to Parquet. Use the {@linkcode
* WriterPropertiesBuilder} to build a writing configuration, then call `.build()` to create an
* immutable writer properties to pass in here.
* @returns ReadableStream containing serialized Parquet data.
* @param {ReadableStream} stream
* @param {WriterProperties | undefined} [writer_properties]
* @returns {Promise<ReadableStream>}
*/
export function transformParquetStream(stream: ReadableStream, writer_properties?: WriterProperties): Promise<ReadableStream>;
/**
* Returns a handle to this wasm instance's `WebAssembly.Memory`
* @returns {Memory}
*/
export function wasmMemory(): Memory;
/**
* Returns a handle to this wasm instance's `WebAssembly.Table` which is the indirect function
* table used by Rust
* @returns {FunctionTable}
*/
export function _functionTable(): FunctionTable;
/**
* The Parquet version to use when writing
*/
export enum WriterVersion {
  V1 = 0,
  V2 = 1,
}
/**
* Encodings supported by Parquet.
* Not all encodings are valid for all types. These enums are also used to specify the
* encoding of definition and repetition levels.
*/
export enum Encoding {
/**
* Default byte encoding.
* - BOOLEAN - 1 bit per value, 0 is false; 1 is true.
* - INT32 - 4 bytes per value, stored as little-endian.
* - INT64 - 8 bytes per value, stored as little-endian.
* - FLOAT - 4 bytes per value, stored as little-endian.
* - DOUBLE - 8 bytes per value, stored as little-endian.
* - BYTE_ARRAY - 4 byte length stored as little endian, followed by bytes.
* - FIXED_LEN_BYTE_ARRAY - just the bytes are stored.
*/
  PLAIN = 0,
/**
* **Deprecated** dictionary encoding.
*
* The values in the dictionary are encoded using PLAIN encoding.
* Since it is deprecated, RLE_DICTIONARY encoding is used for a data page, and
* PLAIN encoding is used for dictionary page.
*/
  PLAIN_DICTIONARY = 1,
/**
* Group packed run length encoding.
*
* Usable for definition/repetition levels encoding and boolean values.
*/
  RLE = 2,
/**
* Bit packed encoding.
*
* This can only be used if the data has a known max width.
* Usable for definition/repetition levels encoding.
*/
  BIT_PACKED = 3,
/**
* Delta encoding for integers, either INT32 or INT64.
*
* Works best on sorted data.
*/
  DELTA_BINARY_PACKED = 4,
/**
* Encoding for byte arrays to separate the length values and the data.
*
* The lengths are encoded using DELTA_BINARY_PACKED encoding.
*/
  DELTA_LENGTH_BYTE_ARRAY = 5,
/**
* Incremental encoding for byte arrays.
*
* Prefix lengths are encoded using DELTA_BINARY_PACKED encoding.
* Suffixes are stored using DELTA_LENGTH_BYTE_ARRAY encoding.
*/
  DELTA_BYTE_ARRAY = 6,
/**
* Dictionary encoding.
*
* The ids are encoded using the RLE encoding.
*/
  RLE_DICTIONARY = 7,
/**
* Encoding for floating-point data.
*
* K byte-streams are created where K is the size in bytes of the data type.
* The individual bytes of an FP value are scattered to the corresponding stream and
* the streams are concatenated.
* This itself does not reduce the size of the data but can lead to better compression
* afterwards.
*/
  BYTE_STREAM_SPLIT = 8,
}
/**
* Supported compression algorithms.
*
* Codecs added in format version X.Y can be read by readers based on X.Y and later.
* Codec support may vary between readers based on the format version and
* libraries available at runtime.
*/
export enum Compression {
  UNCOMPRESSED = 0,
  SNAPPY = 1,
  GZIP = 2,
  BROTLI = 3,
/**
* @deprecated as of Parquet 2.9.0.
* Switch to LZ4_RAW
*/
  LZ4 = 4,
  ZSTD = 5,
  LZ4_RAW = 6,
  LZO = 7,
}
/**
* Controls the level of statistics to be computed by the writer
*/
export enum EnabledStatistics {
/**
* Compute no statistics
*/
  None = 0,
/**
* Compute chunk-level statistics but not page-level
*/
  Chunk = 1,
/**
* Compute page-level and chunk-level statistics
*/
  Page = 2,
}

export type ReaderOptions = {
    /* The number of rows in each batch. If not provided, the upstream parquet default is 1024. */
    batchSize?: number;
    /* Only read data from the provided row group indexes. */
    rowGroups?: number[];
    /* Provide a limit to the number of rows to be read. */
    limit?: number;
    /* Provide an offset to skip over the given number of rows. */
    offset?: number;
    /* The column names from the file to read. */
    columns?: string[];
    /* The number of concurrent requests to make in the async reader. */
    concurrency?: number;
};



export type KeyValueMetadata = Map<string, string>;



export type FunctionTable = WebAssembly.Table;



export type Memory = WebAssembly.Memory;



export type SchemaMetadata = Map<string, string>;


/**
* Metadata for a Parquet column chunk.
*/
export class ColumnChunkMetaData {
  free(): void;
/**
* File where the column chunk is stored.
*
* If not set, assumed to belong to the same file as the metadata.
* This path is relative to the current file.
* @returns {string | undefined}
*/
  filePath(): string | undefined;
/**
* Byte offset in `file_path()`.
* @returns {bigint}
*/
  fileOffset(): bigint;
/**
* Path (or identifier) of this column.
* @returns {(string)[]}
*/
  columnPath(): (string)[];
/**
* All encodings used for this column.
* @returns {any[]}
*/
  encodings(): any[];
/**
* Total number of values in this column chunk.
* @returns {number}
*/
  numValues(): number;
/**
* Compression for this column.
* @returns {Compression}
*/
  compression(): Compression;
/**
* Returns the total compressed data size of this column chunk.
* @returns {number}
*/
  compressedSize(): number;
/**
* Returns the total uncompressed data size of this column chunk.
* @returns {number}
*/
  uncompressedSize(): number;
}
/**
*/
export class FFIArrowArray {
  free(): void;
/**
* @returns {number}
*/
  addr(): number;
}
/**
*/
export class FFIArrowSchema {
  free(): void;
/**
* Access the pointer to the
* [`ArrowSchema`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
* struct. This can be viewed or copied (without serialization) to an Arrow JS `Field` by
* using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
* [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
* instance by using {@linkcode wasmMemory}.
*
* **Example**:
*
* ```ts
* import { parseRecordBatch } from "arrow-js-ffi";
*
* const wasmRecordBatch: FFIRecordBatch = ...
* const wasmMemory: WebAssembly.Memory = wasmMemory();
*
* // Pass `true` to copy arrays across the boundary instead of creating views.
* const jsRecordBatch = parseRecordBatch(
*   wasmMemory.buffer,
*   wasmRecordBatch.arrayAddr(),
*   wasmRecordBatch.schemaAddr(),
*   true
* );
* ```
* @returns {number}
*/
  addr(): number;
}
/**
* An Arrow array including associated field metadata.
*
* Using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi), you can view or copy Arrow
* these objects to JavaScript.
*/
export class FFIData {
  free(): void;
/**
* @returns {number}
*/
  arrayAddr(): number;
/**
* @returns {number}
*/
  schema_addr(): number;
}
/**
* A representation of an Arrow RecordBatch in WebAssembly memory exposed as FFI-compatible
* structs through the Arrow C Data Interface.
*/
export class FFIRecordBatch {
  free(): void;
/**
* Access the pointer to the
* [`ArrowArray`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
* struct. This can be viewed or copied (without serialization) to an Arrow JS `RecordBatch` by
* using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
* [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
* instance by using {@linkcode wasmMemory}.
*
* **Example**:
*
* ```ts
* import { parseRecordBatch } from "arrow-js-ffi";
*
* const wasmRecordBatch: FFIRecordBatch = ...
* const wasmMemory: WebAssembly.Memory = wasmMemory();
*
* // Pass `true` to copy arrays across the boundary instead of creating views.
* const jsRecordBatch = parseRecordBatch(
*   wasmMemory.buffer,
*   wasmRecordBatch.arrayAddr(),
*   wasmRecordBatch.schemaAddr(),
*   true
* );
* ```
* @returns {number}
*/
  arrayAddr(): number;
/**
* Access the pointer to the
* [`ArrowSchema`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
* struct. This can be viewed or copied (without serialization) to an Arrow JS `Field` by
* using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
* [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
* instance by using {@linkcode wasmMemory}.
*
* **Example**:
*
* ```ts
* import { parseRecordBatch } from "arrow-js-ffi";
*
* const wasmRecordBatch: FFIRecordBatch = ...
* const wasmMemory: WebAssembly.Memory = wasmMemory();
*
* // Pass `true` to copy arrays across the boundary instead of creating views.
* const jsRecordBatch = parseRecordBatch(
*   wasmMemory.buffer,
*   wasmRecordBatch.arrayAddr(),
*   wasmRecordBatch.schemaAddr(),
*   true
* );
* ```
* @returns {number}
*/
  schemaAddr(): number;
}
/**
* A representation of an Arrow Table in WebAssembly memory exposed as FFI-compatible
* structs through the Arrow C Data Interface.
*/
export class FFITable {
  free(): void;
/**
* Get the total number of record batches in the table
* @returns {number}
*/
  numBatches(): number;
/**
* Get the pointer to one ArrowSchema FFI struct
* @returns {number}
*/
  schemaAddr(): number;
/**
* Get the pointer to one ArrowArray FFI struct for a given chunk index and column index
*
* Access the pointer to one
* [`ArrowArray`](https://arrow.apache.org/docs/format/CDataInterface.html#structure-definitions)
* struct representing one of the internal `RecordBatch`es. This can be viewed or copied (without serialization) to an Arrow JS `RecordBatch` by
* using [`arrow-js-ffi`](https://github.com/kylebarron/arrow-js-ffi). You can access the
* [`WebAssembly.Memory`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Memory)
* instance by using {@linkcode wasmMemory}.
*
* **Example**:
*
* ```ts
* import * as arrow from "apache-arrow";
* import { parseRecordBatch } from "arrow-js-ffi";
*
* const wasmTable: FFITable = ...
* const wasmMemory: WebAssembly.Memory = wasmMemory();
*
* const jsBatches: arrow.RecordBatch[] = []
* for (let i = 0; i < wasmTable.numBatches(); i++) {
*   // Pass `true` to copy arrays across the boundary instead of creating views.
*   const jsRecordBatch = parseRecordBatch(
*     wasmMemory.buffer,
*     wasmTable.arrayAddr(i),
*     wasmTable.schemaAddr(),
*     true
*   );
*   jsBatches.push(jsRecordBatch);
* }
* const jsTable = new arrow.Table(jsBatches);
* ```
*
* @param chunk number The chunk index to use
* @returns number pointer to an ArrowArray FFI struct in Wasm memory
* @param {number} chunk
* @returns {number}
*/
  arrayAddr(chunk: number): number;
/**
* @returns {Uint32Array}
*/
  arrayAddrs(): Uint32Array;
/**
*/
  drop(): void;
}
/**
* A chunked Arrow array including associated field metadata
*/
export class FFIVector {
  free(): void;
/**
* @returns {number}
*/
  schemaAddr(): number;
/**
* @param {number} i
* @returns {number}
*/
  arrayAddr(i: number): number;
}
/**
* Metadata for a Parquet file.
*/
export class FileMetaData {
  free(): void;
/**
* Returns version of this file.
* @returns {number}
*/
  version(): number;
/**
* Returns number of rows in the file.
* @returns {number}
*/
  numRows(): number;
/**
* String message for application that wrote this file.
*
* This should have the following format:
* `<application> version <application version> (build <application build hash>)`.
*
* ```shell
* parquet-mr version 1.8.0 (build 0fda28af84b9746396014ad6a415b90592a98b3b)
* ```
* @returns {string | undefined}
*/
  createdBy(): string | undefined;
/**
* Returns key_value_metadata of this file.
* @returns {Map<any, any>}
*/
  keyValueMetadata(): Map<any, any>;
}
/**
*/
export class IntoUnderlyingByteSource {
  free(): void;
/**
* @param {ReadableByteStreamController} controller
*/
  start(controller: ReadableByteStreamController): void;
/**
* @param {ReadableByteStreamController} controller
* @returns {Promise<any>}
*/
  pull(controller: ReadableByteStreamController): Promise<any>;
/**
*/
  cancel(): void;
/**
*/
  readonly autoAllocateChunkSize: number;
/**
*/
  readonly type: string;
}
/**
*/
export class IntoUnderlyingSink {
  free(): void;
/**
* @param {any} chunk
* @returns {Promise<any>}
*/
  write(chunk: any): Promise<any>;
/**
* @returns {Promise<any>}
*/
  close(): Promise<any>;
/**
* @param {any} reason
* @returns {Promise<any>}
*/
  abort(reason: any): Promise<any>;
}
/**
*/
export class IntoUnderlyingSource {
  free(): void;
/**
* @param {ReadableStreamDefaultController} controller
* @returns {Promise<any>}
*/
  pull(controller: ReadableStreamDefaultController): Promise<any>;
/**
*/
  cancel(): void;
}
/**
*/
export class ParquetFile {
  free(): void;
/**
* Construct a ParquetFile from a new URL.
*
* @param options The options to pass into `object-store`'s [`parse_url_opts`][parse_url_opts]
*
* [parse_url_opts]: https://docs.rs/object_store/latest/object_store/fn.parse_url_opts.html
* @param {string} url
* @param {Map<any, any> | undefined} [options]
* @returns {Promise<ParquetFile>}
*/
  static fromUrl(url: string, options?: Map<any, any>): Promise<ParquetFile>;
/**
* Construct a ParquetFile from a new [Blob] or [File] handle.
*
* [Blob]: https://developer.mozilla.org/en-US/docs/Web/API/Blob
* [File]: https://developer.mozilla.org/en-US/docs/Web/API/File
*
* Safety: Do not use this in a multi-threaded environment,
* (transitively depends on `!Send` `web_sys::Blob`)
* @param {Blob} handle
* @returns {Promise<ParquetFile>}
*/
  static fromFile(handle: Blob): Promise<ParquetFile>;
/**
* @returns {ParquetMetaData}
*/
  metadata(): ParquetMetaData;
/**
* Read from the Parquet file in an async fashion.
*
* @param options
*
*    Options for reading Parquet data. Optional keys include:
*
*    - `batchSize`: The number of rows in each batch. If not provided, the upstream parquet
*           default is 1024.
*    - `rowGroups`: Only read data from the provided row group indexes.
*    - `limit`: Provide a limit to the number of rows to be read.
*    - `offset`: Provide an offset to skip over the given number of rows.
*    - `columns`: The column names from the file to read.
* @param {ReaderOptions | undefined} [options]
* @returns {Promise<Table>}
*/
  read(options?: ReaderOptions): Promise<Table>;
/**
* Create a readable stream of record batches.
*
* Each item in the stream will be a {@linkcode RecordBatch}.
*
* @param options
*
*    Options for reading Parquet data. Optional keys include:
*
*    - `batchSize`: The number of rows in each batch. If not provided, the upstream parquet
*           default is 1024.
*    - `rowGroups`: Only read data from the provided row group indexes.
*    - `limit`: Provide a limit to the number of rows to be read.
*    - `offset`: Provide an offset to skip over the given number of rows.
*    - `columns`: The column names from the file to read.
*    - `concurrency`: The number of concurrent requests to make
* @param {ReaderOptions | undefined} [options]
* @returns {Promise<ReadableStream>}
*/
  stream(options?: ReaderOptions): Promise<ReadableStream>;
}
/**
* Global Parquet metadata.
*/
export class ParquetMetaData {
  free(): void;
/**
* Returns file metadata as reference.
* @returns {FileMetaData}
*/
  fileMetadata(): FileMetaData;
/**
* Returns number of row groups in this file.
* @returns {number}
*/
  numRowGroups(): number;
/**
* Returns row group metadata for `i`th position.
* Position should be less than number of row groups `num_row_groups`.
* @param {number} i
* @returns {RowGroupMetaData}
*/
  rowGroup(i: number): RowGroupMetaData;
/**
* Returns row group metadata for all row groups
* @returns {(RowGroupMetaData)[]}
*/
  rowGroups(): (RowGroupMetaData)[];
}
/**
* A group of columns of equal length in WebAssembly memory with an associated {@linkcode Schema}.
*/
export class RecordBatch {
  free(): void;
/**
* Export this RecordBatch to FFI structs according to the Arrow C Data Interface.
*
* This method **does not consume** the RecordBatch, so you must remember to call {@linkcode
* RecordBatch.free} to release the resources. The underlying arrays are reference counted, so
* this method does not copy data, it only prevents the data from being released.
* @returns {FFIRecordBatch}
*/
  toFFI(): FFIRecordBatch;
/**
* Export this RecordBatch to FFI structs according to the Arrow C Data Interface.
*
* This method **does consume** the RecordBatch, so the original RecordBatch will be
* inaccessible after this call. You must still call {@linkcode FFIRecordBatch.free} after
* you've finished using the FFIRecordBatch.
* @returns {FFIRecordBatch}
*/
  intoFFI(): FFIRecordBatch;
/**
* Consume this RecordBatch and convert to an Arrow IPC Stream buffer
* @returns {Uint8Array}
*/
  intoIPCStream(): Uint8Array;
/**
* Override the schema of this [`RecordBatch`]
*
* Returns an error if `schema` is not a superset of the current schema
* as determined by [`Schema::contains`]
* @param {Schema} schema
* @returns {RecordBatch}
*/
  withSchema(schema: Schema): RecordBatch;
/**
* Return a new RecordBatch where each column is sliced
* according to `offset` and `length`
* @param {number} offset
* @param {number} length
* @returns {RecordBatch}
*/
  slice(offset: number, length: number): RecordBatch;
/**
* Returns the total number of bytes of memory occupied physically by this batch.
* @returns {number}
*/
  getArrayMemorySize(): number;
/**
* The number of columns in this RecordBatch.
*/
  readonly numColumns: number;
/**
* The number of rows in this RecordBatch.
*/
  readonly numRows: number;
/**
* The {@linkcode Schema} of this RecordBatch.
*/
  readonly schema: Schema;
}
/**
* Metadata for a Parquet row group.
*/
export class RowGroupMetaData {
  free(): void;
/**
* Number of columns in this row group.
* @returns {number}
*/
  numColumns(): number;
/**
* Returns column chunk metadata for `i`th column.
* @param {number} i
* @returns {ColumnChunkMetaData}
*/
  column(i: number): ColumnChunkMetaData;
/**
* Returns column chunk metadata for all columns
* @returns {(ColumnChunkMetaData)[]}
*/
  columns(): (ColumnChunkMetaData)[];
/**
* Number of rows in this row group.
* @returns {number}
*/
  numRows(): number;
/**
* Total byte size of all uncompressed column data in this row group.
* @returns {number}
*/
  totalByteSize(): number;
/**
* Total size of all compressed column data in this row group.
* @returns {number}
*/
  compressedSize(): number;
}
/**
* A named collection of types that defines the column names and types in a RecordBatch or Table
* data structure.
*
* A Schema can also contain extra user-defined metadata either at the Table or Column level.
* Column-level metadata is often used to define [extension
* types](https://arrow.apache.org/docs/format/Columnar.html#extension-types).
*/
export class Schema {
  free(): void;
/**
* Export this schema to an FFIArrowSchema object, which can be read with arrow-js-ffi.
*
* This method **does not consume** the Schema, so you must remember to call {@linkcode
* Schema.free} to release the resources. The underlying arrays are reference counted, so
* this method does not copy data, it only prevents the data from being released.
* @returns {FFIArrowSchema}
*/
  toFFI(): FFIArrowSchema;
/**
* Export this Table to FFI structs according to the Arrow C Data Interface.
*
* This method **does consume** the Table, so the original Table will be
* inaccessible after this call. You must still call {@linkcode FFITable.free} after
* you've finished using the FFITable.
* @returns {FFIArrowSchema}
*/
  intoFFI(): FFIArrowSchema;
/**
* Consume this schema and convert to an Arrow IPC Stream buffer
* @returns {Uint8Array}
*/
  intoIPCStream(): Uint8Array;
/**
* Sets the metadata of this `Schema` to be `metadata` and returns a new object
* @param {SchemaMetadata} metadata
* @returns {Schema}
*/
  withMetadata(metadata: SchemaMetadata): Schema;
/**
* Find the index of the column with the given name.
* @param {string} name
* @returns {number}
*/
  indexOf(name: string): number;
/**
* Returns an immutable reference to the Map of custom metadata key-value pairs.
* @returns {SchemaMetadata}
*/
  metadata(): SchemaMetadata;
}
/**
* A Table in WebAssembly memory conforming to the Apache Arrow spec.
*
* A Table consists of one or more {@linkcode RecordBatch} objects plus a {@linkcode Schema} that
* each RecordBatch conforms to.
*/
export class Table {
  free(): void;
/**
* Export this Table to FFI structs according to the Arrow C Data Interface.
*
* This method **does not consume** the Table, so you must remember to call {@linkcode
* Table.free} to release the resources. The underlying arrays are reference counted, so
* this method does not copy data, it only prevents the data from being released.
* @returns {FFITable}
*/
  toFFI(): FFITable;
/**
* Export this Table to FFI structs according to the Arrow C Data Interface.
*
* This method **does consume** the Table, so the original Table will be
* inaccessible after this call. You must still call {@linkcode FFITable.free} after
* you've finished using the FFITable.
* @returns {FFITable}
*/
  intoFFI(): FFITable;
/**
* Consume this table and convert to an Arrow IPC Stream buffer
* @returns {Uint8Array}
*/
  intoIPCStream(): Uint8Array;
/**
* Create a table from an Arrow IPC Stream buffer
* @param {Uint8Array} buf
* @returns {Table}
*/
  static fromIPCStream(buf: Uint8Array): Table;
/**
* Returns the total number of bytes of memory occupied physically by all batches in this
* table.
* @returns {number}
*/
  getArrayMemorySize(): number;
/**
* The number of batches in the Table
*/
  readonly numBatches: number;
/**
* Access the Table's {@linkcode Schema}.
*/
  readonly schema: Schema;
}
/**
*/
export class WasmGetOptions {
  free(): void;
}
/**
*/
export class WasmObjectMeta {
/**
** Return copy of self without private attributes.
*/
  toJSON(): Object;
/**
* Return stringified version of self.
*/
  toString(): string;
  free(): void;
/**
* The unique identifier for the object
*
* <https://datatracker.ietf.org/doc/html/rfc9110#name-etag>
*/
  e_tag?: string;
/**
* The last modified time
*/
  last_modified: Date;
/**
* The full path to the object
*/
  location: string;
/**
* The size in bytes of the object
*/
  size: number;
/**
* A version indicator for this object
*/
  version?: string;
}
/**
*/
export class WasmObjectStore {
  free(): void;
/**
* @param {string} url
* @param {object | undefined} [options]
*/
  constructor(url: string, options?: object);
/**
* @param {string} location
* @param {WasmGetOptions | undefined} [options]
* @returns {Promise<ReadableStream>}
*/
  get(location: string, options?: WasmGetOptions): Promise<ReadableStream>;
/**
* @param {string | undefined} [prefix]
* @returns {Promise<ReadableStream>}
*/
  list(prefix?: string): Promise<ReadableStream>;
}
/**
* Immutable struct to hold writing configuration for `writeParquet`.
*
* Use {@linkcode WriterPropertiesBuilder} to create a configuration, then call {@linkcode
* WriterPropertiesBuilder.build} to create an instance of `WriterProperties`.
*/
export class WriterProperties {
  free(): void;
}
/**
* Builder to create a writing configuration for `writeParquet`
*
* Call {@linkcode build} on the finished builder to create an immputable {@linkcode WriterProperties} to pass to `writeParquet`
*/
export class WriterPropertiesBuilder {
  free(): void;
/**
* Returns default state of the builder.
*/
  constructor();
/**
* Finalizes the configuration and returns immutable writer properties struct.
* @returns {WriterProperties}
*/
  build(): WriterProperties;
/**
* Sets writer version.
* @param {WriterVersion} value
* @returns {WriterPropertiesBuilder}
*/
  setWriterVersion(value: WriterVersion): WriterPropertiesBuilder;
/**
* Sets data page size limit.
* @param {number} value
* @returns {WriterPropertiesBuilder}
*/
  setDataPageSizeLimit(value: number): WriterPropertiesBuilder;
/**
* Sets dictionary page size limit.
* @param {number} value
* @returns {WriterPropertiesBuilder}
*/
  setDictionaryPageSizeLimit(value: number): WriterPropertiesBuilder;
/**
* Sets write batch size.
* @param {number} value
* @returns {WriterPropertiesBuilder}
*/
  setWriteBatchSize(value: number): WriterPropertiesBuilder;
/**
* Sets maximum number of rows in a row group.
* @param {number} value
* @returns {WriterPropertiesBuilder}
*/
  setMaxRowGroupSize(value: number): WriterPropertiesBuilder;
/**
* Sets "created by" property.
* @param {string} value
* @returns {WriterPropertiesBuilder}
*/
  setCreatedBy(value: string): WriterPropertiesBuilder;
/**
* Sets "key_value_metadata" property.
* @param {KeyValueMetadata} value
* @returns {WriterPropertiesBuilder}
*/
  setKeyValueMetadata(value: KeyValueMetadata): WriterPropertiesBuilder;
/**
* Sets encoding for any column.
*
* If dictionary is not enabled, this is treated as a primary encoding for all
* columns. In case when dictionary is enabled for any column, this value is
* considered to be a fallback encoding for that column.
*
* Panics if user tries to set dictionary encoding here, regardless of dictionary
* encoding flag being set.
* @param {Encoding} value
* @returns {WriterPropertiesBuilder}
*/
  setEncoding(value: Encoding): WriterPropertiesBuilder;
/**
* Sets compression codec for any column.
* @param {Compression} value
* @returns {WriterPropertiesBuilder}
*/
  setCompression(value: Compression): WriterPropertiesBuilder;
/**
* Sets flag to enable/disable dictionary encoding for any column.
*
* Use this method to set dictionary encoding, instead of explicitly specifying
* encoding in `set_encoding` method.
* @param {boolean} value
* @returns {WriterPropertiesBuilder}
*/
  setDictionaryEnabled(value: boolean): WriterPropertiesBuilder;
/**
* Sets flag to enable/disable statistics for any column.
* @param {EnabledStatistics} value
* @returns {WriterPropertiesBuilder}
*/
  setStatisticsEnabled(value: EnabledStatistics): WriterPropertiesBuilder;
/**
* Sets max statistics size for any column.
* Applicable only if statistics are enabled.
* @param {number} value
* @returns {WriterPropertiesBuilder}
*/
  setMaxStatisticsSize(value: number): WriterPropertiesBuilder;
/**
* Sets encoding for a column.
* Takes precedence over globally defined settings.
*
* If dictionary is not enabled, this is treated as a primary encoding for this
* column. In case when dictionary is enabled for this column, either through
* global defaults or explicitly, this value is considered to be a fallback
* encoding for this column.
*
* Panics if user tries to set dictionary encoding here, regardless of dictionary
* encoding flag being set.
* @param {string} col
* @param {Encoding} value
* @returns {WriterPropertiesBuilder}
*/
  setColumnEncoding(col: string, value: Encoding): WriterPropertiesBuilder;
/**
* Sets compression codec for a column.
* Takes precedence over globally defined settings.
* @param {string} col
* @param {Compression} value
* @returns {WriterPropertiesBuilder}
*/
  setColumnCompression(col: string, value: Compression): WriterPropertiesBuilder;
/**
* Sets flag to enable/disable dictionary encoding for a column.
* Takes precedence over globally defined settings.
* @param {string} col
* @param {boolean} value
* @returns {WriterPropertiesBuilder}
*/
  setColumnDictionaryEnabled(col: string, value: boolean): WriterPropertiesBuilder;
/**
* Sets flag to enable/disable statistics for a column.
* Takes precedence over globally defined settings.
* @param {string} col
* @param {EnabledStatistics} value
* @returns {WriterPropertiesBuilder}
*/
  setColumnStatisticsEnabled(col: string, value: EnabledStatistics): WriterPropertiesBuilder;
/**
* Sets max size for statistics for a column.
* Takes precedence over globally defined settings.
* @param {string} col
* @param {number} value
* @returns {WriterPropertiesBuilder}
*/
  setColumnMaxStatisticsSize(col: string, value: number): WriterPropertiesBuilder;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_writerproperties_free: (a: number, b: number) => void;
  readonly __wbg_writerpropertiesbuilder_free: (a: number, b: number) => void;
  readonly writerpropertiesbuilder_new: () => number;
  readonly writerpropertiesbuilder_build: (a: number) => number;
  readonly writerpropertiesbuilder_setWriterVersion: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setDataPageSizeLimit: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setDictionaryPageSizeLimit: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setWriteBatchSize: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setMaxRowGroupSize: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setCreatedBy: (a: number, b: number, c: number) => number;
  readonly writerpropertiesbuilder_setKeyValueMetadata: (a: number, b: number, c: number) => void;
  readonly writerpropertiesbuilder_setEncoding: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setCompression: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setDictionaryEnabled: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setStatisticsEnabled: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setMaxStatisticsSize: (a: number, b: number) => number;
  readonly writerpropertiesbuilder_setColumnEncoding: (a: number, b: number, c: number, d: number) => number;
  readonly writerpropertiesbuilder_setColumnCompression: (a: number, b: number, c: number, d: number) => number;
  readonly writerpropertiesbuilder_setColumnDictionaryEnabled: (a: number, b: number, c: number, d: number) => number;
  readonly writerpropertiesbuilder_setColumnStatisticsEnabled: (a: number, b: number, c: number, d: number) => number;
  readonly writerpropertiesbuilder_setColumnMaxStatisticsSize: (a: number, b: number, c: number, d: number) => number;
  readonly __wbg_parquetmetadata_free: (a: number, b: number) => void;
  readonly parquetmetadata_fileMetadata: (a: number) => number;
  readonly parquetmetadata_numRowGroups: (a: number) => number;
  readonly parquetmetadata_rowGroup: (a: number, b: number) => number;
  readonly parquetmetadata_rowGroups: (a: number, b: number) => void;
  readonly __wbg_filemetadata_free: (a: number, b: number) => void;
  readonly filemetadata_version: (a: number) => number;
  readonly filemetadata_numRows: (a: number) => number;
  readonly filemetadata_createdBy: (a: number, b: number) => void;
  readonly filemetadata_keyValueMetadata: (a: number, b: number) => void;
  readonly __wbg_rowgroupmetadata_free: (a: number, b: number) => void;
  readonly rowgroupmetadata_numColumns: (a: number) => number;
  readonly rowgroupmetadata_column: (a: number, b: number) => number;
  readonly rowgroupmetadata_columns: (a: number, b: number) => void;
  readonly rowgroupmetadata_numRows: (a: number) => number;
  readonly rowgroupmetadata_totalByteSize: (a: number) => number;
  readonly rowgroupmetadata_compressedSize: (a: number) => number;
  readonly __wbg_columnchunkmetadata_free: (a: number, b: number) => void;
  readonly columnchunkmetadata_filePath: (a: number, b: number) => void;
  readonly columnchunkmetadata_fileOffset: (a: number) => number;
  readonly columnchunkmetadata_columnPath: (a: number, b: number) => void;
  readonly columnchunkmetadata_encodings: (a: number, b: number) => void;
  readonly columnchunkmetadata_numValues: (a: number) => number;
  readonly columnchunkmetadata_compression: (a: number) => number;
  readonly columnchunkmetadata_compressedSize: (a: number) => number;
  readonly columnchunkmetadata_uncompressedSize: (a: number) => number;
  readonly readParquet: (a: number, b: number, c: number, d: number) => void;
  readonly readSchema: (a: number, b: number, c: number) => void;
  readonly writeParquet: (a: number, b: number, c: number) => void;
  readonly readParquetStream: (a: number, b: number, c: number, d: number) => number;
  readonly transformParquetStream: (a: number, b: number) => number;
  readonly __wbg_parquetfile_free: (a: number, b: number) => void;
  readonly parquetfile_fromUrl: (a: number, b: number, c: number) => number;
  readonly parquetfile_fromFile: (a: number) => number;
  readonly parquetfile_metadata: (a: number, b: number) => void;
  readonly parquetfile_read: (a: number, b: number) => number;
  readonly parquetfile_stream: (a: number, b: number) => number;
  readonly __wbg_wasmgetoptions_free: (a: number, b: number) => void;
  readonly __wbg_wasmobjectmeta_free: (a: number, b: number) => void;
  readonly __wbg_get_wasmobjectmeta_location: (a: number, b: number) => void;
  readonly __wbg_set_wasmobjectmeta_location: (a: number, b: number, c: number) => void;
  readonly __wbg_get_wasmobjectmeta_last_modified: (a: number) => number;
  readonly __wbg_set_wasmobjectmeta_last_modified: (a: number, b: number) => void;
  readonly __wbg_get_wasmobjectmeta_size: (a: number) => number;
  readonly __wbg_set_wasmobjectmeta_size: (a: number, b: number) => void;
  readonly __wbg_get_wasmobjectmeta_e_tag: (a: number, b: number) => void;
  readonly __wbg_set_wasmobjectmeta_e_tag: (a: number, b: number, c: number) => void;
  readonly __wbg_get_wasmobjectmeta_version: (a: number, b: number) => void;
  readonly __wbg_set_wasmobjectmeta_version: (a: number, b: number, c: number) => void;
  readonly __wbg_wasmobjectstore_free: (a: number, b: number) => void;
  readonly wasmobjectstore_new: (a: number, b: number, c: number, d: number) => void;
  readonly wasmobjectstore_get: (a: number, b: number, c: number, d: number) => number;
  readonly wasmobjectstore_list: (a: number, b: number, c: number) => number;
  readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
  readonly intounderlyingsource_pull: (a: number, b: number) => number;
  readonly intounderlyingsource_cancel: (a: number) => void;
  readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
  readonly intounderlyingbytesource_type: (a: number, b: number) => void;
  readonly intounderlyingbytesource_autoAllocateChunkSize: (a: number) => number;
  readonly intounderlyingbytesource_start: (a: number, b: number) => void;
  readonly intounderlyingbytesource_pull: (a: number, b: number) => number;
  readonly intounderlyingbytesource_cancel: (a: number) => void;
  readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
  readonly intounderlyingsink_write: (a: number, b: number) => number;
  readonly intounderlyingsink_close: (a: number) => number;
  readonly intounderlyingsink_abort: (a: number, b: number) => number;
  readonly __wbg_ffitable_free: (a: number, b: number) => void;
  readonly ffitable_numBatches: (a: number) => number;
  readonly ffitable_schemaAddr: (a: number) => number;
  readonly ffitable_arrayAddr: (a: number, b: number) => number;
  readonly ffitable_arrayAddrs: (a: number, b: number) => void;
  readonly ffitable_drop: (a: number) => void;
  readonly __wbg_ffiarrowschema_free: (a: number, b: number) => void;
  readonly ffiarrowschema_addr: (a: number) => number;
  readonly __wbg_recordbatch_free: (a: number, b: number) => void;
  readonly recordbatch_numRows: (a: number) => number;
  readonly recordbatch_numColumns: (a: number) => number;
  readonly recordbatch_schema: (a: number) => number;
  readonly recordbatch_toFFI: (a: number, b: number) => void;
  readonly recordbatch_intoFFI: (a: number, b: number) => void;
  readonly recordbatch_intoIPCStream: (a: number, b: number) => void;
  readonly recordbatch_withSchema: (a: number, b: number, c: number) => void;
  readonly recordbatch_slice: (a: number, b: number, c: number) => number;
  readonly recordbatch_getArrayMemorySize: (a: number) => number;
  readonly wasmMemory: () => number;
  readonly _functionTable: () => number;
  readonly __wbg_ffiarrowarray_free: (a: number, b: number) => void;
  readonly ffiarrowarray_addr: (a: number) => number;
  readonly __wbg_ffidata_free: (a: number, b: number) => void;
  readonly ffidata_arrayAddr: (a: number) => number;
  readonly ffidata_schema_addr: (a: number) => number;
  readonly __wbg_ffirecordbatch_free: (a: number, b: number) => void;
  readonly ffirecordbatch_arrayAddr: (a: number) => number;
  readonly ffirecordbatch_schemaAddr: (a: number) => number;
  readonly __wbg_schema_free: (a: number, b: number) => void;
  readonly schema_toFFI: (a: number, b: number) => void;
  readonly schema_intoFFI: (a: number, b: number) => void;
  readonly schema_intoIPCStream: (a: number, b: number) => void;
  readonly schema_withMetadata: (a: number, b: number, c: number) => void;
  readonly schema_indexOf: (a: number, b: number, c: number, d: number) => void;
  readonly schema_metadata: (a: number, b: number) => void;
  readonly __wbg_ffivector_free: (a: number, b: number) => void;
  readonly ffivector_schemaAddr: (a: number) => number;
  readonly ffivector_arrayAddr: (a: number, b: number, c: number) => void;
  readonly __wbg_table_free: (a: number, b: number) => void;
  readonly table_schema: (a: number) => number;
  readonly table_numBatches: (a: number) => number;
  readonly table_toFFI: (a: number, b: number) => void;
  readonly table_intoFFI: (a: number, b: number) => void;
  readonly table_intoIPCStream: (a: number, b: number) => void;
  readonly table_fromIPCStream: (a: number, b: number, c: number) => void;
  readonly table_getArrayMemorySize: (a: number) => number;
  readonly rust_zstd_wasm_shim_qsort: (a: number, b: number, c: number, d: number) => void;
  readonly rust_zstd_wasm_shim_malloc: (a: number) => number;
  readonly rust_zstd_wasm_shim_memcmp: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_calloc: (a: number, b: number) => number;
  readonly rust_zstd_wasm_shim_free: (a: number) => void;
  readonly rust_zstd_wasm_shim_memcpy: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_memmove: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_memset: (a: number, b: number, c: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h70bd8612d162ac20: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__h75c5080acb3f06b3: (a: number, b: number, c: number, d: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
