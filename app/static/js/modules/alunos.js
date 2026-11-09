// --- 7. ESTUDANTES (QUADRO NOMINAL & BOLETIM) ---
async function carregarAlunos() {
  try {
    const res = await fetch('/api/v1/alunos');
    if (!res.ok) throw new Error("Erro ao buscar alunos");
    listaAlunosGlobal = await res.json();
    popularFiltrosEstudantes();
    filtrarAlunosTabela();
    alternarModoExibicaoAlunos(modoExibicaoAlunos || 'lista');
  } catch (err) { console.error(err); }
}

function popularFiltrosEstudantes() {
  const selEscola = document.getElementById('filtro-escola-alunos');
  if (selEscola) {
    const escolaAtual = selEscola.value;
    const escolas = [...new Set(listaAlunosGlobal.map(a => a.nome_escola).concat(listaEscolasGlobal.map(e => e.nome)))].filter(Boolean);
    let optHtml = '<option value="todos">Todas as Escolas</option>';
    escolas.forEach(esc => {
      optHtml += `<option value="${esc}" ${esc === escolaAtual ? 'selected' : ''}>${esc}</option>`;
    });
    selEscola.innerHTML = optHtml;
  }
  atualizarFiltrosTurmaSalaEstudantes();
}

function aoMudarFiltroEscolaEstudantes(escola) {
  atualizarFiltrosTurmaSalaEstudantes();
  filtrarAlunosTabela();
}

function atualizarFiltrosTurmaSalaEstudantes() {
  const selEscola = document.getElementById('filtro-escola-alunos');
  const selTurma = document.getElementById('filtro-turma-alunos');
  const selSala = document.getElementById('filtro-sala-alunos');
  const escolaSel = selEscola ? selEscola.value : 'todos';

  let alunosBase = listaAlunosGlobal;
  if (escolaSel && escolaSel !== 'todos') {
    alunosBase = alunosBase.filter(a => a.nome_escola.toLowerCase() === escolaSel.toLowerCase());
  }

  if (selTurma) {
    const turmaAtual = selTurma.value;
    const turmas = [...new Set(alunosBase.map(a => a.turma))].filter(Boolean);
    let optTurma = '<option value="todos">Todas as Turmas</option>';
    turmas.forEach(t => {
      optTurma += `<option value="${t}" ${t === turmaAtual ? 'selected' : ''}>${t}</option>`;
    });
    selTurma.innerHTML = optTurma;
  }

  if (selSala) {
    const salaAtual = selSala.value;
    const salas = [...new Set(alunosBase.map(a => a.sala))].filter(Boolean);
    let optSala = '<option value="todos">Todas as Salas</option>';
    salas.forEach(s => {
      optSala += `<option value="${s}" ${s === salaAtual ? 'selected' : ''}>${s}</option>`;
    });
    selSala.innerHTML = optSala;
  }
}

function alternarModoExibicaoAlunos(modo) {
  modoExibicaoAlunos = modo;
  document.getElementById('btn-view-alu-lista')?.classList.toggle('active', modo === 'lista');
  document.getElementById('btn-view-alu-cards')?.classList.toggle('active', modo === 'cartoes');

  const listaEl = document.getElementById('view-quadro-alunos-lista') || document.querySelector('#screen-alunos #view-alunos-lista');
  const cardsEl = document.getElementById('view-quadro-alunos-cartoes') || document.querySelector('#screen-alunos #view-alunos-cartoes');
  if (listaEl && cardsEl) {
    if (modo === 'lista') {
      listaEl.style.display = 'block';
      cardsEl.style.display = 'none';
    } else {
      listaEl.style.display = 'none';
      cardsEl.style.display = 'grid';
    }
  }
}

function filtrarAlunosTabela(termo) {
  const t = (termo !== undefined ? termo : (document.getElementById('busca-estudante')?.value || '')).toLowerCase().trim();
  const escola = document.getElementById('filtro-escola-alunos')?.value || 'todos';
  const turma = document.getElementById('filtro-turma-alunos')?.value || 'todos';
  const sala = document.getElementById('filtro-sala-alunos')?.value || 'todos';
  const turno = document.getElementById('filtro-turno-alunos')?.value || 'todos';
  const nivel = document.getElementById('filtro-nivel-alunos')?.value || 'todos';
  const ordem = document.getElementById('ordem-alunos')?.value || 'padrao';

  let filtrados = listaAlunosGlobal.filter(a => {
    const matchTermo = !t || a.nome.toLowerCase().includes(t) || a.codigo_aluno.includes(t) || a.turma.toLowerCase().includes(t) || a.sala.toLowerCase().includes(t);
    const matchEscola = escola === 'todos' || a.nome_escola.toLowerCase() === escola.toLowerCase();
    const matchTurma = turma === 'todos' || a.turma.toLowerCase() === turma.toLowerCase();
    const matchSala = sala === 'todos' || a.sala.toLowerCase() === sala.toLowerCase();
    const matchTurno = turno === 'todos' || a.turno.toLowerCase() === turno.toLowerCase();
    const matchNivel = nivel === 'todos' || a.nivel_lp === nivel || a.nivel_mat === nivel;
    return matchTermo && matchEscola && matchTurma && matchSala && matchTurno && matchNivel;
  });

  if (ordem === 'nome-asc') {
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (ordem === 'media-desc') {
    filtrados.sort((a, b) => ((b.nota_lp + b.nota_mat)/2) - ((a.nota_lp + a.nota_mat)/2));
  } else if (ordem === 'media-asc') {
    filtrados.sort((a, b) => ((a.nota_lp + a.nota_mat)/2) - ((b.nota_lp + b.nota_mat)/2));
  }

  renderizarAlunosQuadro(filtrados);
}

function filtrarAlunosPorEscola(escolaNome) {
  aoMudarFiltroEscolaEstudantes(escolaNome);
}

function filtrarAlunosPorNivel(nivel) {
  filtrarAlunosTabela();
}

function ordenarAlunos(ordem) {
  filtrarAlunosTabela();
}

function renderizarAlunosQuadro(alunos) {
  const tbody = document.getElementById('tabela-alunos-body');
  const cardsContainer = document.getElementById('view-quadro-alunos-cartoes') || document.querySelector('#screen-alunos #view-alunos-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    alunos.forEach(al => {
      const tr = document.createElement('tr');
      const notaLp = (al.nota_lp !== undefined && al.nota_lp !== null) ? Number(al.nota_lp) : 0.0;
      const notaMat = (al.nota_mat !== undefined && al.nota_mat !== null) ? Number(al.nota_mat) : 0.0;
      const mediaGeral = (notaLp + notaMat) / 2;

      tr.innerHTML = `
        <td><code>${al.codigo_aluno}</code></td>
        <td><strong>${al.nome}</strong></td>
        <td>${al.nome_escola}</td>
        <td><span class="badge-tag primary">${al.turma}</span></td>
        <td><strong style="color: var(--color-success);">${al.frequencia}</strong></td>
        <td><strong style="color: var(--gov-primary);">${formatarNota(notaLp)}</strong></td>
        <td><strong style="color: var(--color-success);">${formatarNota(notaMat)}</strong></td>
        <td><strong style="color: #d97706;">${formatarNota(mediaGeral)}</strong></td>
        <td><span class="badge-status ${obterClasseNivel(al.nivel_lp)}">${al.nivel_lp}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="abrirBoletimEstudante(${al.id})">
              Boletim
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    alunos.forEach(al => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      const notaLp = (al.nota_lp !== undefined && al.nota_lp !== null) ? Number(al.nota_lp) : 0.0;
      const notaMat = (al.nota_mat !== undefined && al.nota_mat !== null) ? Number(al.nota_mat) : 0.0;
      const mediaGeral = (notaLp + notaMat) / 2;

      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${al.nome}</div>
              <div class="entity-card-subtitle">${al.nome_escola} • ${al.turma}</div>
            </div>
            <span class="badge-status ${obterClasseNivel(al.nivel_lp)}">${al.nivel_lp}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Código do Aluno:</span><span class="value">${al.codigo_aluno}</span></div>
            <div class="entity-card-row"><span class="label">Frequência:</span><span class="value">${al.frequencia}</span></div>
            <div class="entity-card-row"><span class="label">Português (0 a 10):</span><span class="value">${formatarNota(notaLp)}</span></div>
            <div class="entity-card-row"><span class="label">Matemática (0 a 10):</span><span class="value">${formatarNota(notaMat)}</span></div>
            <div class="entity-card-row"><span class="label">Média Geral:</span><span class="value">${formatarNota(mediaGeral)}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-secondary" onclick="abrirBoletimEstudante(${al.id})">Boletim</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function obterClasseNivel(nivel) {
  if (nivel === 'Avançado' || nivel === 'Adequado') return 'concluida';
  if (nivel === 'Básico') return 'agendada';
  return 'intervencao';
}

// ==========================================
// BOLETIM DIAGNÓSTICO INDIVIDUAL & EDITOR BNCC / PARECER
// ==========================================
let boletimAtualEstudante = null;

async function abrirBoletimEstudante(alunoId) {
  try {
    const res = await fetch(`/api/v1/alunos/${alunoId}/boletim`);
    if (!res.ok) throw new Error("Erro ao buscar boletim");
    const boletim = await res.json();
    boletimAtualEstudante = boletim;

    renderizarVisualizacaoBoletim(boletim);
    document.getElementById('modal-boletim-aluno').classList.add('active');
  } catch (err) {
    mostrarToast("Erro ao abrir boletim do aluno", "erro");
  }
}

function renderizarCabecalhoBoletimHTML(al) {
  const notaLp = (al.nota_lp !== undefined && al.nota_lp !== null) ? Number(al.nota_lp) : 0.0;
  const notaMat = (al.nota_mat !== undefined && al.nota_mat !== null) ? Number(al.nota_mat) : 0.0;
  const mediaGeral = (notaLp + notaMat) / 2;

  return `
    <div class="bulletin-header-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h2 style="font-size: 1.35rem; color: var(--gov-primary); margin-bottom: 4px;">${al.nome}</h2>
          <span style="color: var(--gov-primary); font-family: monospace; font-size: 0.9rem; font-weight: 700;">Cód: ${al.codigo_aluno}</span> • <span>${al.turma} (${al.sala}) - Turno ${al.turno}</span>
        </div>
        <span class="badge-status concluida">Situação: ${al.situacao}</span>
      </div>
      <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);">
        <strong>Unidade Escolar:</strong> ${al.nome_escola} (Cód: ${al.codigo_escola}) • <strong>Responsável:</strong> ${al.nome_responsavel} (${al.telefone_responsavel})
      </p>
      <div style="display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; background: #ffffff; padding: 12px 16px; border-radius: 8px; border: 1px solid #bfdbfe;">
        <div><span>Nota LP (0 a 10):</span> <strong style="color: var(--gov-primary); font-size: 1.15rem;">${formatarNota(notaLp)}</strong> <small style="color: var(--text-muted);">(${al.nivel_lp})</small></div>
        <div><span>Nota MAT (0 a 10):</span> <strong style="color: var(--color-success); font-size: 1.15rem;">${formatarNota(notaMat)}</strong> <small style="color: var(--text-muted);">(${al.nivel_mat})</small></div>
        <div><span>Média Geral:</span> <strong style="color: var(--gov-primary); font-size: 1.15rem;">${formatarNota(mediaGeral)}</strong></div>
      </div>
    </div>
  `;
}

function renderizarVisualizacaoBoletim(boletim) {
  const al = boletim.estudante;
  const container = document.getElementById('boletim-corpo-conteudo');
  if (!container) return;

  const domList = (boletim.habilidades_dominadas || []);
  const desList = (boletim.habilidades_em_desenvolvimento || []);
  const intList = (boletim.habilidades_intervencao || []);
  const recomendacoes = (boletim.recomendacoes_pedagogicas || []);

  container.innerHTML = `
    ${renderizarCabecalhoBoletimHTML(al)}

    <h4 style="color: var(--color-success); margin-top: 15px;">Habilidades Consolidadas / Dominadas (BNCC)</h4>
    <ul class="skills-list dominadas">
      ${domList.length > 0 ? domList.map(h => `<li><strong>${h.codigo}</strong>: ${h.descricao}</li>`).join('') : '<li style="color: var(--text-muted);">Nenhuma habilidade registrada nesta categoria.</li>'}
    </ul>

    <h4 style="color: var(--color-warning); margin-top: 15px;">Habilidades em Desenvolvimento</h4>
    <ul class="skills-list desenvolvimento">
      ${desList.length > 0 ? desList.map(h => `<li><strong>${h.codigo}</strong>: ${h.descricao}</li>`).join('') : '<li style="color: var(--text-muted);">Nenhuma habilidade registrada nesta categoria.</li>'}
    </ul>

    <h4 style="color: var(--color-danger); margin-top: 15px;">Habilidades que Exigem Intervenção Imediata</h4>
    <ul class="skills-list intervencao">
      ${intList.length > 0 ? intList.map(h => `<li><strong>${h.codigo}</strong>: ${h.descricao}</li>`).join('') : '<li style="color: var(--text-muted);">Nenhuma habilidade registrada nesta categoria.</li>'}
    </ul>

    <h4 style="color: var(--gov-primary); margin-top: 16px;">Parecer Pedagógico & Recomendações Individualizadas</h4>
    <div style="background: #f8fafc; border: 1px solid var(--border-light); border-left: 4px solid var(--gov-primary); border-radius: 8px; padding: 12px 16px; margin-top: 8px; font-size: 0.88rem; color: var(--text-main);">
      ${recomendacoes.length > 0 ? `<ul style="margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px;">${recomendacoes.map(r => `<li>${r}</li>`).join('')}</ul>` : '<span style="color: var(--text-muted);">Sem parecer pedagógico registrado.</span>'}
    </div>
  `;

  const footerVis = document.getElementById('boletim-footer-visualizacao');
  const footerEd = document.getElementById('boletim-footer-edicao');
  if (footerVis) footerVis.style.display = 'flex';
  if (footerEd) footerEd.style.display = 'none';
}

function alternarEdicaoBoletim(modoEdicao) {
  if (!boletimAtualEstudante) return;
  if (!modoEdicao) {
    renderizarVisualizacaoBoletim(boletimAtualEstudante);
    return;
  }

  const al = boletimAtualEstudante.estudante;
  const container = document.getElementById('boletim-corpo-conteudo');
  if (!container) return;

  const parecerTexto = boletimAtualEstudante.parecer_pedagogico || (boletimAtualEstudante.recomendacoes_pedagogicas || []).join('\n');

  container.innerHTML = `
    ${renderizarCabecalhoBoletimHTML(al)}

    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-top: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="color: var(--color-success); margin: 0;">1. Habilidades Consolidadas / Dominadas (BNCC)</h4>
        <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.76rem;" onclick="adicionarLinhaHabilidadeBoletim('dominadas', 'EF05LP01', '')">+ Adicionar Habilidade</button>
      </div>
      <div id="editor-lista-dominadas" style="display: flex; flex-direction: column; gap: 8px;"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; margin-bottom: 8px;">
        <h4 style="color: var(--color-warning); margin: 0;">2. Habilidades em Desenvolvimento (BNCC)</h4>
        <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.76rem;" onclick="adicionarLinhaHabilidadeBoletim('desenvolvimento', 'EF05LP04', '')">+ Adicionar Habilidade</button>
      </div>
      <div id="editor-lista-desenvolvimento" style="display: flex; flex-direction: column; gap: 8px;"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; margin-bottom: 8px;">
        <h4 style="color: var(--color-danger); margin: 0;">3. Habilidades que Exigem Intervenção Imediata (BNCC)</h4>
        <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.76rem;" onclick="adicionarLinhaHabilidadeBoletim('intervencao', 'EF05LP15', '')">+ Adicionar Habilidade</button>
      </div>
      <div id="editor-lista-intervencao" style="display: flex; flex-direction: column; gap: 8px;"></div>

      <div style="margin-top: 18px;">
        <label style="display: block; font-weight: 700; color: var(--gov-primary); font-size: 0.9rem; margin-bottom: 6px;">
          4. Parecer Pedagógico & Recomendações Individualizadas (uma recomendação por linha)
        </label>
        <textarea id="editor-boletim-parecer" class="modal-input" rows="4" style="resize: vertical; font-size: 0.86rem;" placeholder="Digite o parecer pedagógico e orientações para o estudante...">${parecerTexto}</textarea>
      </div>
    </div>
  `;

  (boletimAtualEstudante.habilidades_dominadas || []).forEach(h => adicionarLinhaHabilidadeBoletim('dominadas', h.codigo, h.descricao));
  (boletimAtualEstudante.habilidades_em_desenvolvimento || []).forEach(h => adicionarLinhaHabilidadeBoletim('desenvolvimento', h.codigo, h.descricao));
  (boletimAtualEstudante.habilidades_intervencao || []).forEach(h => adicionarLinhaHabilidadeBoletim('intervencao', h.codigo, h.descricao));

  const footerVis = document.getElementById('boletim-footer-visualizacao');
  const footerEd = document.getElementById('boletim-footer-edicao');
  if (footerVis) footerVis.style.display = 'none';
  if (footerEd) footerEd.style.display = 'flex';
}

function adicionarLinhaHabilidadeBoletim(categoria, codigo = '', descricao = '') {
  const listaContainer = document.getElementById(`editor-lista-${categoria}`);
  if (!listaContainer) return;

  const row = document.createElement('div');
  row.className = 'linha-hab-boletim';
  row.style.cssText = 'display: grid; grid-template-columns: 120px 1fr auto; gap: 8px; align-items: center;';
  row.innerHTML = `
    <input type="text" class="modal-input input-hab-codigo" placeholder="Ex: EF05LP01" value="${(codigo || '').replace(/"/g, '&quot;')}" style="font-family: monospace; font-weight: 700;">
    <input type="text" class="modal-input input-hab-desc" placeholder="Descrição da habilidade BNCC..." value="${(descricao || '').replace(/"/g, '&quot;')}">
    <button type="button" class="btn btn-delete" style="padding: 6px 10px; font-size: 0.75rem;" onclick="this.parentElement.remove()" title="Remover habilidade">✕</button>
  `;
  listaContainer.appendChild(row);
}

function coletarHabilidadesCategoriaBoletim(categoria) {
  const container = document.getElementById(`editor-lista-${categoria}`);
  if (!container) return [];
  const rows = container.querySelectorAll('.linha-hab-boletim');
  const resultado = [];
  rows.forEach(r => {
    const codigo = (r.querySelector('.input-hab-codigo')?.value || '').trim().toUpperCase();
    const descricao = (r.querySelector('.input-hab-desc')?.value || '').trim();
    if (codigo || descricao) {
      resultado.push({ codigo: codigo || 'BNCC', descricao: descricao || 'Habilidade avaliada' });
    }
  });
  return resultado;
}

async function salvarEdicaoBoletimEstudante() {
  if (!boletimAtualEstudante || !boletimAtualEstudante.estudante) return;
  const alunoId = boletimAtualEstudante.estudante.id;

  const payload = {
    habilidades_dominadas: coletarHabilidadesCategoriaBoletim('dominadas'),
    habilidades_em_desenvolvimento: coletarHabilidadesCategoriaBoletim('desenvolvimento'),
    habilidades_intervencao: coletarHabilidadesCategoriaBoletim('intervencao'),
    parecer_pedagogico: document.getElementById('editor-boletim-parecer')?.value || ''
  };

  const btnSalvar = document.getElementById('btn-salvar-boletim-aluno');
  if (btnSalvar) btnSalvar.textContent = 'Salvando...';

  try {
    const res = await fetch(`/api/v1/alunos/${alunoId}/boletim`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Falha ao salvar boletim");

    boletimAtualEstudante = await res.json();
    renderizarVisualizacaoBoletim(boletimAtualEstudante);
    mostrarToast("Boletim e parecer pedagógico atualizados com sucesso!");
  } catch (err) {
    console.error(err);
    mostrarToast("Erro ao salvar alterações do boletim", "erro");
  } finally {
    if (btnSalvar) btnSalvar.textContent = 'Salvar Alterações do Boletim';
  }
}
