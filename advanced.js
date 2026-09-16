(() => {
  const mode = document.body.dataset.course;
  const ast = mode !== '3', program = mode === '5';
  const entries = [
    ['Token','CLASSE','Uma peça reconhecida, com type (categoria) e value (conteúdo).','Permite ao Parser trabalhar com números e símbolos, não caracteres isolados.'],
    ['Token.__init__(type, value)','CONSTRUTOR','Inicializa type e value.','Entrega um token pronto ao Lexer.'],
    ['Lexer','CLASSE','Mantém source, position e next. SYMBOLS relaciona símbolos às categorias.','Fornece um token por vez; não decide precedência nem calcula.'],
    ['Lexer.__init__(source)','CONSTRUTOR','Guarda o texto, zera position e inicia next como None.','Prepara o estado da leitura sem consumir o primeiro token.'],
    ['Lexer.select_next()','MÉTODO',program?'Pula espaços horizontais, reconhece INT, IDEN, PRINT, operadores, ASSIGN e END; no fim gera EOF.':'Pula espaços e reconhece INT, PLUS, MINUS, MULT, DIV, OPEN_PAR, CLOSE_PAR ou EOF.','Atualiza next e avança position. Um símbolo desconhecido gera erro [Lexer].'],
    ['Parser','CLASSE',ast?'Valida os tokens e constrói uma AST. Não calcula o resultado.':'Valida os tokens e calcula resultados locais durante a análise.','Implementa a gramática por descida recursiva; lexer é o atributo de classe com a leitura atual.'],
    ['Parser.parse_expression()','MÉTODO ESTÁTICO',ast?'Obtém um termo e cria BinOp para cada + ou − e seu termo direito.':'Obtém um termo e acumula somas/subtrações com os próximos termos.','Operadores deste nível têm menor precedência. O laço constrói associatividade à esquerda.'],
    ['Parser.parse_term()','NOVO NO 3',ast?'Obtém fatores e os liga em BinOp para * e /.':'Obtém fatores e acumula multiplicações e divisões inteiras.','Consome um termo inteiro antes de devolver o controle à expressão.'],
    ['Parser.parse_factor()','NOVO NO 3',ast?'Cria IntVal, UnOp ou devolve uma subárvore entre parênteses.'+(program?' Para IDEN cria Identifier.':''):'Lê INT, aplica um sinal unário recursivo ou analisa uma expressão entre parênteses.','É o nível mais interno. Sinais podem se repetir; um parêntese aberto exige fechamento.'],
    ['Parser.run(code)','MÉTODO ESTÁTICO','Cria o Lexer, prepara o primeiro token, chama '+(program?'parse_program()':'parse_expression()')+' e verifica EOF.','Devolve '+(ast?'a raiz da AST':'o inteiro calculado')+' somente se toda a entrada for válida.'],
    ['main()','FUNÇÃO',program?'Lê o arquivo indicado em argv, adiciona a quebra final, filtra comentários, monta a AST, cria a tabela e avalia a raiz.':ast?'Recebe a expressão, chama Parser.run() e imprime root.evaluate().':'Recebe a expressão de argv e imprime o número devolvido por Parser.run().','Conecta a entrada do terminal ao interpretador. No navegador, o depurador prepara os mesmos argumentos.']
  ];
  if(ast) entries.push(
    ['Node','NOVA NO 4 · CLASSE ABSTRATA','Contrato comum: value, children e evaluate('+ (program?'st':'')+').','Permite usar qualquer nó pela mesma interface. Não pode ser instanciada diretamente.'],
    ['Node.__init__(value, children)','CONSTRUTOR HERDADO','Guarda o conteúdo e a lista de filhos. Todos os nós concretos herdam este construtor.','Evita repetir a estrutura em cada classe. Não faz operações matemáticas.'],
    ['Node.evaluate('+ (program?'st':'')+')','MÉTODO ABSTRATO','Exige uma implementação nas classes concretas.','Define a interface polimórfica; não antecipa o comportamento de um filho.'],
    ['IntVal','CLASSE · 0 FILHOS','Representa um literal inteiro; value contém o número.','É uma folha da AST. Herda Node.__init__.'],
    ['IntVal.evaluate('+ (program?'st':'')+')','MÉTODO','Retorna self.value.','Produz o valor de um literal sem avaliar filhos.'],
    ['UnOp','CLASSE · 1 FILHO','Representa + ou − unário; value guarda o operador.','Distingue um sinal aplicado a um operando de uma operação com dois operandos.'],
    ['UnOp.evaluate('+ (program?'st':'')+')','MÉTODO','Avalia children[0] e aplica seu próprio sinal.','Cuida somente da operação deste nó; operador inválido gera [Semantic].'],
    ['BinOp','CLASSE · 2 FILHOS','Representa +, −, * ou /. children[0] é a esquerda; children[1], a direita.','Preserva estrutura, precedência e ordem dos operandos.'],
    ['BinOp.evaluate('+ (program?'st':'')+')','MÉTODO','Avalia os dois filhos, na ordem, e aplica seu operador. Divisão usa //; zero é rejeitado.','Executa a semântica separadamente do Parser. Erros têm prefixo [Semantic].']
  );
  if(program) entries.push(
    ['PrePro','NOVA NO 5 · CLASSE','Agrupa o pré-processamento. O enunciado também usa a grafia Prepro.','Remove comentários antes de entregar o texto ao Lexer.'],
    ['PrePro.filter(code)','MÉTODO ESTÁTICO','Remove // e tudo até a próxima quebra de linha, preservando a quebra.','Impede que comentários virem tokens sem juntar instruções de linhas diferentes.'],
    ['Variable','CLASSE','Wrapper de dados com o atributo value.','Deixa espaço para metadados futuros, como tipo, sem implementá-los nesta etapa.'],
    ['Variable.__init__(value)','CONSTRUTOR','Guarda o valor inteiro recebido.','Cria o registro que será armazenado na tabela.'],
    ['SymbolTable','CLASSE','Contém table: dicionário nome → Variable.','Mantém o estado compartilhado entre todas as instruções da execução.'],
    ['SymbolTable.__init__()','CONSTRUTOR','Cria self.table vazio.','Garante que cada programa comece sem variáveis de execuções anteriores.'],
    ['SymbolTable.get(name)','GETTER','Busca o nome e devolve Variable.value; rejeita nome ausente com [Semantic].','É a operação de leitura da tabela usada por Identifier.'],
    ['SymbolTable.set(name, value)','SETTER','Cria ou atualiza table[name] com Variable(value).','É a operação de escrita usada por Assignment. get/set são os acessores desta versão didática.'],
    ['Identifier','CLASSE · 0 FILHOS','Guarda o nome da variável em value, não seu valor numérico.','Representa uma referência que só será resolvida durante a execução.'],
    ['Identifier.evaluate(st)','MÉTODO','Retorna st.get(self.value).','Busca o valor atualizado, inclusive após reatribuições.'],
    ['Assignment','CLASSE · 2 FILHOS','Filho 0: Identifier de destino. Filho 1: expressão a atribuir.','Representa uma instrução de escrita, não um BinOp.'],
    ['Assignment.evaluate(st)','MÉTODO','Avalia apenas o filho direito e grava em st usando o nome do esquerdo.','Permite criar x em x = 3 sem tentar ler x antes de existir. Não retorna valor.'],
    ['Print','CLASSE · 1 FILHO','Representa Println(expressão).','Marca uma instrução de saída, não uma expressão que produz valor.'],
    ['Print.evaluate(st)','MÉTODO','Avalia seu filho com a tabela e imprime o resultado.','Produz saída; retorna implicitamente None.'],
    ['Block','CLASSE · N FILHOS','Raiz que contém as instruções na ordem do arquivo.','Mostra por que uma AST não é necessariamente binária.'],
    ['Block.evaluate(st)','MÉTODO','Percorre os filhos e chama evaluate(st) em cada um.','Compartilha a mesma tabela, preservando a ordem das atribuições e impressões.'],
    ['NoOp','CLASSE · 0 FILHOS','Representa uma instrução vazia.','Oferece um nó concreto para a linha vazia, sem instanciar a Node abstrata.'],
    ['NoOp.evaluate(st)','MÉTODO','Não faz nada; retorna implicitamente None.','Permite percorrer linhas vazias pelo mesmo contrato dos demais nós.'],
    ['Parser.expect(kind)','AUXILIAR DESTA VERSÃO','Exige o tipo indicado e avança um token; senão lança [Parser].','Centraliza verificações de ASSIGN, parênteses e END. Não é um método novo exigido nominalmente pelo enunciado.'],
    ['Parser.parse_program()','NOVO NO 5','Repete parse_statement() até EOF e reúne os nós em Block.','É o novo início da análise. Aqui, ao contrário de parse_expression(), o laço até EOF faz sentido.'],
    ['Parser.parse_statement()','NOVO NO 5','Escolhe Assignment, Print ou NoOp e exige END ao final.','Separa instruções de expressões e valida os parênteses de Println.']
  );
  if(!program) entries.push(
    ['LACUNA(numero, descricao)','APOIO LOCAL · REMOVIDO','Marca uma implementação pendente com NotImplementedError.','Serve ao exercício de preencher lacunas, não à linguagem.'],
    ['_aberta(funcao, rotulo=None)','APOIO LOCAL · REMOVIDO','Inspeciona o texto da função em busca de LACUNA.','Ajuda a checklist, mas não prova correção.'],
    ['checklist()','APOIO LOCAL · REMOVIDO','Lista implementações pendentes.','Acompanha o preenchimento do material local.'],
    ['autoteste()','APOIO LOCAL · REMOVIDO','Compara saídas e rejeições com os casos de teste.','Verifica o comportamento; não participa da interpretação.']
  );
  if(mode==='4') entries.push(
    ['desenhar(no, nivel=0)','APOIO LOCAL · REMOVIDO','Percorre a árvore e imprime nós com recuo por profundidade.','Ajuda a inspecionar a AST. O site usa um visualizador separado, sem modificar o Python.'],
    ['forma(no)','APOIO LOCAL · REMOVIDO','Converte a estrutura em uma representação usada pelos testes.','Verifica a forma da árvore, e não apenas o resultado aritmético.']
  );
  window.ROTEIRO_GUIDE = {mode, codeFile:'roteiro'+mode+'-enxuto.py', entries};

  const explanations = {
    expression:['EXPRESSION → TERM → FACTOR','EXPRESSION delega os operandos a TERM. Enquanto TERM estiver resolvendo 2 * 3, a soma de 1 + 2 * 3 espera. Assim o resultado é 7, não 9.','parse_expression() → parse_term() → parse_factor()'],
    term:['TERM agrupa multiplicações e divisões','O laço de TERM aceita apenas * e /. Ao encontrar +, −, ) ou fim, devolve seu resultado/subárvore sem consumir esse token.','TERM = FACTOR, { ("*" | "/"), FACTOR } ;'],
    factor:['FACTOR pode chamar EXPRESSION de novo','Um inteiro encerra a descida. Um sinal chama outro FACTOR. Um "(" chama EXPRESSION e exige ")": cada chamada possui seus próprios locais.','FACTOR = NUMBER | ("+" | "-"), FACTOR | "(", EXPRESSION, ")"'+(program?' | IDENTIFIER':'')+' ;'],
    program:['PROGRAM contém instruções','No roteiro 5, PROGRAM chama STATEMENT até EOF. Cada instrução termina em END (quebra de linha); o Block reúne os nós na ordem.','PROGRAM = { STATEMENT } ;'],
    statement:['STATEMENT escolhe a ação','IDEN começa uma atribuição; PRINT começa Println; END sozinho gera NoOp. A expressão à direita continua usando os três níveis anteriores.','STATEMENT = ( ε | ASSIGNMENT | PRINT ), END ;']
  };
  document.querySelectorAll('[data-grammar]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-grammar]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    const [title,text,code]=explanations[button.dataset.grammar];
    document.getElementById('grammar-title').textContent=title;
    document.getElementById('grammar-text').textContent=text;
    document.getElementById('grammar-code').textContent=code;
  }));
  document.querySelector('[data-grammar]')?.click();
  document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{
    document.getElementById('quiz-feedback').textContent=button.dataset.answer==='right'?document.getElementById('quiz-feedback').dataset.correct:'Ainda não. '+document.getElementById('quiz-feedback').dataset.hint;
    document.querySelectorAll('[data-answer]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  }));
  window.renderCourseFrame = (frame, prev) => {
    if(!ast) return;
    document.getElementById('ast-phase').textContent=frame.phase;
    const box=document.getElementById('ast-tree'); box.replaceChildren();
    const nodes=new Map((frame.tree||[]).map(n=>[n.id,n]));
    const children=new Set([...nodes.values()].flatMap(n=>n.children));
    function draw(node, seen=new Set()){
      const li=document.createElement('li');
      const label=document.createElement('span');label.className='ast-node';
      label.textContent=node.kind+(node.value!=='None'?' '+node.value:'')+(node.result!=null?' → '+node.result:'');
      if(node.id===frame.active_node){label.classList.add('active');label.setAttribute('aria-current','step');}
      if(node.result!=null)label.classList.add('evaluated');
      li.append(label);
      if(seen.has(node.id))return li;
      const next=new Set(seen);next.add(node.id);
      if(node.children.length){
        const ul=document.createElement('ul');
        node.children.forEach(id=>{if(nodes.has(id))ul.append(draw(nodes.get(id),next));});
        li.append(ul);
      }
      return li;
    }
    const roots=[...nodes.values()].filter(n=>!children.has(n.id));
    if(!roots.length)box.textContent='A árvore ainda não começou.';
    else {const ul=document.createElement('ul');roots.forEach(n=>ul.append(draw(n)));box.append(ul);}
    if(program){
      const table=document.getElementById('symbol-values');table.replaceChildren();
      for(const [name,value] of Object.entries(frame.symbols||{})){
        const dt=document.createElement('dt'),dd=document.createElement('dd');
        dt.textContent=name;dd.textContent=value;
        if(prev?.symbols?.[name]!==value)dd.className='changed';
        table.append(dt,dd);
      }
      if(!Object.keys(frame.symbols||{}).length)table.textContent='Tabela vazia.';
      document.getElementById('filtered-source').textContent=frame.source??'O Lexer ainda não foi criado. A entrada original está acima.';
    }
  };
})();
