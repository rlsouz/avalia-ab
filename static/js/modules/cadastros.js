// --- 2. CONTROLE DAS SUB-ABAS DE CADASTROS (a, b, c, d, e, f) ---
function trocarSubAbaCadastro(subId) {
  subAbaCadastroAtual = subId;
  const contents = document.querySelectorAll('.sub-cadastro-content');
  contents.forEach(c => c.style.display = 'none');

  const target = document.getElementById(`sub-cadastro-${subId}`);
  if (target) target.style.display = 'block';

  // Atualiza visual dos botões de sub-abas
  const btns = document.querySelectorAll('#screen-cadastros .sub-tab-btn');
  btns.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-sub') === subId);
  });

  // Limpa o input de busca ao trocar de sub-aba
  const buscaInput = document.getElementById('busca-cadastros');
  if (buscaInput) buscaInput.value = '';
  const ordemSelect = document.getElementById('ordem-cadastros');
  if (ordemSelect) ordemSelect.value = 'padrao';

  // Ocultar todos os filtros específicos primeiro
  const todosFiltrosContainers = [
    'filtros-especificos-usuarios',
    'filtros-especificos-escolas',
    'filtros-especificos-turmas',
    'filtros-especificos-alunos'
  ];
  todosFiltrosContainers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
      el.classList.remove('active');
    }
  });

  // Exibir e popular exclusivamente o container específico da sub-aba ativa
  const containerAtivo = document.getElementById(`filtros-especificos-${subId}`);
  if (containerAtivo) {
    containerAtivo.style.display = 'flex';
    containerAtivo.classList.add('active');
    if (subId === 'usuarios') popularFiltrosCadUsuarios();
    else if (subId === 'escolas') popularFiltrosCadEscolas();
    else if (subId === 'turmas') popularFiltrosCadTurmas();
    else if (subId === 'alunos') popularFiltrosCadAlunos();
  }

  atualizarAcoesTopoCadastros(subId);
  aplicarExibicaoSubAbaCadastro();
}

function atualizarAcoesTopoCadastros(subId) {
  const container = document.getElementById('cadastros-top-actions');
  if (!container) return;

  const labels = {
    'usuarios': { label: '+ Novo Usuário', fn: 'abrirModalCadUsuario()' },
    'escolas': { label: '+ Nova Escola', fn: 'abrirModalCadEscola()' },
    'alunos': { label: '+ Novo Aluno', fn: 'abrirModalCadAluno()' },
    'turmas': { label: '+ Nova Turma', fn: 'abrirModalCadTurma()' },
    'matriz': { label: '+ Nova Disciplina', fn: 'abrirModalCadMatriz()' }
  };

  const item = labels[subId] || labels['usuarios'];
  container.innerHTML = `
    <button class="btn btn-secondary" onclick="carregarDadosCadastros()">Recarregar</button>
    <button class="btn btn-primary" onclick="${item.fn}">${item.label}</button>
  `;
}

// Alternar entre modo Lista e Cartões de forma independente para a sub-aba atual
function alternarModoExibicaoCadastros(modo) {
  modoExibicaoPorSubAba[subAbaCadastroAtual] = modo;
  document.getElementById('btn-view-lista')?.classList.toggle('active', modo === 'lista');
  document.getElementById('btn-view-cards')?.classList.toggle('active', modo === 'cartoes');
  aplicarExibicaoSubAbaCadastro();
}

function aplicarExibicaoSubAbaCadastro() {
  const modoAtual = modoExibicaoPorSubAba[subAbaCadastroAtual] || 'lista';
  
  // Atualiza os botões de alternância da barra de controle para refletir o modo desta sub-aba específica
  document.getElementById('btn-view-lista')?.classList.toggle('active', modoAtual === 'lista');
  document.getElementById('btn-view-cards')?.classList.toggle('active', modoAtual === 'cartoes');

  const listaEl = document.querySelector(`#screen-cadastros #view-${subAbaCadastroAtual}-lista`) || document.getElementById(`view-${subAbaCadastroAtual}-lista`);
  const cardsEl = document.querySelector(`#screen-cadastros #view-${subAbaCadastroAtual}-cartoes`) || document.getElementById(`view-${subAbaCadastroAtual}-cartoes`);

  if (listaEl && cardsEl) {
    if (modoAtual === 'lista') {
      listaEl.style.display = 'block';
      cardsEl.style.display = 'none';
    } else {
      listaEl.style.display = 'none';
      cardsEl.style.display = 'grid';
    }
  }
}

// Popular e atualizar opções dinâmicas dos selects de filtros da sub-aba Alunos
function popularFiltrosCadAlunos() {
  const selEscola = document.getElementById('filtro-cad-alu-escola');
  const selTurma = document.getElementById('filtro-cad-alu-turma');
  const selSala = document.getElementById('filtro-cad-alu-sala');

  if (selEscola) {
    const escolaAtual = selEscola.value;
    const escolas = [...new Set(listaAlunosGlobal.map(a => a.nome_escola).concat(listaEscolasGlobal.map(e => e.nome)))].filter(Boolean);
    let optHtml = '<option value="todos">Todas as Escolas</option>';
    escolas.forEach(esc => {
      optHtml += `<option value="${esc}" ${esc === escolaAtual ? 'selected' : ''}>${esc}</option>`;
    });
    selEscola.innerHTML = optHtml;
  }

  atualizarFiltrosTurmaSalaCadAlunos();
}

function aoMudarFiltroEscolaCadAlunos(escola) {
  atualizarFiltrosTurmaSalaCadAlunos();
  filtrarCadastrosGenerico();
}

function atualizarFiltrosTurmaSalaCadAlunos() {
  const selEscola = document.getElementById('filtro-cad-alu-escola');
  const selTurma = document.getElementById('filtro-cad-alu-turma');
  const selSala = document.getElementById('filtro-cad-alu-sala');
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

// Popular e atualizar opções dinâmicas dos selects de filtros da sub-aba Turmas
function popularFiltrosCadTurmas() {
  const selEscola = document.getElementById('filtro-cad-tur-escola');
  if (selEscola) {
    const escolaAtual = selEscola.value;
    const escolas = [...new Set(listaTurmasGlobal.map(t => t.nome_escola).concat(listaEscolasGlobal.map(e => e.nome)))].filter(Boolean);
    let optHtml = '<option value="todos">Todas as Escolas</option>';
    escolas.forEach(esc => {
      optHtml += `<option value="${esc}" ${esc === escolaAtual ? 'selected' : ''}>${esc}</option>`;
    });
    selEscola.innerHTML = optHtml;
  }

  atualizarFiltrosDetalhadosCadTurmas();
}

function aoMudarFiltroEscolaCadTurmas(escola) {
  atualizarFiltrosDetalhadosCadTurmas();
  filtrarCadastrosGenerico();
}

function atualizarFiltrosDetalhadosCadTurmas() {
  const selEscola = document.getElementById('filtro-cad-tur-escola');
  const selPeriodo = document.getElementById('filtro-cad-tur-periodo');
  const selModalidade = document.getElementById('filtro-cad-tur-modalidade');
  const selEtapa = document.getElementById('filtro-cad-tur-etapa');
  const selTurno = document.getElementById('filtro-cad-tur-turno');
  const selSala = document.getElementById('filtro-cad-tur-sala');
  const escolaSel = selEscola ? selEscola.value : 'todos';

  let turmasBase = listaTurmasGlobal;
  if (escolaSel && escolaSel !== 'todos') {
    turmasBase = turmasBase.filter(t => t.nome_escola.toLowerCase() === escolaSel.toLowerCase());
  }

  if (selPeriodo) {
    const periodoAtual = selPeriodo.value;
    const periodos = [...new Set(turmasBase.map(t => t.periodo_letivo))].filter(Boolean);
    let optPeriodo = '<option value="todos">Todos os Períodos</option>';
    periodos.forEach(p => {
      optPeriodo += `<option value="${p}" ${p === periodoAtual ? 'selected' : ''}>${p}</option>`;
    });
    selPeriodo.innerHTML = optPeriodo;
  }

  if (selModalidade) {
    const modAtual = selModalidade.value;
    const modalidades = [...new Set(turmasBase.map(t => t.modalidade))].filter(Boolean);
    let optMod = '<option value="todos">Todas as Modalidades</option>';
    modalidades.forEach(m => {
      optMod += `<option value="${m}" ${m === modAtual ? 'selected' : ''}>${m}</option>`;
    });
    selModalidade.innerHTML = optMod;
  }

  if (selEtapa) {
    const etapaAtual = selEtapa.value;
    const etapas = [...new Set(turmasBase.map(t => t.etapa))].filter(Boolean);
    let optEtapa = '<option value="todos">Todas as Etapas</option>';
    etapas.forEach(e => {
      optEtapa += `<option value="${e}" ${e === etapaAtual ? 'selected' : ''}>${e}</option>`;
    });
    selEtapa.innerHTML = optEtapa;
  }

  if (selTurno) {
    const turnoAtual = selTurno.value;
    const turnos = [...new Set(turmasBase.map(t => t.turno))].filter(Boolean);
    let optTurno = '<option value="todos">Todos os Turnos</option>';
    turnos.forEach(tu => {
      optTurno += `<option value="${tu}" ${tu === turnoAtual ? 'selected' : ''}>${tu}</option>`;
    });
    selTurno.innerHTML = optTurno;
  }

  if (selSala) {
    const salaAtual = selSala.value;
    const salas = [...new Set(turmasBase.map(t => t.sala))].filter(Boolean);
    let optSala = '<option value="todos">Todas as Salas</option>';
    salas.forEach(s => {
      optSala += `<option value="${s}" ${s === salaAtual ? 'selected' : ''}>${s}</option>`;
    });
    selSala.innerHTML = optSala;
  }
}

// ==========================================
// FUNÇÕES DE POPULAR FILTROS DINÂMICOS POR SUB-ABA
// ==========================================

function popularFiltrosCadUsuarios() {
  const selCodigo = document.getElementById('filtro-cad-usu-codigo');
  const selNome = document.getElementById('filtro-cad-usu-nome');
  const selCpf = document.getElementById('filtro-cad-usu-cpf');
  const selEndereco = document.getElementById('filtro-cad-usu-endereco');
  const selTelefone = document.getElementById('filtro-cad-usu-telefone');
  const selEmail = document.getElementById('filtro-cad-usu-email');

  const popularSelectUnico = (el, lista, placeholder) => {
    if (!el) return;
    const atual = el.value;
    const unicos = [...new Set(lista.map(item => (item || '').trim()))].filter(Boolean);
    let html = `<option value="todos">${placeholder}</option>`;
    unicos.forEach(val => {
      html += `<option value="${val}" ${val === atual ? 'selected' : ''}>${val}</option>`;
    });
    el.innerHTML = html;
  };

  popularSelectUnico(selCodigo, listaUsuariosGlobal.map(u => u.codigo), 'Todos os Códigos');
  popularSelectUnico(selNome, listaUsuariosGlobal.map(u => u.nome), 'Todos os Nomes');
  popularSelectUnico(selCpf, listaUsuariosGlobal.map(u => u.cpf), 'Todos os CPFs');
  popularSelectUnico(selEndereco, listaUsuariosGlobal.map(u => u.endereco), 'Todos os Endereços');
  popularSelectUnico(selTelefone, listaUsuariosGlobal.map(u => u.telefone), 'Todos os Telefones');
  popularSelectUnico(selEmail, listaUsuariosGlobal.map(u => u.email), 'Todos os E-mails');
}

function popularFiltrosCadEscolas() {
  const selCodigo = document.getElementById('filtro-cad-esc-codigo');
  const selNome = document.getElementById('filtro-cad-esc-nome');
  const selEndereco = document.getElementById('filtro-cad-esc-endereco');

  const popularSelectUnico = (el, lista, placeholder) => {
    if (!el) return;
    const atual = el.value;
    const unicos = [...new Set(lista.map(item => (item || '').trim()))].filter(Boolean);
    let html = `<option value="todos">${placeholder}</option>`;
    unicos.forEach(val => {
      html += `<option value="${val}" ${val === atual ? 'selected' : ''}>${val}</option>`;
    });
    el.innerHTML = html;
  };

  popularSelectUnico(selCodigo, listaEscolasGlobal.map(e => e.codigo), 'Todos os Códigos');
  popularSelectUnico(selNome, listaEscolasGlobal.map(e => e.nome), 'Todas as Escolas');
  popularSelectUnico(selEndereco, listaEscolasGlobal.map(e => `${e.endereco}, nº ${e.numero}`), 'Todos os Endereços');
}

// Filtro e Ordenação Geral de Cadastros
function filtrarCadastrosGenerico(termo) {
  const t = (termo !== undefined ? termo : (document.getElementById('busca-cadastros')?.value || '')).toLowerCase().trim();
  const ordem = document.getElementById('ordem-cadastros')?.value || 'padrao';

  if (subAbaCadastroAtual === 'usuarios') {
    const fCodigo = document.getElementById('filtro-cad-usu-codigo')?.value || 'todos';
    const fNome = document.getElementById('filtro-cad-usu-nome')?.value || 'todos';
    const fCpf = document.getElementById('filtro-cad-usu-cpf')?.value || 'todos';
    const fEndereco = document.getElementById('filtro-cad-usu-endereco')?.value || 'todos';
    const fTelefone = document.getElementById('filtro-cad-usu-telefone')?.value || 'todos';
    const fEmail = document.getElementById('filtro-cad-usu-email')?.value || 'todos';
    const fStatus = document.getElementById('filtro-cad-usu-status')?.value || 'todos';

    let filtrados = listaUsuariosGlobal.filter(u => {
      const matchBusca = !t || u.nome.toLowerCase().includes(t) || u.cpf.includes(t) || u.codigo.includes(t);
      const matchCodigo = (fCodigo === 'todos') || (u.codigo === fCodigo);
      const matchNome = (fNome === 'todos') || (u.nome.toLowerCase() === fNome.toLowerCase());
      const matchCpf = (fCpf === 'todos') || (u.cpf === fCpf);
      const matchEndereco = (fEndereco === 'todos') || (u.endereco.toLowerCase() === fEndereco.toLowerCase());
      const matchTelefone = (fTelefone === 'todos') || (u.telefone === fTelefone);
      const matchEmail = (fEmail === 'todos') || (u.email.toLowerCase() === fEmail.toLowerCase());
      const matchStatus = (fStatus === 'todos') || (u.status.toLowerCase() === fStatus.toLowerCase());

      return matchBusca && matchCodigo && matchNome && matchCpf && matchEndereco && matchTelefone && matchEmail && matchStatus;
    });
    filtrados = aplicarOrdenacao(filtrados, ordem, 'nome', 'codigo');
    renderizarUsuarios(filtrados);
  } else if (subAbaCadastroAtual === 'escolas') {
    const fCodigo = document.getElementById('filtro-cad-esc-codigo')?.value || 'todos';
    const fNome = document.getElementById('filtro-cad-esc-nome')?.value || 'todos';
    const fEndereco = document.getElementById('filtro-cad-esc-endereco')?.value || 'todos';

    let filtrados = listaEscolasGlobal.filter(e => {
      const matchBusca = !t || e.nome.toLowerCase().includes(t) || e.codigo.includes(t) || e.bairro.toLowerCase().includes(t);
      const matchCodigo = (fCodigo === 'todos') || (e.codigo === fCodigo);
      const matchNome = (fNome === 'todos') || (e.nome.toLowerCase() === fNome.toLowerCase());
      const endCompleto = `${e.endereco}, nº ${e.numero}`.toLowerCase();
      const matchEndereco = (fEndereco === 'todos') || (endCompleto === fEndereco.toLowerCase());

      return matchBusca && matchCodigo && matchNome && matchEndereco;
    });
    filtrados = aplicarOrdenacao(filtrados, ordem, 'nome', 'codigo');
    renderizarEscolasCadastros(filtrados);
  } else if (subAbaCadastroAtual === 'alunos') {
    const fEscola = document.getElementById('filtro-cad-alu-escola')?.value || 'todos';
    const fTurma = document.getElementById('filtro-cad-alu-turma')?.value || 'todos';
    const fSala = document.getElementById('filtro-cad-alu-sala')?.value || 'todos';
    const fTurno = document.getElementById('filtro-cad-alu-turno')?.value || 'todos';

    let filtrados = listaAlunosGlobal.filter(a => {
      const matchBusca = !t || a.nome.toLowerCase().includes(t) || a.codigo_aluno.includes(t) || a.turma.toLowerCase().includes(t) || a.nome_escola.toLowerCase().includes(t) || a.sala.toLowerCase().includes(t);
      const matchEscola = (fEscola === 'todos') || (a.nome_escola.toLowerCase() === fEscola.toLowerCase());
      const matchTurma = (fTurma === 'todos') || (a.turma.toLowerCase() === fTurma.toLowerCase());
      const matchSala = (fSala === 'todos') || (a.sala.toLowerCase() === fSala.toLowerCase());
      const matchTurno = (fTurno === 'todos') || (a.turno.toLowerCase() === fTurno.toLowerCase());

      return matchBusca && matchEscola && matchTurma && matchSala && matchTurno;
    });
    filtrados = aplicarOrdenacao(filtrados, ordem, 'nome', 'codigo_aluno');
    renderizarAlunosCadastros(filtrados);
  } else if (subAbaCadastroAtual === 'turmas') {
    const fEscola = document.getElementById('filtro-cad-tur-escola')?.value || 'todos';
    const fPeriodo = document.getElementById('filtro-cad-tur-periodo')?.value || 'todos';
    const fModalidade = document.getElementById('filtro-cad-tur-modalidade')?.value || 'todos';
    const fEtapa = document.getElementById('filtro-cad-tur-etapa')?.value || 'todos';
    const fTurno = document.getElementById('filtro-cad-tur-turno')?.value || 'todos';
    const fSala = document.getElementById('filtro-cad-tur-sala')?.value || 'todos';

    let filtrados = listaTurmasGlobal.filter(tur => {
      const matchBusca = !t || tur.turma.toLowerCase().includes(t) || tur.nome_escola.toLowerCase().includes(t) || tur.codigo_escola.includes(t) || tur.sala.toLowerCase().includes(t);
      const matchEscola = (fEscola === 'todos') || (tur.nome_escola.toLowerCase() === fEscola.toLowerCase());
      const matchPeriodo = (fPeriodo === 'todos') || (tur.periodo_letivo.toLowerCase() === fPeriodo.toLowerCase());
      const matchModalidade = (fModalidade === 'todos') || (tur.modalidade.toLowerCase() === fModalidade.toLowerCase());
      const matchEtapa = (fEtapa === 'todos') || (tur.etapa.toLowerCase() === fEtapa.toLowerCase());
      const matchTurno = (fTurno === 'todos') || (tur.turno.toLowerCase() === fTurno.toLowerCase());
      const matchSala = (fSala === 'todos') || (tur.sala.toLowerCase() === fSala.toLowerCase());

      return matchBusca && matchEscola && matchPeriodo && matchModalidade && matchEtapa && matchTurno && matchSala;
    });
    filtrados = aplicarOrdenacao(filtrados, ordem, 'turma', 'codigo_escola');
    renderizarTurmasCadastros(filtrados);
  } else if (subAbaCadastroAtual === 'matriz') {
    let filtrados = listaMatrizGlobal.filter(m => 
      (m.nome_disciplina || '').toLowerCase().includes(t) || (m.nome_escola || '').toLowerCase().includes(t) || (m.turma || '').toLowerCase().includes(t) || (m.codigo_aluno || '').includes(t)
    );
    filtrados = aplicarOrdenacao(filtrados, ordem, 'nome_disciplina', 'codigo_aluno');
    renderizarMatrizCadastros(filtrados);
  }
}

function ordenarCadastrosGenerico(ordem) {
  const busca = document.getElementById('busca-cadastros')?.value || '';
  filtrarCadastrosGenerico(busca);
}

function aplicarOrdenacao(arr, ordem, campoNome, campoCodigo) {
  const copia = [...arr];
  if (ordem === 'nome-asc') {
    return copia.sort((a, b) => (a[campoNome] || '').localeCompare(b[campoNome] || ''));
  } else if (ordem === 'nome-desc') {
    return copia.sort((a, b) => (b[campoNome] || '').localeCompare(a[campoNome] || ''));
  } else {
    // padrão sequencial por código
    return copia.sort((a, b) => (a[campoCodigo] || '').localeCompare(b[campoCodigo] || ''));
  }
}

async function carregarDadosCadastros() {
  await Promise.all([
    carregarUsuarios(),
    carregarEscolasCadastradas(),
    carregarAlunosCadastrados(),
    carregarTurmasCadastradas(),
    carregarMatrizCurricular()
  ]);
  trocarSubAbaCadastro(subAbaCadastroAtual || 'usuarios');
}

// ------------------------------------------
// 2.a USUÁRIOS
// ------------------------------------------
async function carregarUsuarios() {
  try {
    const res = await fetch('/api/v1/cadastros/usuarios');
    if (res.ok) {
      listaUsuariosGlobal = await res.json();
      renderizarUsuarios(listaUsuariosGlobal);
      popularFiltrosCadUsuarios();
    }
  } catch (err) { console.error(err); }
}

function renderizarUsuarios(items) {
  const tbody = document.getElementById('tabela-cad-usuarios-body');
  const cardsContainer = document.getElementById('view-usuarios-cartoes');
  
  const perm = PERMISSOES_RBAC_UI[perfilAtivoRBAC] || PERMISSOES_RBAC_UI['admin'];

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(u => {
      const perfilNome = PERMISSOES_RBAC_UI[u.perfil]?.nome || (u.perfil ? u.perfil.toUpperCase() : 'ADMIN');
      const cpfFormatado = typeof mascararCPF === 'function' ? mascararCPF(u.cpf) : u.cpf;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${u.codigo}</code></td>
        <td><strong>${u.nome}</strong></td>
        <td>${cpfFormatado}</td>
        <td><span class="badge-tag" style="background: rgba(0, 45, 98, 0.08); color: var(--gov-primary); font-weight: 700;">${perfilNome}</span></td>
        <td>${u.endereco}</td>
        <td>${u.telefone}</td>
        <td>${u.email}</td>
        <td><span class="badge-status ativo">${u.status}</span></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarUsuario(${u.id})">Editar</button>
            <button class="btn btn-delete" style="padding: 4px 8px; font-size: 0.76rem;" onclick="excluirCadastroUsuario(${u.id})">Excluir</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    items.forEach(u => {
      const perfilNome = PERMISSOES_RBAC_UI[u.perfil]?.nome || (u.perfil ? u.perfil.toUpperCase() : 'ADMIN');
      const cpfFormatado = typeof mascararCPF === 'function' ? mascararCPF(u.cpf) : u.cpf;
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${u.nome}</div>
              <div class="entity-card-subtitle">Código: <code>${u.codigo}</code> • Perfil: <strong>${perfilNome}</strong></div>
            </div>
            <span class="badge-status ativo">${u.status}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Perfil (RBAC):</span><span class="value" style="font-weight:700; color:var(--gov-primary);">${perfilNome}</span></div>
            <div class="entity-card-row"><span class="label">CPF:</span><span class="value">${cpfFormatado}</span></div>
            <div class="entity-card-row"><span class="label">Telefone:</span><span class="value">${u.telefone}</span></div>
            <div class="entity-card-row"><span class="label">E-mail:</span><span class="value">${u.email}</span></div>
            <div class="entity-card-row"><span class="label">Endereço:</span><span class="value">${u.endereco}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-edit" onclick="abrirModalEditarUsuario(${u.id})">Editar</button>
          <button class="btn btn-delete" onclick="excluirCadastroUsuario(${u.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }

  // Aplica as restrições de permissões nos botões renderizados
  aplicarPermissoesPerfilUI(perfilAtivoRBAC);
}

function alternarVisibilidadeSenha(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btnEl) btnEl.textContent = '🔒';
  } else {
    input.type = 'password';
    if (btnEl) btnEl.textContent = '👁️';
  }
}

function abrirModalCadUsuario() {
  document.getElementById('modal-cad-usuario-titulo').textContent = 'Novo Cadastro de Usuário';
  document.getElementById('cad-usu-id').value = '';
  document.getElementById('form-cad-usuario').reset();
  const proximoSeq = String(listaUsuariosGlobal.length + 1).padStart(4, '0');
  document.getElementById('cad-usu-codigo').value = proximoSeq;
  
  const selPerfil = document.getElementById('cad-usu-perfil');
  if (selPerfil) selPerfil.value = 'coordenador';

  // Configuração para novo cadastro: senha recomendada/obrigatória
  const inputSenha = document.getElementById('cad-usu-senha');
  const inputConfirma = document.getElementById('cad-usu-senha-confirma');
  const hintSenha = document.getElementById('hint-cad-usu-senha');
  const labelSenha = document.getElementById('label-cad-usu-senha');

  if (inputSenha) {
    inputSenha.required = true;
    inputSenha.value = '';
    inputSenha.placeholder = 'Mínimo de 6 dígitos';
  }
  if (inputConfirma) {
    inputConfirma.required = true;
    inputConfirma.value = '';
  }
  if (labelSenha) labelSenha.textContent = 'Definir Senha de Acesso *';
  if (hintSenha) hintSenha.textContent = 'Crie uma senha segura com no mínimo 6 caracteres para o acesso do usuário.';

  document.getElementById('btn-submit-usuario').textContent = 'Salvar Usuário';
  document.getElementById('modal-cad-usuario').classList.add('active');
}

function abrirModalEditarUsuario(id) {
  const u = listaUsuariosGlobal.find(item => item.id === id);
  if (!u) return;

  document.getElementById('modal-cad-usuario-titulo').textContent = `Editar Usuário: ${u.nome}`;
  document.getElementById('cad-usu-id').value = u.id;
  document.getElementById('cad-usu-codigo').value = u.codigo;
  document.getElementById('cad-usu-nome').value = u.nome;
  document.getElementById('cad-usu-cpf').value = u.cpf;
  document.getElementById('cad-usu-endereco').value = u.endereco;
  document.getElementById('cad-usu-telefone').value = u.telefone;
  document.getElementById('cad-usu-email').value = u.email;

  const selPerfil = document.getElementById('cad-usu-perfil');
  if (selPerfil) selPerfil.value = u.perfil || 'admin';

  // Na edição a senha é opcional: só altera se o operador digitar uma nova
  const inputSenha = document.getElementById('cad-usu-senha');
  const inputConfirma = document.getElementById('cad-usu-senha-confirma');
  const hintSenha = document.getElementById('hint-cad-usu-senha');
  const labelSenha = document.getElementById('label-cad-usu-senha');

  if (inputSenha) {
    inputSenha.required = false;
    inputSenha.value = '';
    inputSenha.placeholder = 'Deixe em branco para manter a senha atual';
  }
  if (inputConfirma) {
    inputConfirma.required = false;
    inputConfirma.value = '';
  }
  if (labelSenha) labelSenha.textContent = 'Nova Senha (Opcional)';
  if (hintSenha) hintSenha.textContent = 'Preencha apenas caso deseje redefinir ou alterar a senha deste usuário.';

  document.getElementById('btn-submit-usuario').textContent = 'Salvar Alterações';

  document.getElementById('modal-cad-usuario').classList.add('active');
}

async function salvarNovoUsuario(e) {
  e.preventDefault();
  const id = document.getElementById('cad-usu-id').value;
  const nome = document.getElementById('cad-usu-nome').value;
  const cpf = document.getElementById('cad-usu-cpf').value;
  const endereco = document.getElementById('cad-usu-endereco').value;
  const telefone = document.getElementById('cad-usu-telefone').value;
  const email = document.getElementById('cad-usu-email').value;
  const perfil = document.getElementById('cad-usu-perfil')?.value || 'admin';
  const senha = document.getElementById('cad-usu-senha')?.value || '';
  const senhaConfirma = document.getElementById('cad-usu-senha-confirma')?.value || '';

  // Validação de correspondência e comprimento de senha
  if (senha || !id) {
    if (senha.length < 6) {
      mostrarToast("A senha deve conter no mínimo 6 caracteres.", "erro");
      document.getElementById('cad-usu-senha')?.focus();
      return;
    }
    if (senha !== senhaConfirma) {
      mostrarToast("A confirmação de senha não coincide com a senha digitada.", "erro");
      document.getElementById('cad-usu-senha-confirma')?.focus();
      return;
    }
  }

  const payload = { nome, cpf, endereco, telefone, email, perfil };
  if (senha) {
    payload.senha = senha;
  }

  const url = id ? `/api/v1/cadastros/usuarios/${id}` : '/api/v1/cadastros/usuarios';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      fecharModal('modal-cad-usuario');
      document.getElementById('form-cad-usuario').reset();
      mostrarToast(id ? `Usuário ${nome} atualizado com sucesso!` : `Usuário ${nome} cadastrado com sucesso!`);
      await carregarUsuarios();
    } else {
      const err = await res.json();
      mostrarToast(err.detail || "Erro ao processar dados do usuário", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao comunicar com o servidor", "erro");
  }
}

async function excluirCadastroUsuario(id) {
  if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
  try {
    const res = await fetch(`/api/v1/cadastros/usuarios/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast("Usuário excluído com sucesso!");
      await carregarUsuarios();
    } else {
      const err = await res.json();
      mostrarToast(err.detail || "Erro ao excluir usuário", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao excluir usuário", "erro");
  }
}

// ------------------------------------------
// 2.b ESCOLAS
// ------------------------------------------
async function carregarEscolasCadastradas() {
  try {
    const res = await fetch('/api/v1/cadastros/escolas');
    if (res.ok) {
      listaEscolasGlobal = await res.json();
      renderizarEscolasCadastros(listaEscolasGlobal);
      popularSelectEscolas(listaEscolasGlobal);
    }
  } catch (err) { console.error(err); }
}

function renderizarEscolasCadastros(items) {
  const tbody = document.getElementById('tabela-cad-escolas-body');
  const cardsContainer = document.getElementById('view-escolas-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${e.codigo}</code></td>
        <td><strong>${e.nome}</strong></td>
        <td>${e.endereco}</td>
        <td>${e.numero}</td>
        <td>${e.bairro}</td>
        <td>${e.telefone}</td>
        <td><code>${e.codigo_inep || '—'}</code></td>
        <td><strong>${e.total_alunos}</strong></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarEscola(${e.id})">Editar</button>
            <button class="btn btn-delete" style="padding: 4px 8px; font-size: 0.76rem;" onclick="excluirCadastroEscola(${e.id})">Excluir</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    items.forEach(e => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${e.nome}</div>
              <div class="entity-card-subtitle">Código: <code>${e.codigo}</code> • Polo: ${e.tipo_unidade}</div>
            </div>
            <span class="badge-status ativo">${e.status}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Endereço:</span><span class="value">${e.endereco}, nº ${e.numero}</span></div>
            <div class="entity-card-row"><span class="label">Bairro:</span><span class="value">${e.bairro}</span></div>
            <div class="entity-card-row"><span class="label">Telefone:</span><span class="value">${e.telefone}</span></div>
            <div class="entity-card-row"><span class="label">INEP:</span><span class="value">${e.codigo_inep || '—'}</span></div>
            <div class="entity-card-row"><span class="label">Total de Alunos:</span><span class="value">${e.total_alunos}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-edit" onclick="abrirModalEditarEscola(${e.id})">Editar</button>
          <button class="btn btn-delete" onclick="excluirCadastroEscola(${e.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function abrirModalCadEscola() {
  document.getElementById('modal-cad-escola-titulo').textContent = 'Novo Cadastro de Escola';
  document.getElementById('cad-esc-id').value = '';
  document.getElementById('form-cad-escola').reset();
  const proximoSeq = String(listaEscolasGlobal.length + 1).padStart(3, '0');
  document.getElementById('cad-esc-codigo').value = proximoSeq;
  document.getElementById('btn-submit-escola').textContent = 'Cadastrar Escola';
  document.getElementById('modal-cad-escola').classList.add('active');
}

function abrirModalEditarEscola(id) {
  const e = listaEscolasGlobal.find(item => item.id === id);
  if (!e) return;

  document.getElementById('modal-cad-escola-titulo').textContent = `Editar Escola: ${e.nome}`;
  document.getElementById('cad-esc-id').value = e.id;
  document.getElementById('cad-esc-codigo').value = e.codigo;
  document.getElementById('cad-esc-nome').value = e.nome;
  document.getElementById('cad-esc-endereco').value = e.endereco;
  document.getElementById('cad-esc-numero').value = e.numero;
  document.getElementById('cad-esc-bairro').value = e.bairro;
  document.getElementById('cad-esc-telefone').value = e.telefone;
  document.getElementById('cad-esc-inep').value = e.codigo_inep || '';
  document.getElementById('cad-esc-tipo').value = e.tipo_unidade || 'Urbana';
  document.getElementById('btn-submit-escola').textContent = 'Salvar Alterações';

  document.getElementById('modal-cad-escola').classList.add('active');
}

async function salvarNovaEscola(e) {
  e.preventDefault();
  const id = document.getElementById('cad-esc-id').value;
  const nome = document.getElementById('cad-esc-nome').value;
  const endereco = document.getElementById('cad-esc-endereco').value;
  const numero = document.getElementById('cad-esc-numero').value;
  const bairro = document.getElementById('cad-esc-bairro').value;
  const telefone = document.getElementById('cad-esc-telefone').value;
  const codigo_inep = document.getElementById('cad-esc-inep').value;
  const tipo_unidade = document.getElementById('cad-esc-tipo').value;

  const url = id ? `/api/v1/cadastros/escolas/${id}` : '/api/v1/cadastros/escolas';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, endereco, numero, bairro, telefone, codigo_inep, tipo_unidade })
    });
    if (res.ok) {
      fecharModal('modal-cad-escola');
      document.getElementById('form-cad-escola').reset();
      mostrarToast(id ? `Escola ${nome} atualizada com sucesso!` : `Escola ${nome} cadastrada com sucesso!`);
      await carregarEscolasCadastradas();
      await carregarEscolas();
    } else {
      mostrarToast("Erro ao processar escola", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao cadastrar escola", "erro");
  }
}

async function excluirCadastroEscola(id) {
  if (!confirm("Tem certeza que deseja excluir esta escola?")) return;
  try {
    const res = await fetch(`/api/v1/cadastros/escolas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast("Escola excluída com sucesso!");
      await carregarEscolasCadastradas();
      await carregarEscolas();
    } else {
      const err = await res.json();
      mostrarToast(err.detail || "Erro ao excluir escola", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao excluir escola", "erro");
  }
}

// ------------------------------------------
// 2.c ALUNOS
// ------------------------------------------
async function carregarAlunosCadastrados() {
  try {
    const res = await fetch('/api/v1/cadastros/alunos');
    if (res.ok) {
      listaAlunosGlobal = await res.json();
      popularFiltrosCadAlunos();
      popularFiltrosEstudantes();
      renderizarAlunosCadastros(listaAlunosGlobal);
    }
  } catch (err) { console.error(err); }
}

function renderizarAlunosCadastros(items) {
  const tbody = document.getElementById('tabela-cad-alunos-body');
  const cardsContainer = document.getElementById('view-alunos-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${a.codigo_escola}</code></td>
        <td><strong>${a.nome_escola}</strong></td>
        <td><code>${a.codigo_aluno}</code></td>
        <td><code>${a.codigo_inep}</code></td>
        <td><strong>${a.nome}</strong></td>
        <td>${a.nome_responsavel}</td>
        <td>${a.endereco}</td>
        <td>${a.telefone_responsavel}</td>
        <td><span class="badge-tag primary">${a.turma}</span></td>
        <td>${a.sala}</td>
        <td>${a.turno}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarAluno(${a.id})">Editar</button>
            <button class="btn btn-delete" style="padding: 4px 8px; font-size: 0.76rem;" onclick="excluirCadastroAluno(${a.id})">Excluir</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    items.forEach(a => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${a.nome}</div>
              <div class="entity-card-subtitle">Cód: <code>${a.codigo_aluno}</code> • INEP: <code>${a.codigo_inep}</code></div>
            </div>
            <span class="badge-tag primary">${a.turma}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Escola:</span><span class="value">${a.nome_escola}</span></div>
            <div class="entity-card-row"><span class="label">Responsável:</span><span class="value">${a.nome_responsavel}</span></div>
            <div class="entity-card-row"><span class="label">Telefone:</span><span class="value">${a.telefone_responsavel}</span></div>
            <div class="entity-card-row"><span class="label">Sala / Turno:</span><span class="value">${a.sala} • ${a.turno}</span></div>
            <div class="entity-card-row"><span class="label">Média LP / MAT:</span><span class="value">${formatarNota(a.nota_lp)} / ${formatarNota(a.nota_mat)}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-edit" onclick="abrirModalEditarAluno(${a.id})">Editar</button>
          <button class="btn btn-delete" onclick="excluirCadastroAluno(${a.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function abrirModalCadAluno() {
  document.getElementById('modal-cad-aluno-titulo').textContent = 'Novo Cadastro de Aluno';
  document.getElementById('cad-alu-id').value = '';
  document.getElementById('form-cad-aluno').reset();
  popularSelectEscolas(listaEscolasGlobal);
  const proximoSeq = String(listaAlunosGlobal.length + 1).padStart(4, '0');
  document.getElementById('cad-alu-codigo').value = proximoSeq;

  const escolaCodigo = document.getElementById('cad-alu-escola-select').value;
  popularSelectTurmasAluno(escolaCodigo, '');

  document.getElementById('btn-submit-aluno').textContent = 'Cadastrar Aluno';
  document.getElementById('modal-cad-aluno').classList.add('active');
}

function abrirModalEditarAluno(id) {
  const a = listaAlunosGlobal.find(item => item.id === id);
  if (!a) return;

  popularSelectEscolas(listaEscolasGlobal);

  document.getElementById('modal-cad-aluno-titulo').textContent = `Editar Estudante: ${a.nome}`;
  document.getElementById('cad-alu-id').value = a.id;
  document.getElementById('cad-alu-codigo').value = a.codigo_aluno;
  document.getElementById('cad-alu-escola-select').value = a.codigo_escola;
  document.getElementById('cad-alu-escola-nome').value = a.nome_escola;
  document.getElementById('cad-alu-inep').value = a.codigo_inep;
  document.getElementById('cad-alu-nome').value = a.nome;
  document.getElementById('cad-alu-responsavel').value = a.nome_responsavel;
  document.getElementById('cad-alu-tel-resp').value = a.telefone_responsavel;
  document.getElementById('cad-alu-endereco').value = a.endereco;
  
  // Popular turmas da escola do aluno e pre-selecionar a turma atual
  popularSelectTurmasAluno(a.codigo_escola, a.turma);

  document.getElementById('cad-alu-sala').value = a.sala;
  document.getElementById('cad-alu-turno').value = a.turno;
  document.getElementById('btn-submit-aluno').textContent = 'Salvar Alterações';

  document.getElementById('modal-cad-aluno').classList.add('active');
}

async function popularSelectTurmasAluno(codigoEscola, turmaSelecionada = '') {
  const selTurma = document.getElementById('cad-alu-turma');
  if (!selTurma) return;

  // Se listaTurmasGlobal ainda não foi carregada, busca da API
  if (!listaTurmasGlobal || listaTurmasGlobal.length === 0) {
    try {
      const res = await fetch('/api/v1/cadastros/turmas');
      if (res.ok) {
        listaTurmasGlobal = await res.json();
      }
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
    }
  }

  // Filtrar turmas cadastradas na aba Cadastros > Turmas para a escola selecionada
  let turmasDisponiveis = (listaTurmasGlobal || []).filter(t => t.codigo_escola === codigoEscola);
  
  // Se não encontrar nenhuma para a escola específica, oferecer todas as turmas cadastradas como alternativa
  if (turmasDisponiveis.length === 0 && listaTurmasGlobal && listaTurmasGlobal.length > 0) {
    turmasDisponiveis = listaTurmasGlobal;
  }

  let options = '<option value="">-- Selecione a Turma --</option>';

  let encontrou = false;
  const tNorm = (turmaSelecionada || '').trim().toLowerCase();

  turmasDisponiveis.forEach(t => {
    const turmaItemNorm = (t.turma || '').trim().toLowerCase();
    const isSelected = (turmaSelecionada && (t.turma === turmaSelecionada || turmaItemNorm === tNorm));
    if (isSelected) encontrou = true;
    options += `<option value="${t.turma}" data-sala="${t.sala || ''}" data-turno="${t.turno || ''}" ${isSelected ? 'selected' : ''}>${t.turma} (${t.turno} - ${t.nome_escola})</option>`;
  });

  // Se o aluno já possuía uma turma antiga que não consta na lista, incluir para não perder o dado
  if (turmaSelecionada && !encontrou) {
    options += `<option value="${turmaSelecionada}" selected>${turmaSelecionada} (Atual)</option>`;
  }

  selTurma.innerHTML = options;
}

function aoSelecionarTurmaAluno(turmaNome) {
  if (!turmaNome) return;
  const selTurma = document.getElementById('cad-alu-turma');
  const opt = selTurma ? selTurma.selectedOptions[0] : null;
  if (opt) {
    const sala = opt.getAttribute('data-sala');
    const turno = opt.getAttribute('data-turno');
    if (sala) {
      const inputSala = document.getElementById('cad-alu-sala');
      if (inputSala) inputSala.value = sala;
    }
    if (turno) {
      const selTurno = document.getElementById('cad-alu-turno');
      if (selTurno) selTurno.value = turno;
    }
  }
}

function popularSelectEscolas(escolas) {
  const selAluno = document.getElementById('cad-alu-escola-select');
  const selTurma = document.getElementById('cad-tur-escola-select');
  const selMatriz = document.getElementById('cad-mat-escola-select');

  const options = escolas.map(e => `<option value="${e.codigo}" data-nome="${e.nome}">[${e.codigo}] ${e.nome}</option>`).join('');

  if (selAluno) {
    selAluno.innerHTML = options;
    if (escolas.length > 0 && !selAluno.value) atualizarNomeEscolaPorCodigo(escolas[0].codigo);
  }
  if (selTurma) {
    selTurma.innerHTML = options;
    if (escolas.length > 0 && !selTurma.value) atualizarNomeEscolaTurmaPorCodigo(escolas[0].codigo);
  }
  if (selMatriz) {
    selMatriz.innerHTML = options;
  }
}

function atualizarNomeEscolaPorCodigo(codigo) {
  const esc = listaEscolasGlobal.find(e => e.codigo === codigo);
  const inputNome = document.getElementById('cad-alu-escola-nome');
  if (inputNome && esc) inputNome.value = esc.nome;
  
  // Atualizar dinamicamente as turmas disponíveis para a escola recém-selecionada
  popularSelectTurmasAluno(codigo, '');
}

function atualizarNomeEscolaTurmaPorCodigo(codigo) {
  const esc = listaEscolasGlobal.find(e => e.codigo === codigo);
  const inputNome = document.getElementById('cad-tur-escola-nome');
  if (inputNome && esc) inputNome.value = esc.nome;
}

async function salvarNovoAluno(e) {
  e.preventDefault();
  const id = document.getElementById('cad-alu-id').value;
  const codigo_escola = document.getElementById('cad-alu-escola-select').value;
  const nome_escola = document.getElementById('cad-alu-escola-nome').value;
  const codigo_inep = document.getElementById('cad-alu-inep').value;
  const nome = document.getElementById('cad-alu-nome').value;
  const nome_responsavel = document.getElementById('cad-alu-responsavel').value;
  const telefone_responsavel = document.getElementById('cad-alu-tel-resp').value;
  const endereco = document.getElementById('cad-alu-endereco').value;
  const turma = document.getElementById('cad-alu-turma').value;
  const sala = document.getElementById('cad-alu-sala').value;
  const turno = document.getElementById('cad-alu-turno').value;

  const url = id ? `/api/v1/cadastros/alunos/${id}` : '/api/v1/cadastros/alunos';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_escola, nome_escola, codigo_inep, nome, nome_responsavel, telefone_responsavel, endereco, turma, sala, turno
      })
    });
    if (res.ok) {
      fecharModal('modal-cad-aluno');
      document.getElementById('form-cad-aluno').reset();
      mostrarToast(id ? `Aluno ${nome} atualizado com sucesso!` : `Aluno ${nome} cadastrado com sucesso!`);
      await carregarAlunosCadastrados();
      await carregarTurmasCadastradas();
      await carregarEscolasCadastradas();
      if (typeof carregarEscolas === 'function') await carregarEscolas();
      if (typeof carregarTodasMetricas === 'function') carregarTodasMetricas();
      await carregarAlunos();
    } else {
      mostrarToast("Erro ao processar aluno", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao cadastrar aluno", "erro");
  }
}

async function excluirCadastroAluno(id) {
  if (!confirm("Tem certeza que deseja excluir este aluno?")) return;
  try {
    const res = await fetch(`/api/v1/cadastros/alunos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast("Aluno excluído com sucesso!");
      await carregarAlunosCadastrados();
      await carregarTurmasCadastradas();
      await carregarEscolasCadastradas();
      if (typeof carregarEscolas === 'function') await carregarEscolas();
      if (typeof carregarTodasMetricas === 'function') carregarTodasMetricas();
      await carregarAlunos();
    } else {
      const err = await res.json();
      mostrarToast(err.detail || "Erro ao excluir aluno", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao excluir aluno", "erro");
  }
}

// ------------------------------------------
// 2.d TURMAS
// ------------------------------------------
async function carregarTurmasCadastradas() {
  try {
    const res = await fetch('/api/v1/cadastros/turmas');
    if (res.ok) {
      listaTurmasGlobal = await res.json();
      popularFiltrosCadTurmas();
      renderizarTurmasCadastros(listaTurmasGlobal);
    }
  } catch (err) { console.error(err); }
}

function renderizarTurmasCadastros(items) {
  const tbody = document.getElementById('tabela-cad-turmas-body');
  const cardsContainer = document.getElementById('view-turmas-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${t.codigo_escola}</code></td>
        <td><strong>${t.nome_escola}</strong></td>
        <td>${t.periodo_letivo}</td>
        <td><span class="badge-tag primary">${t.modalidade}</span></td>
        <td>${t.etapa}</td>
        <td><strong>${t.turma}</strong></td>
        <td>${t.turno}</td>
        <td>${t.sala}</td>
        <td><strong>${t.total_alunos}</strong> alunos</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarTurma(${t.id})">Editar</button>
            <button class="btn btn-delete" style="padding: 4px 8px; font-size: 0.76rem;" onclick="excluirCadastroTurma(${t.id})">Excluir</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    items.forEach(t => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${t.turma}</div>
              <div class="entity-card-subtitle">${t.nome_escola} (Cód: ${t.codigo_escola})</div>
            </div>
            <span class="badge-tag primary">${t.turno}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Modalidade:</span><span class="value">${t.modalidade}</span></div>
            <div class="entity-card-row"><span class="label">Etapa:</span><span class="value">${t.etapa}</span></div>
            <div class="entity-card-row"><span class="label">Período:</span><span class="value">${t.periodo_letivo}</span></div>
            <div class="entity-card-row"><span class="label">Sala / Alunos:</span><span class="value">${t.sala} • ${t.total_alunos} estudantes</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-edit" onclick="abrirModalEditarTurma(${t.id})">Editar</button>
          <button class="btn btn-delete" onclick="excluirCadastroTurma(${t.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function abrirModalCadTurma() {
  document.getElementById('modal-cad-turma-titulo').textContent = 'Cadastro de Turma Escolar';
  document.getElementById('cad-tur-id').value = '';
  document.getElementById('form-cad-turma').reset();
  popularSelectEscolas(listaEscolasGlobal);
  document.getElementById('btn-submit-turma').textContent = 'Cadastrar Turma';
  document.getElementById('modal-cad-turma').classList.add('active');
}

function abrirModalEditarTurma(id) {
  const t = listaTurmasGlobal.find(item => item.id === id);
  if (!t) return;

  popularSelectEscolas(listaEscolasGlobal);

  document.getElementById('modal-cad-turma-titulo').textContent = `Editar Turma: ${t.turma}`;
  document.getElementById('cad-tur-id').value = t.id;
  document.getElementById('cad-tur-escola-select').value = t.codigo_escola;
  document.getElementById('cad-tur-escola-nome').value = t.nome_escola;
  document.getElementById('cad-tur-periodo').value = t.periodo_letivo;
  document.getElementById('cad-tur-modalidade').value = t.modalidade;
  document.getElementById('cad-tur-etapa').value = t.etapa;
  document.getElementById('cad-tur-nome').value = t.turma;
  document.getElementById('cad-tur-turno').value = t.turno;
  document.getElementById('btn-submit-turma').textContent = 'Salvar Alterações';

  document.getElementById('modal-cad-turma').classList.add('active');
}

async function salvarNovaTurma(e) {
  e.preventDefault();
  const id = document.getElementById('cad-tur-id').value;
  const codigo_escola = document.getElementById('cad-tur-escola-select').value;
  const nome_escola = document.getElementById('cad-tur-escola-nome').value;
  const periodo_letivo = document.getElementById('cad-tur-periodo').value;
  const modalidade = document.getElementById('cad-tur-modalidade').value;
  const etapa = document.getElementById('cad-tur-etapa').value;
  const turma = document.getElementById('cad-tur-nome').value;
  const turno = document.getElementById('cad-tur-turno').value;

  const url = id ? `/api/v1/cadastros/turmas/${id}` : '/api/v1/cadastros/turmas';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo_escola, nome_escola, periodo_letivo, modalidade, etapa, turma, turno })
    });
    if (res.ok) {
      fecharModal('modal-cad-turma');
      document.getElementById('form-cad-turma').reset();
      mostrarToast(id ? `Turma ${turma} atualizada com sucesso!` : `Turma ${turma} cadastrada com sucesso!`);
      await carregarTurmasCadastradas();
      await carregarEscolasCadastradas();
      if (typeof carregarEscolas === 'function') await carregarEscolas();
    } else {
      mostrarToast("Erro ao processar turma", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao cadastrar turma", "erro");
  }
}

async function excluirCadastroTurma(id) {
  if (!confirm("Tem certeza que deseja excluir esta turma?")) return;
  try {
    const res = await fetch(`/api/v1/cadastros/turmas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast("Turma excluída com sucesso!");
      await carregarTurmasCadastradas();
      await carregarEscolasCadastradas();
      if (typeof carregarEscolas === 'function') await carregarEscolas();
    } else {
      const err = await res.json();
      mostrarToast(err.detail || "Erro ao excluir turma", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao excluir turma", "erro");
  }
}

// ------------------------------------------
// 2.f MATRIZ CURRICULAR (DISCIPLINA)
// ------------------------------------------
async function carregarMatrizCurricular() {
  try {
    const res = await fetch('/api/v1/cadastros/matriz-curricular');
    if (res.ok) {
      listaMatrizGlobal = await res.json();
      renderizarMatrizCadastros(listaMatrizGlobal);
    }
  } catch (err) { console.error(err); }
}

function renderizarMatrizCadastros(items) {
  const tbody = document.getElementById('tabela-cad-matriz-body');
  const cardsContainer = document.getElementById('view-matriz-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${m.codigo_escola}</code></td>
        <td><strong>${m.nome_escola}</strong></td>
        <td><span class="badge-tag primary">${m.turma}</span></td>
        <td>${m.sala}</td>
        <td>${m.turno}</td>
        <td><strong>${m.nome_disciplina}</strong></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarMatriz(${m.id})">Editar</button>
            <button class="btn btn-delete" style="padding: 4px 8px; font-size: 0.76rem;" onclick="excluirCadastroMatriz(${m.id})">Excluir</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    items.forEach(m => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${m.nome_disciplina}</div>
              <div class="entity-card-subtitle">${m.nome_escola}</div>
            </div>
            <span class="badge-tag primary">${m.turma}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Sala / Turno:</span><span class="value">${m.sala} • ${m.turno}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-edit" onclick="abrirModalEditarMatriz(${m.id})">Editar</button>
          <button class="btn btn-delete" onclick="excluirCadastroMatriz(${m.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function aoMudarEscolaMatriz(codigoEscola, turmaPreSelecionada = '') {
  const esc = (listaEscolasGlobal || []).find(e => e.codigo === codigoEscola);
  const codInput = document.getElementById('cad-mat-escola-cod');
  if (codInput) codInput.value = esc ? esc.codigo : codigoEscola;

  popularSelectTurmasMatriz(codigoEscola, turmaPreSelecionada);
}

function popularSelectTurmasMatriz(codigoEscola, turmaSelecionada = '') {
  const selTurma = document.getElementById('cad-mat-turma-select');
  if (!selTurma) return;

  let turmasDisponiveis = (listaTurmasGlobal || []).filter(t => t.codigo_escola === codigoEscola);
  if (turmasDisponiveis.length === 0 && listaTurmasGlobal && listaTurmasGlobal.length > 0) {
    turmasDisponiveis = listaTurmasGlobal;
  }

  let options = '<option value="">-- Selecione a Turma --</option>';
  let encontrou = false;
  const tNorm = (turmaSelecionada || '').trim().toLowerCase();

  turmasDisponiveis.forEach(t => {
    const isSelected = turmaSelecionada && (t.turma === turmaSelecionada || (t.turma || '').trim().toLowerCase() === tNorm);
    if (isSelected) encontrou = true;
    options += `<option value="${t.turma}" data-sala="${t.sala || ''}" data-turno="${t.turno || ''}" ${isSelected ? 'selected' : ''}>${t.turma} (${t.turno} - ${t.nome_escola})</option>`;
  });

  if (turmaSelecionada && !encontrou) {
    options += `<option value="${turmaSelecionada}" selected>${turmaSelecionada}</option>`;
  }

  selTurma.innerHTML = options;

  if (selTurma.value) {
    aoMudarTurmaMatriz(selTurma.value);
  }
}

function aoMudarTurmaMatriz(turmaNome) {
  if (!turmaNome) return;
  const selTurma = document.getElementById('cad-mat-turma-select');
  const opt = selTurma ? selTurma.selectedOptions[0] : null;
  if (opt) {
    const sala = opt.getAttribute('data-sala');
    const turno = opt.getAttribute('data-turno');
    if (sala) {
      const inputSala = document.getElementById('cad-mat-sala');
      if (inputSala) inputSala.value = sala;
    }
    if (turno) {
      const selTurno = document.getElementById('cad-mat-turno');
      if (selTurno) selTurno.value = turno;
    }
  }
}

function abrirModalCadMatriz() {
  document.getElementById('modal-cad-matriz-titulo').textContent = 'Nova Disciplina / Matriz Curricular';
  document.getElementById('cad-mat-id').value = '';
  document.getElementById('form-cad-matriz').reset();

  popularSelectEscolas(listaEscolasGlobal);

  const selEscola = document.getElementById('cad-mat-escola-select');
  if (selEscola && listaEscolasGlobal.length > 0) {
    selEscola.value = listaEscolasGlobal[0].codigo;
    aoMudarEscolaMatriz(listaEscolasGlobal[0].codigo);
  }

  document.getElementById('btn-submit-matriz').textContent = 'Adicionar Disciplina';
  document.getElementById('modal-cad-matriz').classList.add('active');
}

function abrirModalEditarMatriz(id) {
  const m = listaMatrizGlobal.find(item => item.id === id);
  if (!m) return;

  popularSelectEscolas(listaEscolasGlobal);

  document.getElementById('modal-cad-matriz-titulo').textContent = `Editar Matriz: ${m.nome_disciplina}`;
  document.getElementById('cad-mat-id').value = m.id;
  document.getElementById('cad-mat-escola-cod').value = m.codigo_escola;

  const selEscola = document.getElementById('cad-mat-escola-select');
  if (selEscola) {
    selEscola.value = m.codigo_escola;
    aoMudarEscolaMatriz(m.codigo_escola, m.turma);
  }

  const elAlunoCod = document.getElementById('cad-mat-aluno-cod');
  if (elAlunoCod) elAlunoCod.value = m.codigo_aluno || '';
  const elInep = document.getElementById('cad-mat-inep');
  if (elInep) elInep.value = m.codigo_inep || '';
  document.getElementById('cad-mat-sala').value = m.sala;
  document.getElementById('cad-mat-turno').value = m.turno;
  document.getElementById('cad-mat-nome').value = m.nome_disciplina;
  document.getElementById('btn-submit-matriz').textContent = 'Salvar Alterações';

  document.getElementById('modal-cad-matriz').classList.add('active');
}

async function salvarNovaMatriz(e) {
  e.preventDefault();
  const id = document.getElementById('cad-mat-id').value;
  const codigo_escola = document.getElementById('cad-mat-escola-cod').value;

  const selEscola = document.getElementById('cad-mat-escola-select');
  const optEscola = selEscola ? selEscola.selectedOptions[0] : null;
  const nome_escola = optEscola ? (optEscola.getAttribute('data-nome') || optEscola.textContent.replace(/\[.*?\]\s*/, '')) : '';

  const codigo_aluno = document.getElementById('cad-mat-aluno-cod') ? document.getElementById('cad-mat-aluno-cod').value : '';
  const codigo_inep = document.getElementById('cad-mat-inep') ? document.getElementById('cad-mat-inep').value : '';
  const turma = document.getElementById('cad-mat-turma-select').value;
  const sala = document.getElementById('cad-mat-sala').value;
  const turno = document.getElementById('cad-mat-turno').value;
  const nome_disciplina = document.getElementById('cad-mat-nome').value;

  const url = id ? `/api/v1/cadastros/matriz-curricular/${id}` : '/api/v1/cadastros/matriz-curricular';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_escola, nome_escola, codigo_aluno, codigo_inep, turma, sala, turno, nome_disciplina
      })
    });
    if (res.ok) {
      fecharModal('modal-cad-matriz');
      document.getElementById('form-cad-matriz').reset();
      mostrarToast(id ? `Disciplina ${nome_disciplina} atualizada na matriz!` : `Disciplina ${nome_disciplina} adicionada à matriz curricular!`);
      await carregarMatrizCurricular();
    } else {
      mostrarToast("Erro ao processar matriz", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao cadastrar disciplina", "erro");
  }
}

async function excluirCadastroMatriz(id) {
  if (!confirm("Tem certeza que deseja excluir esta disciplina da matriz curricular?")) return;
  try {
    const res = await fetch(`/api/v1/cadastros/matriz-curricular/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast("Disciplina excluída da matriz com sucesso!");
      await carregarMatrizCurricular();
    } else {
      const err = await res.json();
      mostrarToast(err.detail || "Erro ao excluir disciplina", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao excluir disciplina", "erro");
  }
}

