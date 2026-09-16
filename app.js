const $ = id => document.getElementById(id);
let frames = [], current = 0, timer = null, source = '';
function stop() { clearInterval(timer); timer = null; $('play').textContent = '▶ Animar'; }
function render() {
  const frame = frames[current];
  $('position').textContent = `position = ${frame.position}`;
  $('source').replaceChildren();
  for (let i = 0; i <= source.length; i++) {
    const cell = document.createElement('span');
    cell.className = 'char' + (i < frame.position ? ' read' : '') + (i === source.length ? ' eof' : '');
    if (frame.token && i >= frame.token.start && (i < frame.token.end || frame.token.type === 'EOF')) cell.classList.add('selected');
    if (i === frame.position) cell.classList.add('cursor');
    cell.textContent = i === source.length ? 'fim' : /\s/u.test(source[i]) ? '·' : source[i];
    cell.title = `Posição ${i}`;
    $('source').append(cell);
  }
  const cursor = $('source').querySelector('.cursor');
  if (cursor) $('source').scrollLeft = Math.max(0, cursor.offsetLeft - $('source').offsetLeft - $('source').clientWidth / 2);
  $('token').replaceChildren();
  const type = document.createElement('span'); type.className = 'token-type'; type.textContent = frame.token ? frame.token.type : 'None';
  const value = document.createElement('span'); value.textContent = frame.token ? frame.token.type === 'INT' ? frame.token.value : JSON.stringify(frame.token.value) : '—';
  $('token').append(type, value);
  $('token-note').textContent = frame.token ? 'O campo next só muda quando o Lexer prepara outro token.' : 'Nenhum token preparado ainda.';
  $('result').textContent = frame.result === null ? '—' : frame.result;
  $('result').style.fontSize = frame.result && frame.result.length > 14 ? '18px' : '';
  $('result').style.overflowWrap = 'anywhere';
  $('expectation').textContent = frame.expectation;
  $('stage').textContent = `${String(current + 1).padStart(2,'0')} / ${frame.owner.toUpperCase()}`;
  $('event-title').textContent = frame.title; $('event-detail').textContent = frame.detail;
  const event = $('event-title').parentElement; event.classList.toggle('error', frame.error);
  event.classList.remove('pulse'); void event.offsetWidth; event.classList.add('pulse');
  $('step-count').textContent = `${current + 1} de ${frames.length}`;
  $('progress-fill').style.width = `${100 * (current + 1) / frames.length}%`;
  $('previous').disabled = current === 0; $('next').disabled = current === frames.length - 1;
  if (current === frames.length - 1) stop();
}
function load() { stop(); source = $('expression').value; frames = buildTrace(source); current = 0; render(); }
$('expression-form').addEventListener('submit', e => { e.preventDefault(); load(); });
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => { $('expression').value = button.dataset.example; load(); }));
$('next').addEventListener('click', () => { stop(); if (current < frames.length - 1) current++; render(); });
$('previous').addEventListener('click', () => { stop(); if (current > 0) current--; render(); });
$('reset').addEventListener('click', () => { stop(); current = 0; render(); });
$('play').addEventListener('click', () => {
  if (timer) return stop();
  if (current === frames.length - 1) { current = 0; render(); }
  $('play').textContent = 'Ⅱ Pausar';
  timer = setInterval(() => { if (current < frames.length - 1) { current++; render(); } else stop(); }, 1900);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-answer]').forEach(b => b.classList.remove('correct','incorrect'));
  const right = button.dataset.answer === 'right'; button.classList.add(right ? 'correct' : 'incorrect');
  $('quiz-feedback').textContent = right ? 'Isso! next.type apenas consulta. select_next() é que lê os próximos caracteres e substitui o token.' : 'Tente outra vez: ler um atributo não executa select_next(). O cursor permanece no mesmo lugar.';
}));
load();
