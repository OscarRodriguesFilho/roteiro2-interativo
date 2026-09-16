let runtime;
self.onmessage = async ({data}) => {
  try {
    if (!runtime) {
      self.postMessage({status:'Carregando Python no navegador… Na primeira vez, pode levar alguns segundos.'});
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.2/full/pyodide.js');
      runtime = await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.29.2/full/'});
      const response = await fetch('trace_runner.py');
      if (!response.ok) throw Error('Não foi possível carregar o registrador de passos.');
      runtime.runPython(await response.text());
    }
    self.postMessage({status:'Executando e registrando as linhas do Python…'});
    runtime.globals.set('debug_code', data.code);
    runtime.globals.set('debug_expression', data.expression);
    const result = runtime.runPython('json.dumps(record_execution(debug_code, debug_expression))');
    self.postMessage({result:JSON.parse(result)});
  } catch (error) { self.postMessage({error:String(error.message || error)}); }
};
