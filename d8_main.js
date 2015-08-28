load("d8_common.js");

function compile(filename) {
  var status = new base.Status(function(message) {
    print(message);
  });
  var parser = base.createParser(sources.grammar, status);

  var text = read(filename);

  var module = base.frontend(sources.systemWASM, filename, text, parser, status);
  if (status.num_errors > 0) {
    return null;
  }

  module = desugar.process(module);

  var config = {
    use_shared_memory: typeof SharedArrayBuffer !== 'undefined',
  };

  var src = base.astToJSSrc(module, sources.systemPreJS, sources.systemPostJS, config);
  var compiled = base.evalJSSrc(src, status);
  if (status.num_errors > 0) {
    return null;
  }
  print(src);

  var workerParam = null;
  if (config.use_shared_memory) {
    workerParam = src;
  }

  var instanceJS = compiled(foreign, workerParam);
  print("JS result:", instanceJS.main());

  if (false) {
    // Generate binary encoding
    var buffer = wasm_backend_v8.generate(module);
    print("bytes:", new Uint8Array(buffer));
    print("num bytes:", buffer.byteLength);
    print();

    // Instantiate
    var foreign = {
      sinF32: function(value) {
        return Math.fround(Math.sin(value));
      },
      printI32: function(value) {
        print("print", value);
      },
      flipBuffer: function(ptr) {
        print("flip", ptr);
      },
    };
    var instanceV8 = WASM.instantiateModule(buffer, foreign);
    print("V8 result:", instanceV8.main());
  }
}

if (arguments.length != 1) {
  print("Usage: d8 d8_main.js -- file.wasm");
  // TODO exit code.
} else {
  var filename = arguments[0];
  compile(filename);
}
