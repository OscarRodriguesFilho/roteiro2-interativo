(() => {
  const steps = [
    {title:'Começar por um inteiro',text:'O caminho de entrada passa obrigatoriamente por INT. O Parser confere o tipo e usa esse valor como resultado inicial. Não existe um atalho que comece por um operador.',code:'if Parser.lexer.next.type != "INT":\n    raise Exception("[Parser] Esperado INT")\nresult = Parser.lexer.next.value',parts:['entry','int']},
    {title:'Escolher se a expressão continua',text:'Depois do inteiro, um + ou − leva ao caminho de retorno. No código, esse desvio é a condição do while. O operador precisa ser guardado antes de pedir outro token.',code:'while Parser.lexer.next.type in ("PLUS", "MINUS"):\n    operator = Parser.lexer.next.type\n    Parser.lexer.select_next()',parts:['loop','plus','minus']},
    {title:'O retorno exige outro INT',text:'As duas alternativas voltam ao mesmo INT. Por isso, depois do operador, o Parser exige um número, aplica a operação e avança. O laço pode se repetir várias vezes.',code:'if Parser.lexer.next.type != "INT":\n    raise Exception("[Parser] Esperado INT")\n# Atualiza result com + ou −.\nParser.lexer.select_next()',parts:['back','int']},
    {title:'Sair da regra não basta para aceitar a entrada',text:'Quando o token não é PLUS nem MINUS, parse_expression() devolve o resultado. run() ainda exige EOF. O círculo de saída encerra esta regra; a checagem de EOF valida que não há nada sobrando.',code:'# Em parse_expression():\nreturn result\n\n# Em run(), após receber o resultado:\nif Parser.lexer.next.type != "EOF":\n    raise Exception("[Parser] Esperado EOF")',parts:['exit']}
  ];
  function selectStep(index) {
    const step=steps[index];
    document.querySelectorAll('[data-rail-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.railStep)===index)));
    document.querySelectorAll('[data-rail]').forEach(part=>part.classList.toggle('lit',step.parts.includes(part.dataset.rail)));
    document.getElementById('rail-step-title').textContent=step.title;
    document.getElementById('rail-step-text').textContent=step.text;
    document.getElementById('rail-step-code').textContent=step.code;
  }
  document.querySelectorAll('[data-rail-step]').forEach(button=>button.addEventListener('click',()=>selectStep(Number(button.dataset.railStep))));
  document.getElementById('diagram-debug-example').addEventListener('click',()=>{
    const input=document.getElementById('debug-input');
    const status=document.getElementById('diagram-example-status');
    if(input.disabled){status.textContent='Aguarde a execução atual terminar e tente novamente.';return;}
    input.value='11 + 22 - 3';input.dispatchEvent(new Event('input',{bubbles:true}));
    status.textContent='Exemplo preenchido. Clique em Gerar execução no depurador para acompanhá-lo.';
    document.getElementById('debug-form').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    input.focus({preventScroll:true});
  });
  selectStep(0);
})();
