
// ==========================================
// 10. MÓDULO: INSERIR NOTAS DOS ALUNOS (FLUXO SEQUENCIAL)
// ==========================================

let listaEscolasNotas = [];
let listaTurmasNotas = [];
let listaAlunosNotasAtual = [];
let escolaSelecionadaNotas = null;
let turmaSelecionadaNotas = null;
let anoLetivoNotas = "2026";
let disciplinaSelecionadaNotas = "todas";

let listaMatrizNotas = [];

function aoSelecionarDisciplinaNotas(disciplina) {
  disciplinaSelecionadaNotas = disciplina || "todas";
  aplicarVisibilidadeColunasDisciplina();
  if (listaAlunosNotasAtual && listaAlunosNotasAtual.length > 0) {
    renderizarTabelaAlunosNotas(listaAlunosNotasAtual);
  }
}

function aplicarVisibilidadeColunasDisciplina() {
  const thLP = document.getElementById('th-col-lp');
  const thMAT = document.getElementById('th-col-mat');

  const normalizada = (disciplinaSelecionadaNotas || 'todas').toLowerCase();
  const ehLP = normalizada.includes('portugu') || normalizada === 'lp';
  const ehMAT = normalizada.includes('matem') || normalizada === 'mat';

  if (thLP) thLP.style.display = (normalizada === 'todas' || ehLP) ? '' : 'none';
  if (thMAT) thMAT.style.display = (normalizada === 'todas' || ehMAT) ? '' : 'none';
}

function popularSelectDisciplinasNotas() {
  const select = document.getElementById('notas-filtro-disciplina');
  if (!select) return;

  // Extrair nomes únicos das disciplinas cadastradas na Matriz Curricular
  const nomesCadastrados = Array.from(new Set(
    (listaMatrizNotas || [])
      .map(m => (m.nome_disciplina || '').trim())
      .filter(n => n.length > 0)
  ));

  // Se por ventura a matriz ainda estiver vazia, coloca ao menos as duas disciplinas padrão
  const disciplinasFinais = nomesCadastrados.length > 0 ? nomesCadastrados : ['Língua Portuguesa', 'Matemática'];

  select.innerHTML = '<option value="todas">Todas as Disciplinas</option>';
  disciplinasFinais.forEach(nome => {
    const opt = document.createElement('option');
    opt.value = nome;
    opt.textContent = nome;
    select.appendChild(opt);
  });
}

async function carregarDadosModuloNotas() {
  try {
    const [resEscolas, resTurmas, resAlunos, resMatriz] = await Promise.all([
      fetch('/api/v1/cadastros/escolas'),
      fetch('/api/v1/cadastros/turmas'),
      fetch('/api/v1/cadastros/alunos'),
      fetch('/api/v1/cadastros/matriz-curricular')
    ]);

    listaEscolasNotas = await resEscolas.json();
    listaTurmasNotas = await resTurmas.json();
    listaAlunosGlobal = await resAlunos.json();
    listaMatrizNotas = await resMatriz.json();

    popularSelectEscolasNotas();
    popularSelectDisciplinasNotas();
    aplicarVisibilidadeColunasDisciplina();
  } catch (err) {
    console.error("Erro ao carregar dados para inserção de notas:", err);
    mostrarToast("Erro ao carregar dados escolares.", "erro");
  }
}

function popularSelectEscolasNotas(termoFiltro = '') {
  const select = document.getElementById('notas-filtro-escola');
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">-- Selecione uma Escola --</option>';

  const filtradas = listaEscolasNotas.filter(e => {
    if (!termoFiltro) return true;
    const t = termoFiltro.toLowerCase();
    return e.nome.toLowerCase().includes(t) || e.codigo.includes(t) || (e.codigo_inep && e.codigo_inep.includes(t));
  });

  filtradas.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.codigo;
    opt.textContent = `[Cód: ${e.codigo}] ${e.nome} (${e.tipo_unidade || 'Urbana'})`;
    select.appendChild(opt);
  });

  if (valorAtual && filtradas.some(e => e.codigo === valorAtual)) {
    select.value = valorAtual;
  }
}

function filtrarOpcoesEscolaNotas(termo) {
  popularSelectEscolasNotas(termo);
  const select = document.getElementById('notas-filtro-escola');
  if (termo && select.options.length > 1) {
    select.selectedIndex = 1;
    aoSelecionarEscolaNotas(select.value);
  }
}

function aoSelecionarEscolaNotas(codigoEscola) {
  const selectTurma = document.getElementById('notas-filtro-turma');
  const badgeResumo = document.getElementById('notas-turma-badge-resumo');
  const tbody = document.getElementById('tbody-notas-alunos');

  if (!codigoEscola) {
    escolaSelecionadaNotas = null;
    turmaSelecionadaNotas = null;
    if (selectTurma) {
      selectTurma.innerHTML = '<option value="">-- Primeiro escolha a Escola --</option>';
      selectTurma.disabled = true;
    }
    if (badgeResumo) badgeResumo.style.display = 'none';
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">Selecione a Escola e a Turma acima para listar os alunos.</td></tr>`;
    }
    return;
  }

  escolaSelecionadaNotas = listaEscolasNotas.find(e => e.codigo === codigoEscola);

  // Filtrar turmas vinculadas a essa escola
  const turmasDaEscola = listaTurmasNotas.filter(t => t.codigo_escola === codigoEscola);

  selectTurma.innerHTML = '<option value="">-- Selecione a Turma --</option>';
  if (turmasDaEscola.length === 0) {
    const opt = document.createElement('option');
    opt.value = "PADRAO";
    opt.textContent = "5º Ano A (Turma Padrão)";
    selectTurma.appendChild(opt);
  } else {
    turmasDaEscola.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.turma;
      opt.textContent = `${t.turma} • ${t.turno} (${t.etapa || 'Ensino Fundamental'})`;
      selectTurma.appendChild(opt);
    });
  }

  selectTurma.disabled = false;
  
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--gov-primary);">Escola selecionada: <strong>${escolaSelecionadaNotas?.nome}</strong>. Agora selecione a <strong>Turma</strong>.</td></tr>`;
  }
}

function aoSelecionarTurmaNotas(turmaNome) {
  if (!turmaNome) {
    turmaSelecionadaNotas = null;
    document.getElementById('notas-turma-badge-resumo').style.display = 'none';
    return;
  }

  turmaSelecionadaNotas = turmaNome;
  atualizarListaAlunosNotas();
}

function aoAlterarAnoLetivoNotas(ano) {
  anoLetivoNotas = ano;
  if (turmaSelecionadaNotas && escolaSelecionadaNotas) {
    atualizarListaAlunosNotas();
  }
}

function atualizarListaAlunosNotas() {
  if (!escolaSelecionadaNotas || !turmaSelecionadaNotas) return;

  const codEscola = escolaSelecionadaNotas.codigo;
  const nomeEscola = escolaSelecionadaNotas.nome;

  // Filtrar alunos pertencentes à escola e turma
  let alunosFiltrados = listaAlunosGlobal.filter(a => {
    const escolaMatch = (a.codigo_escola === codEscola) || (a.nome_escola.toLowerCase() === nomeEscola.toLowerCase());
    const turmaMatch = turmaSelecionadaNotas === 'PADRAO' || a.turma.toLowerCase() === turmaSelecionadaNotas.toLowerCase();
    return escolaMatch && turmaMatch;
  });

  if (alunosFiltrados.length === 0) {
    alunosFiltrados = listaAlunosGlobal.filter(a => (a.codigo_escola === codEscola) || (a.nome_escola.toLowerCase() === nomeEscola.toLowerCase()));
  }

  listaAlunosNotasAtual = alunosFiltrados;

  // Atualizar badge resumo da turma
  const badge = document.getElementById('notas-turma-badge-resumo');
  if (badge) {
    badge.style.display = 'flex';
    document.getElementById('notas-info-escola-turma').textContent = `${escolaSelecionadaNotas.nome} • Turma: ${turmaSelecionadaNotas}`;
    document.getElementById('notas-info-detalhe').textContent = `Ano Letivo ${anoLetivoNotas} • Polo: ${escolaSelecionadaNotas.tipo_unidade || 'Urbana'}`;
    document.getElementById('notas-total-estudantes-badge').textContent = `${alunosFiltrados.length} Estudantes`;
  }

  renderizarTabelaAlunosNotas(alunosFiltrados);
}

function filtrarTabelaNotasAlunos(termo) {
  if (!listaAlunosNotasAtual) return;
  const t = termo.toLowerCase();
  const filtrados = listaAlunosNotasAtual.filter(a => 
    a.nome.toLowerCase().includes(t) ||
    a.codigo_aluno.includes(t) ||
    (a.codigo_inep && a.codigo_inep.includes(t))
  );
  renderizarTabelaAlunosNotas(filtrados);
}

function renderizarTabelaAlunosNotas(alunos) {
  const tbody = document.getElementById('tbody-notas-alunos');
  if (!tbody) return;

  aplicarVisibilidadeColunasDisciplina();

  if (alunos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Nenhum estudante encontrado para esta escola e turma.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = alunos.map(a => {
    const notaLP = (a.nota_lp !== undefined && a.nota_lp !== null) ? a.nota_lp.toFixed(1) : '8.0';
    const notaMAT = (a.nota_mat !== undefined && a.nota_mat !== null) ? a.nota_mat.toFixed(1) : '8.0';
    const notaCIE = (a.nota_ciencias !== undefined && a.nota_ciencias !== null) ? a.nota_ciencias.toFixed(1) : '8.0';

    let nivelBadgeClass = 'concluida';
    if (a.nivel_lp === 'Abaixo do Básico' || a.nivel_mat === 'Abaixo do Básico') nivelBadgeClass = 'intervencao';
    else if (a.nivel_lp === 'Básico' || a.nivel_mat === 'Básico') nivelBadgeClass = 'agendada';

    const normalizada = (disciplinaSelecionadaNotas || 'todas').toLowerCase();
    const ehLP = normalizada.includes('portugu') || normalizada === 'lp';
    const ehMAT = normalizada.includes('matem') || normalizada === 'mat';

    const dispLP = (normalizada === 'todas' || ehLP) ? '' : 'display: none;';
    const dispMAT = (normalizada === 'todas' || ehMAT) ? '' : 'display: none;';

    return `
      <tr id="linha-aluno-${a.id}">
        <td><span class="mono-code">${a.codigo_aluno}</span></td>
        <td>
          <div style="font-weight: 700; color: var(--gov-primary);">${a.nome}</div>
          <small style="color: var(--text-dim); font-size: 0.76rem;">${a.turma} • ${a.turno}</small>
        </td>
        <td><small class="mono-code" style="color: var(--text-muted);">${a.codigo_inep || '-'}</small></td>
        <td style="text-align: center; ${dispLP}">
          <input 
            type="number" 
            step="0.1" 
            min="0" 
            max="10" 
            id="input-nota-lp-${a.id}" 
            value="${notaLP}" 
            class="form-control input-nota-tabela"
            style="width: 75px; text-align: center; padding: 4px 6px; font-weight: 700; color: var(--gov-primary); display: inline-block;"
            onchange="aoDigitarNota(${a.id})"
          />
        </td>
        <td style="text-align: center; ${dispMAT}">
          <input 
            type="number" 
            step="0.1" 
            min="0" 
            max="10" 
            id="input-nota-mat-${a.id}" 
            value="${notaMAT}" 
            class="form-control input-nota-tabela"
            style="width: 75px; text-align: center; padding: 4px 6px; font-weight: 700; color: var(--color-success); display: inline-block;"
            onchange="aoDigitarNota(${a.id})"
          />
        </td>
        <td style="text-align: center;">
          <span class="badge-status ${nivelBadgeClass}" id="badge-nivel-${a.id}">
            ${a.nivel_lp || 'Adequado'}
          </span>
        </td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button 
              class="btn btn-primary" 
              style="padding: 5px 10px; font-size: 0.76rem;" 
              id="btn-salvar-aluno-${a.id}" 
              onclick="salvarNotaLinha(${a.id})"
              title="Salvar nota deste aluno"
            >
              Salvar
            </button>
            <button 
              class="btn btn-edit" 
              style="padding: 5px 10px; font-size: 0.76rem;" 
              onclick="abrirModalEditarNotaAluno(${a.id})"
              title="Abrir formulário detalhado para editar a nota"
            >
              Editar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function aoDigitarNota(alunoId) {
  const btn = document.getElementById(`btn-salvar-aluno-${alunoId}`);
  if (btn) {
    btn.style.boxShadow = '0 0 8px rgba(0, 45, 98, 0.4)';
    btn.innerHTML = 'Salvar *';
  }
}

// Salvar a nota de uma linha individual
async function salvarNotaLinha(alunoId) {
  const inputLP = document.getElementById(`input-nota-lp-${alunoId}`);
  const inputMAT = document.getElementById(`input-nota-mat-${alunoId}`);
  const btn = document.getElementById(`btn-salvar-aluno-${alunoId}`);

  if (!inputLP || !inputMAT) return;

  const notaLP = converterNotaParaNumero(inputLP.value);
  const notaMAT = converterNotaParaNumero(inputMAT.value);

  if (btn) btn.innerHTML = 'Gravando...';

  try {
    const res = await fetch(`/api/v1/cadastros/alunos/${alunoId}/notas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nota_lp: notaLP,
        nota_mat: notaMAT,
        ano_letivo: anoLetivoNotas
      })
    });

    if (!res.ok) throw new Error("Erro na resposta da API");

    const alunoAtualizado = await res.json();

    // Atualizar no cache global
    const idx = listaAlunosGlobal.findIndex(a => a.id === alunoId);
    if (idx !== -1) listaAlunosGlobal[idx] = alunoAtualizado;

    // Manter valores normalizados nos inputs
    inputLP.value = alunoAtualizado.nota_lp.toFixed(1);
    inputMAT.value = alunoAtualizado.nota_mat.toFixed(1);

    // Atualizar badge de nível
    const badgeNivel = document.getElementById(`badge-nivel-${alunoId}`);
    if (badgeNivel) {
      let nivelBadgeClass = 'concluida';
      if (alunoAtualizado.nivel_lp === 'Abaixo do Básico' || alunoAtualizado.nivel_mat === 'Abaixo do Básico') nivelBadgeClass = 'intervencao';
      else if (alunoAtualizado.nivel_lp === 'Básico' || alunoAtualizado.nivel_mat === 'Básico') nivelBadgeClass = 'agendada';
      badgeNivel.className = `badge-status ${nivelBadgeClass}`;
      badgeNivel.textContent = alunoAtualizado.nivel_lp;
    }

    if (btn) {
      btn.innerHTML = 'Salvo';
      btn.style.boxShadow = 'none';
      setTimeout(() => { btn.innerHTML = 'Salvar'; }, 2000);
    }

    mostrarToast(`Notas de ${alunoAtualizado.nome} salvas com sucesso!`);
  } catch (err) {
    console.error("Erro ao salvar nota:", err);
    if (btn) btn.innerHTML = 'Salvar';
    mostrarToast("Erro ao salvar nota do aluno.", "erro");
  }
}

// Salvar todas as notas da turma de uma vez só
async function salvarTodasAsNotasEmMassa() {
  if (!listaAlunosNotasAtual || listaAlunosNotasAtual.length === 0) {
    mostrarToast("Nenhum aluno carregado para salvar.", "erro");
    return;
  }

  let salvos = 0;
  for (const a of listaAlunosNotasAtual) {
    const inputLP = document.getElementById(`input-nota-lp-${a.id}`);
    const inputMAT = document.getElementById(`input-nota-mat-${a.id}`);

    if (inputLP && inputMAT) {
      try {
        await fetch(`/api/v1/cadastros/alunos/${a.id}/notas`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nota_lp: converterNotaParaNumero(inputLP.value),
            nota_mat: converterNotaParaNumero(inputMAT.value),
            ano_letivo: anoLetivoNotas
          })
        });
        salvos++;
      } catch (e) {
        console.error(e);
      }
    }
  }

  mostrarToast(`Sucesso: ${salvos} notas da turma foram salvas!`);
  atualizarListaAlunosNotas();
}

// Modal de edição detalhada de nota
function abrirModalEditarNotaAluno(alunoId) {
  const aluno = listaAlunosGlobal.find(a => a.id === alunoId);
  if (!aluno) return;

  document.getElementById('edit-modal-aluno-id').value = aluno.id;
  document.getElementById('edit-modal-aluno-nome').textContent = aluno.nome;
  document.getElementById('edit-modal-aluno-escola').textContent = aluno.nome_escola;
  document.getElementById('edit-modal-aluno-turma').textContent = aluno.turma;
  document.getElementById('edit-modal-aluno-cod').textContent = aluno.codigo_aluno;
  document.getElementById('edit-modal-ano-letivo').value = anoLetivoNotas;

  const notaLp = (aluno.nota_lp !== undefined && aluno.nota_lp !== null) ? aluno.nota_lp : 8.0;
  const notaMat = (aluno.nota_mat !== undefined && aluno.nota_mat !== null) ? aluno.nota_mat : 8.0;

  document.getElementById('edit-modal-nota-lp').value = formatarNota(notaLp);
  document.getElementById('edit-modal-nota-mat').value = formatarNota(notaMat);
  document.getElementById('edit-modal-obs').value = '';

  const modal = document.getElementById('modal-editar-nota-aluno');
  if (modal) modal.classList.add('active');
}

async function salvarNotaModalAluno(e) {
  e.preventDefault();
  const alunoId = parseInt(document.getElementById('edit-modal-aluno-id').value);
  const notaLP = converterNotaParaNumero(document.getElementById('edit-modal-nota-lp').value);
  const notaMAT = converterNotaParaNumero(document.getElementById('edit-modal-nota-mat').value);
  const obs = document.getElementById('edit-modal-obs').value;

  try {
    const res = await fetch(`/api/v1/cadastros/alunos/${alunoId}/notas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nota_lp: notaLP,
        nota_mat: notaMAT,
        ano_letivo: anoLetivoNotas,
        observacoes: obs
      })
    });

    if (!res.ok) throw new Error("Erro na API");

    const alunoAtualizado = await res.json();
    const idx = listaAlunosGlobal.findIndex(a => a.id === alunoId);
    if (idx !== -1) listaAlunosGlobal[idx] = alunoAtualizado;

    fecharModal('modal-editar-nota-aluno');
    mostrarToast(`Notas de ${alunoAtualizado.nome} atualizadas com sucesso!`);

    // Atualiza a tabela se o aluno estiver exibido nela
    const inputLP = document.getElementById(`input-nota-lp-${alunoId}`);
    if (inputLP) inputLP.value = alunoAtualizado.nota_lp.toFixed(1);
    const inputMAT = document.getElementById(`input-nota-mat-${alunoId}`);
    if (inputMAT) inputMAT.value = alunoAtualizado.nota_mat.toFixed(1);

    const badgeNivel = document.getElementById(`badge-nivel-${alunoId}`);
    if (badgeNivel) {
      let nivelBadgeClass = 'concluida';
      if (alunoAtualizado.nivel_lp === 'Abaixo do Básico' || alunoAtualizado.nivel_mat === 'Abaixo do Básico') nivelBadgeClass = 'intervencao';
      else if (alunoAtualizado.nivel_lp === 'Básico' || alunoAtualizado.nivel_mat === 'Básico') nivelBadgeClass = 'agendada';
      badgeNivel.className = `badge-status ${nivelBadgeClass}`;
      badgeNivel.textContent = alunoAtualizado.nivel_lp;
    }
  } catch (err) {
    console.error("Erro ao salvar nota via modal:", err);
    mostrarToast("Erro ao salvar notas do estudante.", "erro");
  }
}