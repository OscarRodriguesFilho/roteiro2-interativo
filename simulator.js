/* Trace of the Roteiro 2 grammar. BigInt preserves Python integer precision. */
(function (root) {
  function buildTrace(source) {
    const frames = [];
    let position = 0, token = null, result = null, operator = null;
    function emit(owner, title, detail, expectation, error = false) {
      frames.push({position, token: token && {...token}, result: result === null ? null : String(result), owner, title, detail, expectation, error});
    }
    function fail(owner, message) {
      emit(owner, `[${owner}] Entrada rejeitada`, message, 'Execução interrompida.', true);
      throw new Error('trace-stop');
    }
    function read() {
      const before = position;
      while (position < source.length && /\s/u.test(source[position])) position++;
      if (position > before) emit('Lexer', 'Pular espaços, preservar a separação', `position avançou de ${before} para ${position}. Ainda não há um novo token; a mesma chamada de select_next() continua.`, 'Aguardando o próximo token.');
      const start = position;
      if (position === source.length) token = {type:'EOF', value:'', start, end:position};
      else if (/[0-9]/.test(source[position])) {
        while (position < source.length && /[0-9]/.test(source[position])) position++;
        token = {type:'INT', value:BigInt(source.slice(start, position)).toString(), start, end:position};
      } else if (source[position] === '+' || source[position] === '-') {
        const value = source[position++];
        token = {type:value === '+' ? 'PLUS' : 'MINUS', value, start, end:position};
      } else fail('Lexer', `Símbolo ${JSON.stringify(source[position])} inválido na posição ${position}. Ele não pertence ao alfabeto desta linguagem.`);
      emit('Lexer', token.type === 'EOF' ? 'Fim da entrada: EOF disponível' : `Token ${token.type} disponível em next`, token.type === 'EOF' ? 'EOF tem value = "". O Parser ainda precisa conferir se esse fim é permitido aqui.' : `O Lexer leu ${JSON.stringify(source.slice(start, position))} e parou na posição ${position}. O Parser ainda não usou esse novo token.`, 'Inspecionar lexer.next sem avançar.');
    }
    emit('run()', 'Criar o Lexer', 'source guarda a expressão inteira, position começa em 0 e next começa como None.', 'Preparar o primeiro token.');
    try {
      emit('run()', 'Pedir o primeiro token', 'run() chama select_next() uma vez antes de entrar em parse_expression().', 'Aguardando o Lexer.');
      read();
      emit('Parser', 'Exigir o primeiro INT', 'parse_expression() olha next.type. Consultar o token não move position.', 'Esperado: INT.');
      if (token.type !== 'INT') fail('Parser', `Esperado INT no início; encontrado ${token.type}. Sinais unários ainda não são aceitos.`);
      result = BigInt(token.value);
      emit('Parser', 'Usar o primeiro número', `resultado recebe ${result}. Agora esse token foi usado; o próximo passo pede seu substituto.`, 'Chamar select_next().');
      read();
      while (token.type === 'PLUS' || token.type === 'MINUS') {
        operator = token.type;
        emit('Parser', 'Guardar o operador', `O Parser guarda ${JSON.stringify(token.value)} e chama select_next() para procurar o número seguinte.`, 'Depois do operador, esperado: INT.');
        read();
        emit('Parser', 'Conferir o número seguinte', 'Consultar next.type apenas verifica se a peça atende à gramática.', 'Esperado: INT.');
        if (token.type !== 'INT') fail('Parser', `Esperado INT depois do operador; encontrado ${token.type}.`);
        const before = result;
        result = operator === 'PLUS' ? result + BigInt(token.value) : result - BigInt(token.value);
        emit('Parser', 'Atualizar o resultado', `${before} ${operator === 'PLUS' ? '+' : '−'} ${token.value} = ${result}. O número foi usado. Agora o Parser pede o próximo token.`, 'Chamar select_next().');
        read();
      }
      emit('Parser', 'Sair de parse_expression()', `${token.type} não é PLUS nem MINUS. O laço termina e devolve ${result}; next continua guardando o token que sobrou.`, 'run() precisa conferir EOF.');
      if (token.type !== 'EOF') fail('Parser', `Esperado EOF; encontrado ${token.type}. A conta parcial deu ${result}, mas sobrou um token: a entrada inteira é inválida.`);
      emit('run()', 'Expressão aceita', `run() confirmou EOF e devolveu ${result}. Nenhum token ficou sobrando.`, 'Concluído.');
    } catch (error) { if (error.message !== 'trace-stop') throw error; }
    return frames;
  }
  root.buildTrace = buildTrace;
  if (typeof module !== 'undefined') module.exports = {buildTrace};
})(typeof window === 'undefined' ? globalThis : window);
