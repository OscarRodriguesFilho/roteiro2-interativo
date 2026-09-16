window.ROTEIRO_GUIDE = {
  mode:'1',codeFile:'roteiro1-enxuto.py',
  entries:[
    ['tokenizar(codigo)','FUNÇÃO · TEXTO → LISTA','Percorre a string inteira, junta dígitos e cria tuplas INT, PLUS e MINUS. Acrescenta EOF uma vez no final.','Descobrir quais peças existem antes de verificar sua ordem. Um símbolo desconhecido causa erro léxico.'],
    ['avaliar(tokens)','FUNÇÃO · LISTA → INTEIRO','Exige um INT inicial, consome pares operador + INT, calcula da esquerda para a direita e verifica EOF.','Validar a estrutura da expressão. Só devolve o resultado se a lista toda formar uma expressão válida.'],
    ['executar(codigo)','FUNÇÃO · COORDENAÇÃO','Chama tokenizar(codigo), espera a lista completa e a entrega a avaliar(tokens).','Conectar as duas fases e oferecer uma chamada única para o restante do programa.'],
    ['main()','FUNÇÃO · ENTRADA E SAÍDA','Lê a expressão de sys.argv[1], chama executar() e imprime o inteiro devolvido.','Fazer a ponte entre o terminal e as funções. As exceções podem sair sem serem escondidas.'],
    ['LACUNA(numero, descricao)','APOIO · roteiro1.py','Lança NotImplementedError para indicar uma parte não preenchida do exercício.','Marcar tarefas pendentes. Não existe na versão preenchida do depurador.'],
    ['_aberta(funcao, rotulo=None)','APOIO · roteiro1.py','Lê o código da função com inspect.getsource() e procura a chamada de LACUNA.','Detectar lacunas textualmente, sem garantir que a solução esteja correta.'],
    ['checklist()','APOIO · roteiro1.py','Imprime a situação das lacunas e devolve a quantidade pendente.','Acompanhar o progresso do preenchimento do material local.'],
    ['autoteste()','APOIO · roteiro1.py','Executa a checklist e compara resultados e rejeições com CASOS_OK e CASOS_ERRO.','Encontrar falhas de implementação. Os try/except pertencem à bateria de testes.'],
    ['testar()','APOIO · roteiro1-r.py','Executa a bateria de exemplos da solução de referência, contando acertos e erros.','Validar a referência local. Não faz parte do caminho de execução de uma expressão.']
  ],
  diagramSteps:[
    {title:'O primeiro token precisa ser INT',text:'A entrada da regra passa por um número. avaliar() olha o tipo na posição zero e copia o valor para resultado. A lista já foi criada por tokenizar().',code:'if tokens[posicao][0] != "INT":\n    raise Exception("[Parser] Esperado INT")\nresultado = tokens[posicao][1]\nposicao += 1',parts:['entry','int']},
    {title:'Escolher uma nova operação',text:'O desvio para + ou − corresponde ao while. O tipo do operador fica guardado, e o índice passa ao próximo token da lista.',code:'while tokens[posicao][0] in ("PLUS", "MINUS"):\n    operador = tokens[posicao][0]\n    posicao += 1',parts:['loop','plus','minus']},
    {title:'Voltar pelo número obrigatório',text:'Depois de cada operador, é preciso ler um INT. A conta é atualizada antes de avançar novamente. Cada volta consome um operador e um número.',code:'if tokens[posicao][0] != "INT":\n    raise Exception("[Parser] Esperado INT")\n# Somar ou subtrair tokens[posicao][1].\nposicao += 1',parts:['back','int']},
    {title:'Só terminar se não sobrou nada',text:'Quando o próximo token não é operador, avaliar() sai do laço. Aqui, a mesma função exige EOF antes de devolver a conta. Assim, 1 1 não é aceito como apenas o primeiro número.',code:'if tokens[posicao][0] != "EOF":\n    raise Exception("[Parser] Esperado EOF")\nreturn resultado',parts:['exit']}
  ]
};

document.addEventListener('DOMContentLoaded',()=>{
  const el=id=>document.getElementById(id);
  let pieces=null;
  function tokenize(){
    const code=el('batch-input').value;
    pieces=[];let i=0;
    el('batch-result').textContent='A avaliação ainda não começou.';
    try{
      while(i<code.length){
        const c=code[i];
        if(/\s/u.test(c)){i++;continue;}
        if(c==='+'||c==='-'){pieces.push([c==='+'?'PLUS':'MINUS',c]);i++;continue;}
        if(/[0-9]/.test(c)){let n='';while(i<code.length&&/[0-9]/.test(code[i]))n+=code[i++];pieces.push(['INT',BigInt(n).toString()]);continue;}
        throw Error(`Símbolo ${JSON.stringify(c)} não reconhecido na posição ${i}.`);
      }
      pieces.push(['EOF','']);
      el('batch-message').textContent='Lista completa. Agora avaliar() pode verificar a ordem e fazer a conta.';
      el('batch-evaluate').disabled=false;
    }catch(error){pieces=null;el('batch-message').textContent='[Lexer] '+error.message;el('batch-evaluate').disabled=true;}
    el('batch-tokens').replaceChildren();
    for(const [index,token] of (pieces||[]).entries()){
      const chip=document.createElement('span');chip.className='batch-token';chip.textContent=`${index}: (${token[0]}, ${token[0]==='INT'?token[1]:JSON.stringify(token[1])})`;el('batch-tokens').append(chip);
    }
  }
  function evaluate(){
    if(!pieces)return;
    try{
      let i=0;
      function requireInt(){if(pieces[i][0]!=='INT')throw Error(`Esperado INT, encontrado ${pieces[i][0]}.`);return BigInt(pieces[i][1]);}
      let result=requireInt();i++;
      while(['PLUS','MINUS'].includes(pieces[i][0])){const op=pieces[i++][0];const n=requireInt();result=op==='PLUS'?result+n:result-n;i++;}
      if(pieces[i][0]!=='EOF')throw Error(`Esperado EOF, encontrado ${pieces[i][0]}. Sobrou um token.`);
      el('batch-result').textContent=`Expressão válida. Resultado: ${result}`;
    }catch(error){el('batch-result').textContent='[Parser] '+error.message;}
  }
  el('batch-form').addEventListener('submit',event=>{event.preventDefault();tokenize();});
  el('batch-input').addEventListener('input',()=>{pieces=null;el('batch-evaluate').disabled=true;el('batch-tokens').replaceChildren();el('batch-message').textContent='Entrada alterada. Tokenize novamente.';el('batch-result').textContent='';});
  el('batch-evaluate').addEventListener('click',evaluate);
  document.querySelectorAll('[data-batch-example]').forEach(button=>button.addEventListener('click',()=>{el('batch-input').value=button.dataset.batchExample;tokenize();}));
  document.querySelectorAll('[data-r1-answer]').forEach(button=>button.addEventListener('click',()=>{
    el('r1-quiz-feedback').textContent=button.dataset.r1Answer==='right'?'Isso! O tokenizador reconhece dois INT; avaliar() rejeita o segundo porque falta um operador.':'Observe a separação de responsabilidades: os dois números são tokens reconhecíveis. O problema está na ordem deles.';
  }));
  tokenize();
});
