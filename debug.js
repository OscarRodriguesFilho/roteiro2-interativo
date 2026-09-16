(() => {
  const el = id => document.getElementById(id);
  const entries = [
    ['Token', 'CLASSE', 'Representa uma unidade léxica: INT, PLUS, MINUS ou EOF. Guarda type e value.', 'Separa a categoria gramatical do conteúdo concreto. O Parser pode reconhecer INT sem conhecer antecipadamente seu valor.'],
    ['Token.__init__(type, value)', 'MÉTODO CONSTRUTOR', 'Recebe categoria e valor e os atribui a self.type e self.value.', 'Inicializa cada token criado pelo Lexer. Não percorre caracteres nem calcula expressões.'],
    ['Lexer', 'CLASSE', 'Mantém source, position e next entre os pedidos de tokens.', 'Transforma caracteres em peças reconhecíveis, sob demanda, sem montar uma lista completa.'],
    ['Lexer.__init__(source)', 'MÉTODO CONSTRUTOR', 'Guarda a string, começa position em zero e next em None.', 'Prepara um cursor independente para a entrada. A primeira leitura só ocorre em select_next().'],
    ['Lexer.select_next()', 'MÉTODO DE INSTÂNCIA', 'Pula espaços, lê um inteiro ou operador e substitui self.next por um Token. No fim prepara EOF; símbolo desconhecido gera [Lexer].', 'Entrega exatamente um token por chamada. O laço de dígitos junta vários caracteres; o laço de espaços não gera tokens.'],
    ['Parser', 'CLASSE', 'Agrupa a análise sintática e a avaliação. Seu atributo de classe lexer guarda o Lexer atual.', 'Decide se a ordem dos tokens é válida e coordena os pedidos ao Lexer.'],
    ['Parser.parse_expression()', 'MÉTODO ESTÁTICO', 'Exige INT inicial, acumula o resultado e repete operador + INT enquanto next for PLUS ou MINUS.', 'Traduz a gramática EXPRESSION em código. Devolve um inteiro e deixa next no primeiro token não usado.'],
    ['Parser.run(code)', 'MÉTODO ESTÁTICO', 'Cria Lexer(code), prepara o primeiro token, chama parse_expression(), exige EOF e devolve o resultado.', 'É o ponto de entrada da análise. Impede que uma conta parcial, como o primeiro 1 de “1 1”, seja aceita como entrada completa.'],
    ['main()', 'FUNÇÃO DE ENTRADA', 'Exige um argumento em sys.argv e imprime Parser.run(sys.argv[1]).', 'Conecta a linha de comando ao analisador. O resultado vai para a saída; exceções não são escondidas.'],
    ['LACUNA(numero, descricao)', 'APOIO DIDÁTICO', 'Lança NotImplementedError identificando uma parte ainda não implementada.', 'Marca exercícios pendentes no roteiro original. Foi removida da versão preenchida do depurador.'],
    ['_aberta(funcao, rotulo=None)', 'APOIO DIDÁTICO', 'Usa inspect.getsource() para procurar uma chamada de LACUNA no texto da função.', 'Ajuda a checklist a detectar lacunas. Não prova que a implementação está correta.'],
    ['checklist()', 'APOIO DIDÁTICO', 'Percorre LACUNAS, imprime quais estão abertas e devolve quantas faltam.', 'Mostra o progresso do exercício. Não participa da análise de uma expressão.'],
    ['autoteste()', 'APOIO DIDÁTICO', 'Executa a checklist e testa Parser.run() com CASOS_OK e CASOS_ERRO; informa acertos, falhas e pendências.', 'Compara resultados esperados e verifica rejeições. Os try/except aqui servem ao teste; não pertencem a main().'],
  ];
  function glossary() {
    const query = el('glossary-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const matches = entries.filter(entry => entry.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
    el('glossary-list').replaceChildren();
    for (const [name, category, what, why] of matches) {
      const article = document.createElement('article'); article.className = 'glossary-card';
      for (const [tag, text, cls] of [['small',category],['h3',name],['p',what],['p','Propósito: ' + why,'purpose']]) {
        const node = document.createElement(tag); node.textContent = text; if (cls) node.className = cls; article.append(node);
      }
      el('glossary-list').append(article);
    }
    el('glossary-count').textContent = `${matches.length} de ${entries.length} verbetes${matches.length ? '' : ' — tente outro termo'}.`;
  }
  el('glossary-search').addEventListener('input', glossary); glossary();

  let defaultCode = '', executionCode = '', input = '', trace = [], index = 0, outcome = null;
  let worker = null, interval = null, deadline = null, busy = false;
  function sizePlayer() {
    if (el('debug-player').classList.contains('is-floating'))
      document.body.style.setProperty('--floating-player-height',`${el('debug-player').offsetHeight}px`);
  }
  new ResizeObserver(sizePlayer).observe(el('debug-player'));
  function floatPlayer() {
    const player = el('debug-player');
    if (player.classList.contains('is-floating')) return;
    const before = player.getBoundingClientRect();
    el('debug-player-slot').style.height = `${before.height}px`;
    player.classList.add('is-floating');
    document.body.classList.add('has-floating-player');
    sizePlayer();
    const after = player.getBoundingClientRect();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const dx = (before.left + before.right - after.left - after.right) / 2;
      const dy = (before.top + before.bottom - after.top - after.bottom) / 2;
      player.animate([
        {transform:`translate(calc(-50% + ${dx}px), ${dy}px) scale(${before.width/after.width}, ${before.height/after.height})`,opacity:.7},
        {transform:'translateX(-50%)',opacity:1}
      ],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
  }
  const playbackIds = ['debug-reset','debug-prev','debug-play','debug-next','debug-timeline'];
  const events = {call:'ENTRADA NO MÉTODO',line:'ANTES DE EXECUTAR A LINHA',return:'RETORNO DO MÉTODO',exception:'EXCEÇÃO'};
  function status(message, failed = false) { el('debug-status').textContent = message; el('debug-status').classList.toggle('failed',failed); }
  function pause() { clearInterval(interval); interval = null; el('debug-play').textContent = '▶ Animar'; }
  function setBusy(value) {
    busy = value; el('debug-build').disabled = value; el('debug-cancel').hidden = !value;
    el('debug-input').disabled = value; el('python-editor').disabled = value; el('debug-restore').disabled = value;
    document.querySelectorAll('[data-debug-example]').forEach(b => b.disabled = value);
    for (const id of playbackIds) el(id).disabled = value || !trace.length;
  }
  function drawCode(code) {
    el('debug-code').replaceChildren();
    code.split('\n').forEach((text, i) => {
      const row = document.createElement('div'); row.className = 'code-line'; row.dataset.line = i + 1;
      const number = document.createElement('span'); number.className = 'code-number'; number.textContent = i + 1;
      const content = document.createElement('span'); content.className = 'code-text';
      const split = text.indexOf('  # ');
      content.textContent = split < 0 ? text : text.slice(0,split);
      if (split >= 0) { const comment = document.createElement('span'); comment.className = 'code-comment'; comment.textContent = text.slice(split); content.append(comment); }
      row.append(number,content); el('debug-code').append(row);
    });
  }
  function show() {
    if (!trace.length) return;
    const frame = trace[index], prev = index ? trace[index-1] : null;
    el('debug-code').querySelector('.active')?.classList.remove('active');
    const row = el('debug-code').querySelector(`[data-line="${frame.line}"]`);
    if (row) {
      row.classList.add('active');
      const pane = el('debug-code');
      if (row.offsetTop < pane.scrollTop || row.offsetTop + row.offsetHeight > pane.scrollTop + pane.clientHeight)
        pane.scrollTop = Math.max(0,row.offsetTop - pane.clientHeight / 3);
    }
    el('debug-line-label').textContent = `LINHA ${frame.line}`;
    el('debug-event').textContent = events[frame.event];
    el('debug-action-title').textContent = `${frame.method} · linha ${frame.line}`;
    el('debug-action-text').textContent = frame.action;
    el('debug-event').parentElement.classList.toggle('error',frame.event === 'exception');
    el('debug-position').textContent = `position = ${frame.position ?? '—'}`;
    const source = el('debug-source'); source.replaceChildren();
    // Python indexes Unicode code points, so the visual cursor does too.
    const chars = Array.from(input);
    for (let i=0; i<=chars.length; i++) {
      const cell = document.createElement('span');
      cell.className = 'char' + (i === chars.length ? ' eof' : '') + (frame.position !== null && i < frame.position ? ' read' : '') + (i === frame.position ? ' cursor' : '');
      cell.textContent = i === chars.length ? 'fim' : /\s/u.test(chars[i]) ? '·' : chars[i];
      cell.title = `Posição ${i}`; source.append(cell);
    }
    const cursor = source.querySelector('.cursor'); if (cursor) source.scrollLeft = Math.max(0,cursor.offsetLeft-source.clientWidth/2);
    const tokenText = f => f?.token ? `Token(${JSON.stringify(f.token.type)}, ${f.token.value})` : 'None';
    el('debug-token').textContent = tokenText(frame);
    el('debug-token').parentElement.classList.toggle('changed',!!prev && tokenText(frame)!==tokenText(prev));
    el('debug-locals').replaceChildren();
    const sameMethod = prev?.method === frame.method && prev?.stack.join('/') === frame.stack.join('/');
    for (const [key,value] of Object.entries(frame.locals)) {
      const term = document.createElement('dt'), definition = document.createElement('dd');
      term.textContent = key; definition.textContent = value;
      if (sameMethod && value !== prev.locals[key]) definition.classList.add('changed');
      el('debug-locals').append(term,definition);
    }
    const changes = [];
    if (prev && frame.position !== prev.position) changes.push(`position: ${prev.position ?? 'None'} → ${frame.position ?? 'None'}`);
    if (prev && tokenText(frame)!==tokenText(prev)) changes.push(`next: ${tokenText(prev)} → ${tokenText(frame)}`);
    if (sameMethod) for (const [key,value] of Object.entries(frame.locals)) if(value !== prev.locals[key]) changes.push(`${key}: ${prev.locals[key] ?? 'não definido'} → ${value}`);
    el('debug-changes').textContent = changes.length ? 'Desde o passo anterior: ' + changes.join(' · ') : 'Nenhuma mudança de valores observada neste passo.';
    el('debug-stack').replaceChildren();
    frame.stack.forEach(name => { const item = document.createElement('li'); item.textContent = name; el('debug-stack').append(item); });
    const last = index === trace.length-1;
    el('debug-output').textContent = (last ? outcome.output : frame.output) || 'Ainda sem saída.';
    if (frame.event === 'exception') el('debug-output').textContent += '\n' + frame.action;
    if (last && outcome.error) el('debug-output').textContent += '\nExecução interrompida: ' + outcome.error;
    el('debug-counter').textContent = `${index+1} / ${trace.length}`;
    el('debug-timeline').value = index;
    el('debug-prev').disabled = index===0; el('debug-reset').disabled = index===0; el('debug-next').disabled = last;
    if (last) pause();
  }
  function dispose() { worker?.terminate(); worker = null; clearTimeout(deadline); }
  function failure(message) { dispose(); setBusy(false); status(message,true); }
  function newWorker() {
    worker = new Worker('debug-worker.js');
    worker.onmessage = ({data}) => {
      if (data.status) { status(data.status); return; }
      clearTimeout(deadline);
      if (data.error) return failure('Não foi possível executar. ' + data.error + ' Você pode tentar novamente.');
      outcome = data.result; trace = outcome.frames; index = 0;
      el('editor-notice').textContent = '';
      setBusy(false); el('debug-timeline').max = Math.max(0,trace.length-1);
      if (!trace.length) { status('Não foi possível gerar passos: ' + (outcome.error || 'main() não executou linhas rastreáveis.'),true); return; }
      status(`${trace.length} passos registrados para ${JSON.stringify(input)}. Use “Animar” ou “Próxima linha”.${outcome.error ? ' Esta entrada termina com uma exceção — acompanhe onde ela surge.' : ''}`);
      show();
    };
    worker.onerror = e => { e.preventDefault(); failure('Falha ao carregar o motor Python. Confira a conexão e tente novamente.'); };
  }
  function run() {
    if (busy || !defaultCode) return;
    pause(); trace = []; outcome = null; index = 0;
    executionCode = el('python-editor').value; input = el('debug-input').value;
    drawCode(executionCode); setBusy(true); status('Preparando execução…');
    floatPlayer();
    if (!worker) newWorker();
    // A separate worker keeps a modified program from blocking the page.
    deadline = setTimeout(() => failure('Execução cancelada após 90 segundos. Confira a conexão ou revise o código e tente novamente.'),90000);
    worker.postMessage({code:executionCode,expression:input});
  }
  el('debug-form').addEventListener('submit', e => {e.preventDefault();run();});
  el('debug-cancel').addEventListener('click', () => { dispose();setBusy(false);status('Execução cancelada. Você pode gerar outra.'); });
  el('debug-next').addEventListener('click', () => {pause();index=Math.min(index+1,trace.length-1);show();});
  el('debug-prev').addEventListener('click', () => {pause();index=Math.max(index-1,0);show();});
  el('debug-reset').addEventListener('click', () => {pause();index=0;show();});
  el('debug-timeline').addEventListener('input', () => {pause();index=Number(el('debug-timeline').value);show();});
  function play() {
    if (!trace.length) return;
    floatPlayer();
    if (index===trace.length-1) {index=0;show();}
    el('debug-play').textContent='Ⅱ Pausar';
    interval=setInterval(()=>{index=Math.min(index+1,trace.length-1);show();},Number(el('debug-speed').value));
  }
  el('debug-play').addEventListener('click', () => interval ? pause() : play());
  el('debug-speed').addEventListener('change',()=>{if(interval){pause();play();}});
  function edited() {pause();el('editor-notice').textContent='Há alterações. Clique em Gerar execução para aplicá-las; o painel mantém a execução anterior até lá.';}
  el('python-editor').addEventListener('input',edited);
  el('debug-input').addEventListener('input',()=>{pause();if(trace.length)status('Entrada alterada. Gere uma nova execução para atualizar os passos.');});
  el('debug-restore').addEventListener('click',()=>{el('python-editor').value=defaultCode;edited();if(!trace.length)drawCode(defaultCode);});
  document.querySelectorAll('[data-debug-example]').forEach(button=>button.addEventListener('click',()=>{el('debug-input').value=button.dataset.debugExample;run();}));
  el('debug-copy').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(el('python-editor').value);el('debug-copy').textContent='Copiado ✓';}
    catch {el('editor-details').open=true;el('python-editor').focus();el('python-editor').select();status('Código selecionado no editor. Use Ctrl+C para copiar.');}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  async function init() {
    try {
      const response=await fetch('roteiro2-enxuto.py');
      if(!response.ok)throw Error('Arquivo não encontrado.');
      defaultCode=await response.text();el('python-editor').value=defaultCode;drawCode(defaultCode);
      status('Código pronto. Clique em Gerar execução para iniciar o Python.');
    } catch { status('Abra a versão publicada do site para carregar o código e executar o depurador.',true);el('debug-build').disabled=true; }
  }
  init();
})();
