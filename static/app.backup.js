// ==========================================
// AVALIA AB - Plataforma de Avaliação Educacional
// Município de Água Boa - MT • Controlador Reativo SPA
// ==========================================

// Variáveis Globais de Estado
let chartHistorico = null;
let chartNiveis = null;
let chartEscolas = null;
let chartMetas = null;

let listaAvaliacoesGlobal = [];
let listaEscolasGlobal = [];
let listaAlunosGlobal = [];
let listaUsuariosGlobal = [];
let listaCargosGlobal = [];
let listaTurmasGlobal = [];
let listaMatrizGlobal = [];

let subAbaCadastroAtual = 'usuarios';
let subAbaConfigAtual = 'seguranca';

// Modos de exibição independentes por sub-aba e tela (lista / cartoes)
let modoExibicaoPorSubAba = {
  'usuarios': 'lista',
  'cargos': 'lista',
  'escolas': 'lista',
  'turmas': 'lista',
  'alunos': 'lista',
  'matriz': 'lista'
};
let modoExibicaoAvaliacoes = 'lista';
let modoExibicaoEscolas = 'cartoes';
let modoExibicaoAlunos = 'lista';

// --- CONTROLE DE ACESSO RBAC (POLÍTICAS E PERFIS) ---
let perfilAtivoRBAC = localStorage.getItem('avalia_ab_perfil') || 'admin';

const PERMISSOES_RBAC_UI = {
  admin: {
    nome: "Administrador (SEDUC / TI)",
    podeConfigurar: true,
    podeCadastros: true,
    podeInserirNotas: true,
    podeRelatorios: true,
    podeExcluir: true,
    podeExportar: true,
    telasPermitidas: ['dashboard', 'cadastros', 'escolas', 'alunos', 'notas', 'relatorios', 'configuracoes']
  },
  coordenador: {
    nome: "Coordenador Pedagógico",
    podeConfigurar: false,
    podeCadastros: true,
    podeInserirNotas: true,
    podeRelatorios: true,
    podeExcluir: false,
    podeExportar: true,
    telasPermitidas: ['dashboard', 'cadastros', 'escolas', 'alunos', 'notas', 'relatorios']
  },
  diretor: {
    nome: "Diretor / Secretário Escolar",
    podeConfigurar: false,
    podeCadastros: true,
    podeInserirNotas: true,
    podeRelatorios: true,
    podeExcluir: false,
    podeExportar: true,
    telasPermitidas: ['dashboard', 'cadastros', 'escolas', 'alunos', 'notas', 'relatorios']
  },
  professor: {
    nome: "Professor / Docente",
    podeConfigurar: false,
    podeCadastros: false,
    podeInserirNotas: true,
    podeRelatorios: true,
    podeExcluir: false,
    podeExportar: false,
    telasPermitidas: ['dashboard', 'notas', 'alunos', 'relatorios']
  }
};

// Utilitário de Debounce para Otimização de Performance em Buscas e Eventos
function debounce(func, wait = 250) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Helper global para formatar notas na escala 0 a 10 no padrão brasileiro (Ex: 7,5)
function formatarNota(valor) {
  if (valor === undefined || valor === null || isNaN(valor)) return '—';
  const num = Number(valor);
  return num.toFixed(1).replace('.', ',');
}

// Helper global para converter entrada digitada (com vírgula ou ponto) para número
function converterNotaParaNumero(strVal) {
  if (strVal === undefined || strVal === null) return 0.0;
  if (typeof strVal === 'number') return Math.max(0.0, Math.min(10.0, strVal));
  const normalizada = String(strVal).trim().replace(',', '.');
  const parsed = parseFloat(normalizada);
  if (isNaN(parsed)) return 0.0;
  return Math.max(0.0, Math.min(10.0, parsed));
}

// --- 1. ROTEAMENTO DE TELAS PRINCIPAIS SPA COM POLÍTICA RBAC ---
function trocarTela(screenId) {
  const perm = PERMISSOES_RBAC_UI[perfilAtivoRBAC] || PERMISSOES_RBAC_UI['admin'];
  if (!perm.telasPermitidas.includes(screenId)) {
    mostrarToast(`Acesso negado: Perfil "${perm.nome}" não possui permissão para acessar esta seção.`, "erro");
    return;
  }

  const screens = document.querySelectorAll('.screen-view');
  screens.forEach(s => s.style.display = 'none');

  const target = document.getElementById(`screen-${screenId}`);
  if (target) {
    target.style.display = 'block';
  }

  // Atualizar visual dos botões da barra superior
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  navBtns.forEach(btn => {
    if (btn.getAttribute('data-screen') === screenId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Gatilhos específicos por tela
  if (screenId === 'cadastros') {
    carregarDadosCadastros();
  } else if (screenId === 'configuracoes') {
    carregarConfiguracoes();
  } else if (screenId === 'relatorios') {
    inicializarModuloRelatorios();
  } else if (screenId === 'escolas') {
    carregarEscolas();
  } else if (screenId === 'alunos') {
    carregarAlunos();
  } else if (screenId === 'avaliacoes') {
    carregarAvaliacoes();
  } else if (screenId === 'notas') {
    carregarDadosModuloNotas();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Manipulador de mudança de perfil ativo (RBAC) via seletor do header
function aoMudarPerfilAtivoRBAC(novoPerfil) {
  perfilAtivoRBAC = novoPerfil || 'admin';
  localStorage.setItem('avalia_ab_perfil', perfilAtivoRBAC);
  aplicarPermissoesPerfilUI(perfilAtivoRBAC);
  mostrarToast(`Perfil ativo alterado para: ${PERMISSOES_RBAC_UI[perfilAtivoRBAC]?.nome || perfilAtivoRBAC}`);
}

// Aplica as regras de visibilidade e bloqueio de botões conforme o perfil selecionado
function aplicarPermissoesPerfilUI(perfil) {
  const perm = PERMISSOES_RBAC_UI[perfil] || PERMISSOES_RBAC_UI['admin'];

  // Sincronizar o seletor do header se existir
  const selHeader = document.getElementById('select-perfil-rbac');
  if (selHeader && selHeader.value !== perfil) {
    selHeader.value = perfil;
  }

  // Ocultar ou exibir abas do menu de navegação
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  navBtns.forEach(btn => {
    const screen = btn.getAttribute('data-screen');
    if (perm.telasPermitidas.includes(screen)) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });

  // Se o usuário estiver numa tela não permitida para seu novo perfil, redireciona para o Painel Geral
  const activeScreenBtn = document.querySelector('.nav-tab-btn.active');
  const currentScreen = activeScreenBtn ? activeScreenBtn.getAttribute('data-screen') : 'dashboard';
  if (!perm.telasPermitidas.includes(currentScreen)) {
    trocarTela('dashboard');
  }

  // Controle de botões de exclusão (Apenas perfis autorizados podem deletar registros)
  const botoesExcluir = document.querySelectorAll('.btn-delete');
  botoesExcluir.forEach(btn => {
    if (!perm.podeExcluir) {
      btn.disabled = true;
      btn.style.opacity = '0.35';
      btn.style.cursor = 'not-allowed';
      btn.title = 'Seu perfil de acesso não tem permissão para excluir registros';
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.removeAttribute('title');
    }
  });
}

// Configurar listeners nas abas de navegação
document.querySelectorAll('.nav-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const screen = btn.getAttribute('data-screen');
    if (screen) trocarTela(screen);
  });
});

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
    'filtros-especificos-cargos',
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
    else if (subId === 'cargos') popularFiltrosCadCargos();
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
    'cargos': { label: '+ Novo Cargo', fn: 'abrirModalCadCargo()' },
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

  const listaEl = document.getElementById(`view-${subAbaCadastroAtual}-lista`);
  const cardsEl = document.getElementById(`view-${subAbaCadastroAtual}-cartoes`);

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
  const selCargo = document.getElementById('filtro-cad-usu-cargo');
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
  popularSelectUnico(selCargo, listaUsuariosGlobal.map(u => u.cargo), 'Todos os Cargos');
  popularSelectUnico(selEndereco, listaUsuariosGlobal.map(u => u.endereco), 'Todos os Endereços');
  popularSelectUnico(selTelefone, listaUsuariosGlobal.map(u => u.telefone), 'Todos os Telefones');
  popularSelectUnico(selEmail, listaUsuariosGlobal.map(u => u.email), 'Todos os E-mails');
}

function popularFiltrosCadCargos() {
  const selCodigo = document.getElementById('filtro-cad-car-codigo');
  const selCargo = document.getElementById('filtro-cad-car-cargo');
  const selDepartamento = document.getElementById('filtro-cad-car-departamento');
  const selData = document.getElementById('filtro-cad-car-data');

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

  popularSelectUnico(selCodigo, listaCargosGlobal.map(c => c.codigo_cargo || c.codigo_usuario), 'Todos os Cód. Cargos');
  popularSelectUnico(selCargo, listaCargosGlobal.map(c => c.cargo), 'Todos os Cargos');
  popularSelectUnico(selDepartamento, listaCargosGlobal.map(c => c.departamento), 'Todos os Departamentos');
  popularSelectUnico(selData, listaCargosGlobal.map(c => c.data_atribuicao), 'Todas as Datas Cadastro');
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
    const fCargo = document.getElementById('filtro-cad-usu-cargo')?.value || 'todos';
    const fEndereco = document.getElementById('filtro-cad-usu-endereco')?.value || 'todos';
    const fTelefone = document.getElementById('filtro-cad-usu-telefone')?.value || 'todos';
    const fEmail = document.getElementById('filtro-cad-usu-email')?.value || 'todos';
    const fStatus = document.getElementById('filtro-cad-usu-status')?.value || 'todos';

    let filtrados = listaUsuariosGlobal.filter(u => {
      const matchBusca = !t || u.nome.toLowerCase().includes(t) || u.cpf.includes(t) || u.cargo.toLowerCase().includes(t) || u.codigo.includes(t);
      const matchCodigo = (fCodigo === 'todos') || (u.codigo === fCodigo);
      const matchNome = (fNome === 'todos') || (u.nome.toLowerCase() === fNome.toLowerCase());
      const matchCpf = (fCpf === 'todos') || (u.cpf === fCpf);
      const matchCargo = (fCargo === 'todos') || (u.cargo.toLowerCase() === fCargo.toLowerCase());
      const matchEndereco = (fEndereco === 'todos') || (u.endereco.toLowerCase() === fEndereco.toLowerCase());
      const matchTelefone = (fTelefone === 'todos') || (u.telefone === fTelefone);
      const matchEmail = (fEmail === 'todos') || (u.email.toLowerCase() === fEmail.toLowerCase());
      const matchStatus = (fStatus === 'todos') || (u.status.toLowerCase() === fStatus.toLowerCase());

      return matchBusca && matchCodigo && matchNome && matchCpf && matchCargo && matchEndereco && matchTelefone && matchEmail && matchStatus;
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
  } else if (subAbaCadastroAtual === 'cargos') {
    const fCodigo = document.getElementById('filtro-cad-car-codigo')?.value || 'todos';
    const fCargo = document.getElementById('filtro-cad-car-cargo')?.value || 'todos';
    const fDepartamento = document.getElementById('filtro-cad-car-departamento')?.value || 'todos';
    const fData = document.getElementById('filtro-cad-car-data')?.value || 'todos';

    let filtrados = listaCargosGlobal.filter(c => {
      const cod = (c.codigo_cargo || c.codigo_usuario || '').toLowerCase();
      const nomCargo = (c.cargo || '').toLowerCase();
      const matchBusca = !t || nomCargo.includes(t) || cod.includes(t);
      const matchCodigo = (fCodigo === 'todos') || ((c.codigo_cargo || c.codigo_usuario) === fCodigo);
      const matchCargo = (fCargo === 'todos') || (c.cargo.toLowerCase() === fCargo.toLowerCase());
      const matchDepartamento = (fDepartamento === 'todos') || ((c.departamento || '').toLowerCase() === fDepartamento.toLowerCase());
      const matchData = (fData === 'todos') || (c.data_atribuicao === fData);

      return matchBusca && matchCodigo && matchCargo && matchDepartamento && matchData;
    });
    filtrados = aplicarOrdenacao(filtrados, ordem, 'cargo', 'codigo_cargo');
    renderizarCargos(filtrados);
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
    carregarCargos(),
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
      popularSelectUsuarios(listaUsuariosGlobal);
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
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${u.codigo}</code></td>
        <td><strong>${u.nome}</strong></td>
        <td>${u.cpf}</td>
        <td><span class="badge-tag primary">${u.cargo}</span></td>
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
            <div class="entity-card-row"><span class="label">Cargo:</span><span class="value">${u.cargo}</span></div>
            <div class="entity-card-row"><span class="label">Perfil (RBAC):</span><span class="value" style="font-weight:700; color:var(--gov-primary);">${perfilNome}</span></div>
            <div class="entity-card-row"><span class="label">CPF:</span><span class="value">${u.cpf}</span></div>
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

function popularSelectCargosUsuario(cargoSelecionado = '') {
  const select = document.getElementById('cad-usu-cargo');
  if (!select) return;

  // Lista base padronizada da SME + cargos já cadastrados no banco
  const cargosPadrao = [
    'Coordenador Técnico',
    'Coordenador Pedagógico',
    'Professor Titular',
    'Diretor Escolar',
    'Secretário Escolar',
    'Supervisor SME',
    'Nutricionista SME',
    'Psicopedagogo',
    'Orientador Educacional',
    'Apoio Administrativo'
  ];

  const cargosDoBanco = listaCargosGlobal.map(c => c.cargo).filter(Boolean);
  const todosCargos = Array.from(new Set([...cargosPadrao, ...cargosDoBanco])).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  select.innerHTML = '<option value="">Selecione um Cargo...</option>';
  todosCargos.forEach(cargo => {
    const opt = document.createElement('option');
    opt.value = cargo;
    opt.textContent = cargo;
    select.appendChild(opt);
  });

  if (cargoSelecionado) {
    if (!todosCargos.includes(cargoSelecionado)) {
      const opt = document.createElement('option');
      opt.value = cargoSelecionado;
      opt.textContent = cargoSelecionado;
      select.appendChild(opt);
    }
    select.value = cargoSelecionado;
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

  popularSelectCargosUsuario();
  document.getElementById('btn-submit-usuario').textContent = 'Salvar Usuário';
  document.getElementById('modal-cad-usuario').classList.add('active');
}

function abrirModalEditarUsuario(id) {
  const u = listaUsuariosGlobal.find(item => item.id === id);
  if (!u) return;

  popularSelectCargosUsuario(u.cargo);

  document.getElementById('modal-cad-usuario-titulo').textContent = `Editar Usuário: ${u.nome}`;
  document.getElementById('cad-usu-id').value = u.id;
  document.getElementById('cad-usu-codigo').value = u.codigo;
  document.getElementById('cad-usu-nome').value = u.nome;
  document.getElementById('cad-usu-cpf').value = u.cpf;
  document.getElementById('cad-usu-cargo').value = u.cargo;
  document.getElementById('cad-usu-endereco').value = u.endereco;
  document.getElementById('cad-usu-telefone').value = u.telefone;
  document.getElementById('cad-usu-email').value = u.email;

  const selPerfil = document.getElementById('cad-usu-perfil');
  if (selPerfil) selPerfil.value = u.perfil || 'admin';

  document.getElementById('btn-submit-usuario').textContent = 'Salvar Alterações';

  document.getElementById('modal-cad-usuario').classList.add('active');
}

async function salvarNovoUsuario(e) {
  e.preventDefault();
  const id = document.getElementById('cad-usu-id').value;
  const nome = document.getElementById('cad-usu-nome').value;
  const cpf = document.getElementById('cad-usu-cpf').value;
  const cargo = document.getElementById('cad-usu-cargo').value;
  const endereco = document.getElementById('cad-usu-endereco').value;
  const telefone = document.getElementById('cad-usu-telefone').value;
  const email = document.getElementById('cad-usu-email').value;
  const perfil = document.getElementById('cad-usu-perfil')?.value || 'admin';

  const url = id ? `/api/v1/cadastros/usuarios/${id}` : '/api/v1/cadastros/usuarios';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cpf, cargo, endereco, telefone, email, perfil })
    });
    if (res.ok) {
      fecharModal('modal-cad-usuario');
      document.getElementById('form-cad-usuario').reset();
      mostrarToast(id ? `Usuário ${nome} atualizado com sucesso!` : `Usuário ${nome} cadastrado com sucesso!`);
      await carregarUsuarios();
      await carregarCargos();
    } else {
      mostrarToast("Erro ao processar dados do usuário", "erro");
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
      await carregarCargos();
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
// 2.d CARGOS
// ------------------------------------------
async function carregarCargos() {
  try {
    const res = await fetch('/api/v1/cadastros/cargos');
    if (res.ok) {
      listaCargosGlobal = await res.json();
      renderizarCargos(listaCargosGlobal);
    }
  } catch (err) { console.error(err); }
}

function renderizarCargos(items) {
  const tbody = document.getElementById('tabela-cad-cargos-body');
  const cardsContainer = document.getElementById('view-cargos-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(c => {
      const codCargo = c.codigo_cargo || c.codigo_usuario || '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${codCargo}</code></td>
        <td><strong>${c.cargo}</strong></td>
        <td>${c.departamento || 'Secretaria Municipal de Educação'}</td>
        <td>${c.data_atribuicao || '2026-02-01'}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarCargo(${c.id})">Editar</button>
            <button class="btn btn-delete" style="padding: 4px 8px; font-size: 0.76rem;" onclick="excluirCadastroCargo(${c.id})">Excluir</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    items.forEach(c => {
      const codCargo = c.codigo_cargo || c.codigo_usuario || '';
      const card = document.createElement('div');
      card.className = 'entity-card';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${c.cargo}</div>
              <div class="entity-card-subtitle">Cód. Cargo: <code>${codCargo}</code></div>
            </div>
            <span class="badge-tag primary">Cargo Ativo</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Lotação:</span><span class="value">${c.departamento || 'Secretaria Municipal de Educação'}</span></div>
            <div class="entity-card-row"><span class="label">Data de Cadastro:</span><span class="value">${c.data_atribuicao || '2026-02-01'}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-edit" onclick="abrirModalEditarCargo(${c.id})">Editar</button>
          <button class="btn btn-delete" onclick="excluirCadastroCargo(${c.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function abrirModalCadCargo() {
  document.getElementById('modal-cad-cargo-titulo').textContent = 'Cadastro de Novo Cargo';
  document.getElementById('cad-car-id').value = '';
  document.getElementById('form-cad-cargo').reset();
  
  // Próximo código sugerido
  let maxNum = 0;
  listaCargosGlobal.forEach(c => {
    const cod = c.codigo_cargo || c.codigo_usuario || '';
    const match = cod.match(/CARG-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const proximoCodigo = `CARG-${String(maxNum + 1).padStart(3, '0')}`;
  document.getElementById('cad-car-codigo').value = proximoCodigo;
  document.getElementById('cad-car-departamento').value = 'Secretaria Municipal de Educação';
  document.getElementById('btn-submit-cargo').textContent = 'Cadastrar Cargo';
  document.getElementById('modal-cad-cargo').classList.add('active');
}

function abrirModalEditarCargo(id) {
  const c = listaCargosGlobal.find(item => item.id === id);
  if (!c) return;

  document.getElementById('modal-cad-cargo-titulo').textContent = `Editar Cargo: ${c.cargo}`;
  document.getElementById('cad-car-id').value = c.id;
  document.getElementById('cad-car-codigo').value = c.codigo_cargo || c.codigo_usuario || '';
  document.getElementById('cad-car-cargo').value = c.cargo;
  document.getElementById('cad-car-departamento').value = c.departamento || 'Secretaria Municipal de Educação';
  document.getElementById('btn-submit-cargo').textContent = 'Salvar Alterações';

  document.getElementById('modal-cad-cargo').classList.add('active');
}

async function salvarNovoCargo(e) {
  e.preventDefault();
  const id = document.getElementById('cad-car-id').value;
  const codigo_cargo = document.getElementById('cad-car-codigo').value;
  const cargo = document.getElementById('cad-car-cargo').value;
  const departamento = document.getElementById('cad-car-departamento').value;

  const url = id ? `/api/v1/cadastros/cargos/${id}` : '/api/v1/cadastros/cargos';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo_cargo, cargo, departamento })
    });
    if (res.ok) {
      fecharModal('modal-cad-cargo');
      mostrarToast(id ? `Cargo ${cargo} atualizado!` : `Cargo ${cargo} cadastrado com sucesso!`);
      await carregarCargos();
    } else {
      mostrarToast("Erro ao processar cargo", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao registrar cargo", "erro");
  }
}

async function excluirCadastroCargo(id) {
  if (!confirm("Tem certeza que deseja excluir esta atribuição de cargo?")) return;
  try {
    const res = await fetch(`/api/v1/cadastros/cargos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast("Cargo excluído com sucesso!");
      await carregarCargos();
      await carregarUsuarios();
    } else {
      const err = await res.json();
      mostrarToast(err.detail || "Erro ao excluir cargo", "erro");
    }
  } catch (err) {
    mostrarToast("Erro ao excluir cargo", "erro");
  }
}

// ------------------------------------------
// 2.e TURMAS
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

// --- 3. CONTROLE DA ABA CONFIGURAÇÕES (Média Geral & Níveis | Seguranças | Funcionalidades) ---
function trocarSubAbaConfig(subId) {
  subAbaConfigAtual = subId;
  const contents = document.querySelectorAll('.sub-config-content');
  contents.forEach(c => c.style.display = 'none');

  const target = document.getElementById(`sub-config-${subId}`);
  if (target) target.style.display = 'block';

  document.getElementById('btn-subcfg-media-niveis')?.classList.toggle('active', subId === 'media-niveis');
  document.getElementById('btn-subcfg-seguranca')?.classList.toggle('active', subId === 'seguranca');
  document.getElementById('btn-subcfg-funcionalidades')?.classList.toggle('active', subId === 'funcionalidades');
}

async function carregarConfiguracoes() {
  try {
    const [resMedia, resSec, resFunc] = await Promise.all([
      fetch('/api/v1/configuracoes/parametrizacao-media-nivel'),
      fetch('/api/v1/configuracoes/seguranca'),
      fetch('/api/v1/configuracoes/funcionalidades')
    ]);

    if (resMedia.ok) {
      const m = await resMedia.json();
      const elMedia = document.getElementById('cfg-media-geral');
      const elMinAv = document.getElementById('cfg-min-avancado');
      const elMaxAv = document.getElementById('cfg-max-avancado');
      const elMinAd = document.getElementById('cfg-min-adequado');
      const elMaxAd = document.getElementById('cfg-max-adequado');
      const elMinBa = document.getElementById('cfg-min-basico');
      const elMaxBa = document.getElementById('cfg-max-basico');
      const elMinAb = document.getElementById('cfg-min-abaixo');
      const elMaxAb = document.getElementById('cfg-max-abaixo');

      if (elMedia) elMedia.value = m.media_geral_aprovacao ?? 6.0;
      if (elMinAv) elMinAv.value = m.nota_min_avancado ?? 8.0;
      if (elMaxAv) elMaxAv.value = m.nota_max_avancado ?? 10.0;
      if (elMinAd) elMinAd.value = m.nota_min_adequado ?? 7.0;
      if (elMaxAd) elMaxAd.value = m.nota_max_adequado ?? 7.9;
      if (elMinBa) elMinBa.value = m.nota_min_basico ?? 6.0;
      if (elMaxBa) elMaxBa.value = m.nota_max_basico ?? 6.9;
      if (elMinAb) elMinAb.value = m.nota_min_abaixo ?? 0.0;
      if (elMaxAb) elMaxAb.value = m.nota_max_abaixo ?? 5.9;
    }

    if (resSec.ok) {
      const sec = await resSec.json();
      const el2fa = document.getElementById('sec-2fa');
      const elSenhas = document.getElementById('sec-senhas');
      const elBloq = document.getElementById('sec-bloqueio');
      const elAudit = document.getElementById('sec-auditoria');
      const elMasc = document.getElementById('sec-mascaramento');
      const elBkp = document.getElementById('sec-backup');

      if (el2fa) el2fa.checked = sec.autenticacao_2fa;
      if (elSenhas) elSenhas.checked = sec.politica_senhas_fortes;
      if (elBloq) elBloq.checked = sec.bloqueio_tentativas_incorretas;
      if (elAudit) elAudit.checked = sec.trilha_auditoria_ativa;
      if (elMasc) elMasc.checked = sec.mascaramento_cpf_lgpd;
      if (elBkp) elBkp.checked = sec.backup_automatico_diario;
    }

    if (resFunc.ok) {
      const func = await resFunc.json();
      const elDash = document.getElementById('func-dashboard');
      const elAva = document.getElementById('func-avaliacoes');
      const elCad = document.getElementById('func-cadastros');
      const elBol = document.getElementById('func-boletins');
      const elExp = document.getElementById('func-exportacao');
      const elSed = document.getElementById('func-seduc');

      if (elDash) elDash.checked = func.modulo_dashboard;
      if (elAva) elAva.checked = func.modulo_avaliacoes;
      if (elCad) elCad.checked = func.modulo_cadastros_gerais;
      if (elBol) elBol.checked = func.modulo_boletins_online;
      if (elExp) elExp.checked = func.modulo_exportacao_csv;
      if (elSed) elSed.checked = func.modulo_integracao_seduc;
    }
  } catch (err) { console.error(err); }
}

async function salvarParametrizacaoMediaNivel() {
  const dados = {
    media_geral_aprovacao: parseFloat(document.getElementById('cfg-media-geral')?.value || 6.0),
    nota_min_avancado: parseFloat(document.getElementById('cfg-min-avancado')?.value || 8.0),
    nota_max_avancado: parseFloat(document.getElementById('cfg-max-avancado')?.value || 10.0),
    nota_min_adequado: parseFloat(document.getElementById('cfg-min-adequado')?.value || 7.0),
    nota_max_adequado: parseFloat(document.getElementById('cfg-max-adequado')?.value || 7.9),
    nota_min_basico: parseFloat(document.getElementById('cfg-min-basico')?.value || 6.0),
    nota_max_basico: parseFloat(document.getElementById('cfg-max-basico')?.value || 6.9),
    nota_min_abaixo: parseFloat(document.getElementById('cfg-min-abaixo')?.value || 0.0),
    nota_max_abaixo: parseFloat(document.getElementById('cfg-max-abaixo')?.value || 5.9)
  };

  try {
    const res = await fetch('/api/v1/configuracoes/parametrizacao-media-nivel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!res.ok) throw new Error("Erro na API");
    mostrarToast("Parametrização de Médias e Níveis salva com sucesso!");
    // Recarrega alunos e métricas caso estejam abertos
    carregarDadosCadastros();
    carregarTodasMetricas();
  } catch (err) {
    console.error(err);
    mostrarToast("Erro ao salvar parametrização de médias.", "erro");
  }
}

async function salvarTodasConfiguracoes() {
  try {
    await salvarParametrizacaoMediaNivel();

    const secData = {
      autenticacao_2fa: document.getElementById('sec-2fa')?.checked ?? true,
      politica_senhas_fortes: document.getElementById('sec-senhas')?.checked ?? true,
      bloqueio_tentativas_incorretas: document.getElementById('sec-bloqueio')?.checked ?? true,
      trilha_auditoria_ativa: document.getElementById('sec-auditoria')?.checked ?? true,
      mascaramento_cpf_lgpd: document.getElementById('sec-mascaramento')?.checked ?? true,
      backup_automatico_diario: document.getElementById('sec-backup')?.checked ?? true,
      tempo_sessao_minutos: 60,
      max_tentativas_login: 5,
      criptografia_dados_sensíveis: true
    };

    const funcData = {
      modulo_dashboard: document.getElementById('func-dashboard')?.checked ?? true,
      modulo_avaliacoes: document.getElementById('func-avaliacoes')?.checked ?? true,
      modulo_cadastros_gerais: document.getElementById('func-cadastros')?.checked ?? true,
      modulo_boletins_online: document.getElementById('func-boletins')?.checked ?? true,
      modulo_exportacao_csv: document.getElementById('func-exportacao')?.checked ?? true,
      modulo_integracao_seduc: document.getElementById('func-seduc')?.checked ?? true,
      modulo_escolas: true,
      modulo_alunos: true,
      modulo_bi_relatorios: true,
      modulo_simulados_saeb: true
    };

    await Promise.all([
      fetch('/api/v1/configuracoes/seguranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(secData)
      }),
      fetch('/api/v1/configuracoes/funcionalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(funcData)
      })
    ]);

    mostrarToast("Todas as configurações foram salvas com sucesso!");
  } catch (err) {
    mostrarToast("Erro ao salvar configurações", "erro");
  }
}

// --- 4. PAINEL GERAL (DASHBOARD) ---
async function carregarTodasMetricas() {
  try {
    const res = await fetch('/api/v1/dashboard/resumo');
    if (!res.ok) throw new Error("Falha ao consultar API de telemetria");
    const data = await res.json();

    const kpiAlunos = document.getElementById('kpi-alunos');
    const kpiPart = document.getElementById('kpi-participacao');
    const kpiLp = document.getElementById('kpi-lp');
    const kpiMat = document.getElementById('kpi-mat');

    if (kpiAlunos) kpiAlunos.textContent = data.kpis.total_estudantes.toLocaleString('pt-BR');
    if (kpiPart) kpiPart.textContent = data.kpis.taxa_participacao;
    if (kpiLp) kpiLp.textContent = formatarNota(data.kpis.nota_media_lp ?? data.kpis.proficiencia_media_lp);
    if (kpiMat) kpiMat.textContent = formatarNota(data.kpis.nota_media_mat ?? data.kpis.proficiencia_media_mat);

    const containerAlertas = document.getElementById('lista-alertas-pedagogicos');
    if (containerAlertas && data.alertas_pedagogicos) {
      containerAlertas.innerHTML = '';
      data.alertas_pedagogicos.forEach(a => {
        const item = document.createElement('div');
        item.className = `alert-item ${a.tipo}`;
        item.innerHTML = `
          <div class="alert-item-header">
            <span>${a.titulo}</span>
            <span class="badge-status ${a.tipo === 'urgente' ? 'intervencao' : a.tipo === 'sucesso' ? 'concluida' : 'agendada'}">${a.tipo.toUpperCase()}</span>
          </div>
          <div class="alert-item-desc">${a.descricao}</div>
          <div class="alert-item-action">Ação Recomendada: ${a.acao}</div>
        `;
        containerAlertas.appendChild(item);
      });
    }

    const tbodyEscolas = document.getElementById('tabela-resumo-escolas');
    if (tbodyEscolas && data.top_escolas) {
      tbodyEscolas.innerHTML = '';
      data.top_escolas.forEach(esc => {
        const tr = document.createElement('tr');
        const notaLp = (esc.nota_media_lp !== undefined) ? esc.nota_media_lp : esc.proficiencia_lp;
        const notaMat = (esc.nota_media_mat !== undefined) ? esc.nota_media_mat : esc.proficiencia_mat;
        const media = (notaLp + notaMat) / 2;
        tr.innerHTML = `
          <td><strong>${esc.nome}</strong><br><small style="color: var(--text-dim);">${esc.bairro}</small></td>
          <td>${esc.total_alunos}</td>
          <td><strong style="color: var(--gov-primary);">${formatarNota(media)}</strong></td>
        `;
        tbodyEscolas.appendChild(tr);
      });
    }

    await renderizarGraficosDashboard();
    mostrarToast("Dados de Água Boa atualizados com sucesso!");
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}

async function renderizarGraficosDashboard() {
  const resEvolucao = await fetch('/api/v1/relatorios/evolucao-historica');
  if (resEvolucao.ok) {
    const histData = await resEvolucao.json();
    const ctxHist = document.getElementById('chartEvolucaoHistorica');
    if (ctxHist) {
      if (chartHistorico) chartHistorico.destroy();
      chartHistorico = new Chart(ctxHist, {
        type: 'line',
        data: {
          labels: histData.ciclos,
          datasets: [
            {
              label: 'Língua Portuguesa',
              data: histData.lingua_portuguesa,
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.08)',
              tension: 0.3,
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#0284c7',
              pointRadius: 4
            },
            {
              label: 'Matemática',
              data: histData.matematica,
              borderColor: '#059669',
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              tension: 0.3,
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#059669',
              pointRadius: 4
            },
            {
              label: 'Meta Municipal Água Boa',
              data: histData.meta_agua_boa,
              borderColor: '#d97706',
              borderDash: [6, 6],
              tension: 0.2,
              borderWidth: 2,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#475569', font: { family: 'Outfit', size: 12, weight: '600' } } }
          },
          scales: {
            x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
            y: { min: 200, max: 260, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } }
          }
        }
      });
    }
  }

  const resNiveis = await fetch('/api/v1/relatorios/distribuicao-niveis');
  if (resNiveis.ok) {
    const nivData = await resNiveis.json();
    const ctxNiv = document.getElementById('chartDistribuicaoNiveis');
    if (ctxNiv) {
      if (chartNiveis) chartNiveis.destroy();
      chartNiveis = new Chart(ctxNiv, {
        type: 'doughnut',
        data: {
          labels: nivData.rotulos,
          datasets: [{
            data: nivData.lingua_portuguesa,
            backgroundColor: ['#e11d48', '#d97706', '#059669', '#0284c7'],
            borderColor: '#ffffff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#475569', font: { family: 'Outfit', size: 12, weight: '600' } } }
          },
          cutout: '68%'
        }
      });
    }
  }
}

// --- 5. AVALIAÇÕES ---
async function carregarAvaliacoes() {
  try {
    const res = await fetch('/api/v1/avaliacoes');
    if (!res.ok) throw new Error("Erro ao buscar avaliações");
    listaAvaliacoesGlobal = await res.json();
    filtrarAvaliacoes();
  } catch (err) { console.error(err); }
}

function alternarModoExibicaoAvaliacoes(modo) {
  modoExibicaoAvaliacoes = modo;
  document.getElementById('btn-view-ava-lista')?.classList.toggle('active', modo === 'lista');
  document.getElementById('btn-view-ava-cards')?.classList.toggle('active', modo === 'cartoes');

  const listaEl = document.getElementById('view-avaliacoes-lista');
  const cardsEl = document.getElementById('view-avaliacoes-cartoes');
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

function filtrarAvaliacoes() {
  const busca = (document.getElementById('busca-avaliacoes')?.value || '').toLowerCase().trim();
  const comp = document.getElementById('filtro-comp-avaliacoes')?.value || 'todos';
  const stat = document.getElementById('filtro-status-avaliacoes')?.value || 'todos';
  const ordem = document.getElementById('ordem-avaliacoes')?.value || 'padrao';

  let filtrados = listaAvaliacoesGlobal.filter(a => {
    const matchBusca = !busca || a.titulo.toLowerCase().includes(busca) || a.codigo.toLowerCase().includes(busca) || a.ano_escolar.toLowerCase().includes(busca);
    const matchComp = comp === 'todos' || a.componente === comp;
    const matchStat = stat === 'todos' || a.status === stat;
    return matchBusca && matchComp && matchStat;
  });

  if (ordem === 'titulo-asc') {
    filtrados.sort((a, b) => a.titulo.localeCompare(b.titulo));
  } else if (ordem === 'participacao-desc') {
    filtrados.sort((a, b) => parseFloat(b.taxa_participacao) - parseFloat(a.taxa_participacao));
  } else if (ordem === 'media-desc') {
    filtrados.sort((a, b) => b.proficiencia_media - a.proficiencia_media);
  }

  renderizarTabelaAvaliacoes(filtrados);
}

function ordenarAvaliacoes(ordem) {
  filtrarAvaliacoes();
}

function renderizarTabelaAvaliacoes(items) {
  const tbody = document.getElementById('tabela-avaliacoes-body');
  const cardsContainer = document.getElementById('view-avaliacoes-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(a => {
      const tr = document.createElement('tr');
      const statusClass = a.status === 'Concluída' ? 'concluida' : a.status === 'Em Aplicação' ? 'em-aplicacao' : 'agendada';
      tr.innerHTML = `
        <td><code>${a.codigo}</code></td>
        <td><strong>${a.titulo}</strong><br><small style="color: var(--text-dim);">Itens BNCC: ${a.total_itens}</small></td>
        <td><span class="badge-tag primary">${a.componente}</span></td>
        <td>${a.ano_escolar}</td>
        <td><span class="badge-tag">${a.tipo}</span></td>
        <td>${a.periodo_inicio} a ${a.periodo_fim}</td>
        <td><strong>${a.total_avaliados}</strong> / ${a.total_inscritos}</td>
        <td><strong style="color: var(--color-success);">${a.taxa_participacao}</strong></td>
        <td><strong style="color: var(--gov-primary);">${a.proficiencia_media > 0 ? a.proficiencia_media + ' pts' : '—'}</strong></td>
        <td><span class="badge-status ${statusClass}">${a.status}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="detalharAvaliacao(${a.id})">
              Detalhes
            </button>
            <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="excluirAvaliacao(${a.id})">
              Excluir
            </button>
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
      const statusClass = a.status === 'Concluída' ? 'concluida' : a.status === 'Em Aplicação' ? 'em-aplicacao' : 'agendada';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${a.titulo}</div>
              <div class="entity-card-subtitle">Cód: <code>${a.codigo}</code> • ${a.ano_escolar}</div>
            </div>
            <span class="badge-status ${statusClass}">${a.status}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Componente:</span><span class="value">${a.componente}</span></div>
            <div class="entity-card-row"><span class="label">Tipo:</span><span class="value">${a.tipo}</span></div>
            <div class="entity-card-row"><span class="label">Período:</span><span class="value">${a.periodo_inicio} a ${a.periodo_fim}</span></div>
            <div class="entity-card-row"><span class="label">Participação:</span><span class="value">${a.taxa_participacao} (${a.total_avaliados}/${a.total_inscritos})</span></div>
            <div class="entity-card-row"><span class="label">Proficiência:</span><span class="value">${a.proficiencia_media > 0 ? a.proficiencia_media + ' pts' : '—'}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-secondary" onclick="detalharAvaliacao(${a.id})">Ver Detalhes</button>
          <button class="btn btn-danger" onclick="excluirAvaliacao(${a.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function abrirModalNovaAvaliacao() {
  document.getElementById('modal-nova-avaliacao').classList.add('active');
}

async function salvarNovaAvaliacao(e) {
  e.preventDefault();
  const codigo = document.getElementById('nova-ava-codigo').value;
  const componente = document.getElementById('nova-ava-componente').value;
  const titulo = document.getElementById('nova-ava-titulo').value;
  const ano_escolar = document.getElementById('nova-ava-ano').value;
  const tipo = document.getElementById('nova-ava-tipo').value;
  const periodo_inicio = document.getElementById('nova-ava-inicio').value;
  const periodo_fim = document.getElementById('nova-ava-fim').value;
  const total_itens = parseInt(document.getElementById('nova-ava-itens').value);

  try {
    const res = await fetch('/api/v1/avaliacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, componente, titulo, ano_escolar, tipo, periodo_inicio, periodo_fim, total_itens })
    });
    if (res.ok) {
      fecharModal('modal-nova-avaliacao');
      document.getElementById('form-nova-avaliacao').reset();
      mostrarToast(`Avaliação ${codigo} agendada com sucesso!`);
      await carregarAvaliacoes();
      trocarTela('avaliacoes');
    }
  } catch (err) { mostrarToast("Erro ao agendar avaliação", "erro"); }
}

function detalharAvaliacao(id) {
  const item = listaAvaliacoesGlobal.find(a => a.id === id);
  if (!item) return;
  alert(`Instrumento: ${item.titulo}\nCódigo: ${item.codigo}\nComponente: ${item.componente}\nPúblico-alvo: ${item.ano_escolar}\nTotal de Estudantes Avaliados: ${item.total_avaliados}\nProficiência Média Apurada: ${item.proficiencia_media} pts\nStatus: ${item.status}`);
}

async function excluirAvaliacao(id) {
  const item = listaAvaliacoesGlobal.find(a => a.id === id);
  const titulo = item ? item.titulo : 'esta avaliação';
  if (!confirm(`Deseja realmente excluir a avaliação "${titulo}"?`)) return;

  try {
    const res = await fetch(`/api/v1/avaliacoes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast(`Avaliação excluída com sucesso!`);
      await carregarAvaliacoes();
    } else {
      mostrarToast("Erro ao excluir avaliação.", "erro");
    }
  } catch (err) {
    console.error("Erro ao excluir avaliação:", err);
    mostrarToast("Erro ao excluir avaliação.", "erro");
  }
}

// --- 6. REDE & ESCOLAS ---
async function carregarEscolas() {
  try {
    const res = await fetch('/api/v1/escolas');
    if (!res.ok) throw new Error("Erro ao consultar escolas");
    listaEscolasGlobal = await res.json();
    filtrarEscolasCards();
  } catch (err) { console.error(err); }
}

function alternarModoExibicaoEscolas(modo) {
  modoExibicaoEscolas = modo;
  document.getElementById('btn-view-esc-lista')?.classList.toggle('active', modo === 'lista');
  document.getElementById('btn-view-esc-cards')?.classList.toggle('active', modo === 'cartoes');

  const listaEl = document.getElementById('view-escolas-lista');
  const cardsEl = document.getElementById('grid-escolas-cards');
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

function filtrarEscolasCards(termo) {
  const t = (termo !== undefined ? termo : (document.getElementById('busca-escola')?.value || '')).toLowerCase().trim();
  const zona = document.getElementById('filtro-zona-escolas')?.value || 'todos';
  const ordem = document.getElementById('ordem-escolas')?.value || 'padrao';

  let filtrados = listaEscolasGlobal.filter(e => {
    const matchTermo = !t || e.nome.toLowerCase().includes(t) || e.bairro.toLowerCase().includes(t) || e.codigo.includes(t);
    const matchZona = zona === 'todos' || e.tipo_unidade.toLowerCase() === zona.toLowerCase();
    return matchTermo && matchZona;
  });

  if (ordem === 'nome-asc') {
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (ordem === 'alunos-desc') {
    filtrados.sort((a, b) => b.total_alunos - a.total_alunos);
  } else if (ordem === 'nota-desc') {
    filtrados.sort((a, b) => {
      const mA = ((a.nota_media_lp || a.proficiencia_lp) + (a.nota_media_mat || a.proficiencia_mat)) / 2;
      const mB = ((b.nota_media_lp || b.proficiencia_lp) + (b.nota_media_mat || b.proficiencia_mat)) / 2;
      return mB - mA;
    });
  }

  renderizarEscolasGeral(filtrados);
}

function filtrarEscolasPorZona(zona) {
  filtrarEscolasCards();
}

function ordenarEscolas(ordem) {
  filtrarEscolasCards();
}

function renderizarEscolasGeral(escolas) {
  const container = document.getElementById('grid-escolas-cards');
  const tbody = document.getElementById('tabela-escolas-body');

  if (container) {
    container.innerHTML = '';
    escolas.forEach(e => {
      const card = document.createElement('div');
      card.className = 'school-card';
      const notaLp = (e.nota_media_lp !== undefined) ? e.nota_media_lp : e.proficiencia_lp;
      const notaMat = (e.nota_media_mat !== undefined) ? e.nota_media_mat : e.proficiencia_mat;
      const media = (notaLp + notaMat) / 2;
      const tagTipoClass = e.tipo_unidade === 'Urbana' ? 'primary' : e.tipo_unidade === 'Campo' ? 'success' : 'warning';

      card.innerHTML = `
        <div class="school-card-top">
          <div>
            <h4>${e.nome}</h4>
            <span class="badge-tag ${tagTipoClass}">${e.tipo_unidade} • Cód: ${e.codigo}</span>
          </div>
          <span class="badge-status ativo">${e.status}</span>
        </div>
        <div class="school-meta">
          <div><strong>Endereço:</strong> ${e.endereco}, nº ${e.numero} - ${e.bairro}</div>
          <div><strong>Telefone:</strong> ${e.telefone}</div>
          <div><strong>INEP:</strong> ${e.codigo_inep || '—'}</div>
        </div>
        <div class="school-metrics-pill">
          <div class="school-stat-col">
            <span>Turmas</span>
            <strong>${e.total_turmas}</strong>
          </div>
          <div class="school-stat-col">
            <span>Alunos</span>
            <strong>${e.total_alunos}</strong>
          </div>
          <div class="school-stat-col">
            <span>Participação</span>
            <strong style="color: var(--color-success);">${e.taxa_participacao}</strong>
          </div>
          <div class="school-stat-col">
            <span>Nota Média</span>
            <strong style="color: var(--gov-primary);">${formatarNota(media)}</strong>
          </div>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
          <button class="btn btn-edit" onclick="abrirModalEditarEscola(${e.id})">Editar</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  if (tbody) {
    tbody.innerHTML = '';
    escolas.forEach(e => {
      const tr = document.createElement('tr');
      const notaLp = (e.nota_media_lp !== undefined) ? e.nota_media_lp : e.proficiencia_lp;
      const notaMat = (e.nota_media_mat !== undefined) ? e.nota_media_mat : e.proficiencia_mat;
      const media = (notaLp + notaMat) / 2;

      tr.innerHTML = `
        <td><code>${e.codigo}</code></td>
        <td><strong>${e.nome}</strong></td>
        <td><span class="badge-tag primary">${e.tipo_unidade}</span></td>
        <td>${e.endereco}, nº ${e.numero} - ${e.bairro}</td>
        <td>${e.telefone}</td>
        <td><code>${e.codigo_inep || '—'}</code></td>
        <td>${e.total_turmas}</td>
        <td><strong>${e.total_alunos}</strong></td>
        <td><strong style="color: var(--color-success);">${e.taxa_participacao}</strong></td>
        <td><strong style="color: var(--gov-primary);">${formatarNota(media)}</strong></td>
        <td style="text-align: center;">
          <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarEscola(${e.id})">Editar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// --- 7. ESTUDANTES (QUADRO NOMINAL & BOLETIM) ---
async function carregarAlunos() {
  try {
    const res = await fetch('/api/v1/alunos');
    if (!res.ok) throw new Error("Erro ao buscar alunos");
    listaAlunosGlobal = await res.json();
    popularFiltrosEstudantes();
    filtrarAlunosTabela();
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

  const listaEl = document.getElementById('view-alunos-lista');
  const cardsEl = document.getElementById('view-alunos-cartoes');
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
  const cardsContainer = document.getElementById('view-alunos-cartoes');

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

async function abrirBoletimEstudante(alunoId) {
  try {
    const res = await fetch(`/api/v1/alunos/${alunoId}/boletim`);
    if (!res.ok) throw new Error("Erro ao buscar boletim");
    const boletim = await res.json();
    const al = boletim.estudante;
    const notaLp = (al.nota_lp !== undefined && al.nota_lp !== null) ? Number(al.nota_lp) : 0.0;
    const notaMat = (al.nota_mat !== undefined && al.nota_mat !== null) ? Number(al.nota_mat) : 0.0;
    const mediaGeral = (notaLp + notaMat) / 2;

    const container = document.getElementById('boletim-corpo-conteudo');
    container.innerHTML = `
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

      <h4 style="color: var(--color-success); margin-top: 15px;">Habilidades Consolidadas / Dominadas (BNCC)</h4>
      <ul class="skills-list dominadas">
        ${boletim.habilidades_dominadas.map(h => `<li><strong>${h.codigo}</strong>: ${h.descricao}</li>`).join('')}
      </ul>

      <h4 style="color: var(--color-warning); margin-top: 15px;">Habilidades em Desenvolvimento</h4>
      <ul class="skills-list desenvolvimento">
        ${boletim.habilidades_em_desenvolvimento.map(h => `<li><strong>${h.codigo}</strong>: ${h.descricao}</li>`).join('')}
      </ul>

      <h4 style="color: var(--color-danger); margin-top: 15px;">Habilidades que Exigem Intervenção Imediata</h4>
      <ul class="skills-list intervencao">
        ${boletim.habilidades_intervencao.map(h => `<li><strong>${h.codigo}</strong>: ${h.descricao}</li>`).join('')}
      </ul>
    `;

    document.getElementById('modal-boletim-aluno').classList.add('active');
  } catch (err) {
    mostrarToast("Erro ao abrir boletim do aluno", "erro");
  }
}

// --- 8. BI & RELATÓRIOS PARAMETRIZADOS ---
let listaAlunosRelatoriosGlobal = [];
let listaEscolasRelatoriosGlobal = [];

async function inicializarModuloRelatorios() {
  try {
    const [resAlunos, resEscolas] = await Promise.all([
      fetch('/api/v1/alunos'),
      fetch('/api/v1/escolas')
    ]);
    if (resAlunos.ok) listaAlunosRelatoriosGlobal = await resAlunos.json();
    if (resEscolas.ok) listaEscolasRelatoriosGlobal = await resEscolas.json();

    popularFiltrosRelatorios();
    filtrarDadosRelatorios();
  } catch (err) {
    console.error("Erro ao inicializar dados de relatórios:", err);
  }
}

function popularFiltrosRelatorios() {
  const selEscola = document.getElementById('rel-filtro-escola');
  if (selEscola) {
    const atual = selEscola.value;
    const escolas = [...new Set(listaAlunosRelatoriosGlobal.map(a => a.nome_escola).concat(listaEscolasRelatoriosGlobal.map(e => e.nome)))].filter(Boolean);
    let opt = '<option value="todos">Todas as Escolas</option>';
    escolas.forEach(esc => {
      opt += `<option value="${esc}" ${esc === atual ? 'selected' : ''}>${esc}</option>`;
    });
    selEscola.innerHTML = opt;
  }
  atualizarFiltroTurmasRelatorio();
}

function aoMudarFiltroEscolaRelatorio(escola) {
  atualizarFiltroTurmasRelatorio();
  filtrarDadosRelatorios();
}

function atualizarFiltroTurmasRelatorio() {
  const selEscola = document.getElementById('rel-filtro-escola');
  const selTurma = document.getElementById('rel-filtro-turma');
  if (!selTurma) return;

  const escolaSel = selEscola ? selEscola.value : 'todos';
  let base = listaAlunosRelatoriosGlobal;
  if (escolaSel && escolaSel !== 'todos') {
    base = base.filter(a => a.nome_escola.toLowerCase() === escolaSel.toLowerCase());
  }

  const turmaAtual = selTurma.value;
  const turmas = [...new Set(base.map(a => a.turma))].filter(Boolean);
  let opt = '<option value="todos">Todas as Turmas</option>';
  turmas.forEach(t => {
    opt += `<option value="${t}" ${t === turmaAtual ? 'selected' : ''}>${t}</option>`;
  });
  selTurma.innerHTML = opt;
}

function limparFiltrosRelatorios() {
  const selEscola = document.getElementById('rel-filtro-escola');
  const selTurma = document.getElementById('rel-filtro-turma');
  const selDisc = document.getElementById('rel-filtro-disciplina');
  const selNivel = document.getElementById('rel-filtro-nivel');
  const inputBusca = document.getElementById('rel-busca-aluno');

  if (selEscola) selEscola.value = 'todos';
  if (selTurma) selTurma.value = 'todos';
  if (selDisc) selDisc.value = 'todas';
  if (selNivel) selNivel.value = 'todos';
  if (inputBusca) inputBusca.value = '';

  atualizarFiltroTurmasRelatorio();
  filtrarDadosRelatorios();
  mostrarToast("Filtros do relatório redefinidos.");
}

function filtrarDadosRelatorios() {
  const escola = document.getElementById('rel-filtro-escola')?.value || 'todos';
  const turma = document.getElementById('rel-filtro-turma')?.value || 'todos';
  const disciplina = document.getElementById('rel-filtro-disciplina')?.value || 'todas';
  const nivel = document.getElementById('rel-filtro-nivel')?.value || 'todos';
  const busca = (document.getElementById('rel-busca-aluno')?.value || '').toLowerCase().trim();

  let filtrados = listaAlunosRelatoriosGlobal.filter(a => {
    const matchEscola = escola === 'todos' || a.nome_escola.toLowerCase() === escola.toLowerCase();
    const matchTurma = turma === 'todos' || a.turma.toLowerCase() === turma.toLowerCase();
    const matchNivel = nivel === 'todos' || a.nivel_lp === nivel || a.nivel_mat === nivel;
    const matchBusca = !busca || a.nome.toLowerCase().includes(busca) || a.codigo_aluno.includes(busca) || (a.codigo_inep && a.codigo_inep.includes(busca));
    return matchEscola && matchTurma && matchNivel && matchBusca;
  });

  atualizarKPISRecorte(filtrados, escola, turma);
  renderizarTabelaAnaliticaRelatorio(filtrados, disciplina);
  atualizarGraficosParametrizados(filtrados, escola, turma, disciplina);
}

function atualizarKPISRecorte(alunos, escola, turma) {
  const kpiTotal = document.getElementById('rel-kpi-total-alunos');
  const kpiSub = document.getElementById('rel-kpi-sub-escola');
  const kpiLp = document.getElementById('rel-kpi-media-lp');
  const kpiMat = document.getElementById('rel-kpi-media-mat');
  const kpiAbaixo = document.getElementById('rel-kpi-abaixo-basico');

  const total = alunos.length;
  if (kpiTotal) kpiTotal.textContent = total.toLocaleString('pt-BR');
  if (kpiSub) {
    if (escola !== 'todos' && turma !== 'todos') kpiSub.textContent = `${escola} • ${turma}`;
    else if (escola !== 'todos') kpiSub.textContent = escola;
    else kpiSub.textContent = 'Média Geral da Rede';
  }

  if (total === 0) {
    if (kpiLp) kpiLp.textContent = '0,0';
    if (kpiMat) kpiMat.textContent = '0,0';
    if (kpiAbaixo) kpiAbaixo.textContent = '0%';
    return;
  }

  const somaLp = alunos.reduce((acc, a) => acc + (a.nota_lp !== undefined && a.nota_lp !== null ? Number(a.nota_lp) : 0.0), 0);
  const somaMat = alunos.reduce((acc, a) => acc + (a.nota_mat !== undefined && a.nota_mat !== null ? Number(a.nota_mat) : 0.0), 0);
  const mediaLp = somaLp / total;
  const mediaMat = somaMat / total;

  const totalAbaixo = alunos.filter(a => a.nivel_lp === 'Abaixo do Básico' || a.nivel_mat === 'Abaixo do Básico').length;
  const percAbaixo = (totalAbaixo / total) * 100;

  if (kpiLp) kpiLp.textContent = formatarNota(mediaLp);
  if (kpiMat) kpiMat.textContent = formatarNota(mediaMat);
  if (kpiAbaixo) kpiAbaixo.textContent = percAbaixo.toFixed(1).replace('.', ',') + '%';
}

function renderizarTabelaAnaliticaRelatorio(alunos, disciplina) {
  const tbody = document.getElementById('tbody-relatorios-analitica');
  const badge = document.getElementById('rel-total-tabela-badge');
  if (badge) badge.textContent = `${alunos.length} Estudantes`;

  if (!tbody) return;

  if (alunos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Nenhum estudante encontrado para os parâmetros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = alunos.map(a => {
    const notaLp = (a.nota_lp !== undefined && a.nota_lp !== null) ? Number(a.nota_lp) : 0.0;
    const notaMat = (a.nota_mat !== undefined && a.nota_mat !== null) ? Number(a.nota_mat) : 0.0;
    const mediaGeral = (notaLp + notaMat) / 2;

    return `
      <tr>
        <td><code>${a.codigo_aluno}</code></td>
        <td><strong>${a.nome}</strong></td>
        <td>${a.nome_escola}</td>
        <td><span class="badge-tag primary">${a.turma}</span></td>
        <td style="text-align: center;"><strong style="color: var(--gov-primary);">${formatarNota(notaLp)}</strong></td>
        <td style="text-align: center;"><span class="badge-status ${obterClasseNivel(a.nivel_lp)}">${a.nivel_lp}</span></td>
        <td style="text-align: center;"><strong style="color: var(--color-success);">${formatarNota(notaMat)}</strong></td>
        <td style="text-align: center;"><span class="badge-status ${obterClasseNivel(a.nivel_mat)}">${a.nivel_mat}</span></td>
        <td style="text-align: center;"><strong style="color: #d97706;">${formatarNota(mediaGeral)}</strong></td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="abrirBoletimEstudante(${a.id})">
            Boletim
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function atualizarGraficosParametrizados(alunos, escola, turma, disciplina) {
  const ctxEsc = document.getElementById('chartComparativoEscolas');
  const tituloGrafico = document.getElementById('rel-titulo-grafico-escolas');

  if (ctxEsc) {
    let labels = [];
    let dataLp = [];
    let dataMat = [];

    if (escola === 'todos') {
      if (tituloGrafico) tituloGrafico.textContent = 'Comparativo de Notas Médias (0 a 10) por Unidade Escolar';
      // Agrupar por escola
      const escolasUnicas = [...new Set(alunos.map(a => a.nome_escola))];
      labels = escolasUnicas.map(e => e.replace('EMEB ', ''));
      escolasUnicas.forEach(esc => {
        const doEscola = alunos.filter(a => a.nome_escola === esc);
        const medLp = doEscola.reduce((s, a) => s + (a.nota_lp || 8.0), 0) / (doEscola.length || 1);
        const medMat = doEscola.reduce((s, a) => s + (a.nota_mat || 8.0), 0) / (doEscola.length || 1);
        dataLp.push(parseFloat(medLp.toFixed(1)));
        dataMat.push(parseFloat(medMat.toFixed(1)));
      });
    } else {
      if (tituloGrafico) tituloGrafico.textContent = `Desempenho por Turma: ${escola}`;
      // Agrupar por turma da escola
      const turmasUnicas = [...new Set(alunos.map(a => a.turma))];
      labels = turmasUnicas;
      turmasUnicas.forEach(t => {
        const doTurma = alunos.filter(a => a.turma === t);
        const medLp = doTurma.reduce((s, a) => s + (a.nota_lp || 8.0), 0) / (doTurma.length || 1);
        const medMat = doTurma.reduce((s, a) => s + (a.nota_mat || 8.0), 0) / (doTurma.length || 1);
        dataLp.push(parseFloat(medLp.toFixed(1)));
        dataMat.push(parseFloat(medMat.toFixed(1)));
      });
    }

    const datasets = [];
    if (disciplina === 'todas' || disciplina === 'Língua Portuguesa') {
      datasets.push({
        label: 'Nota Língua Portuguesa (0 a 10)',
        data: dataLp,
        backgroundColor: '#0284c7',
        borderRadius: 4
      });
    }
    if (disciplina === 'todas' || disciplina === 'Matemática') {
      datasets.push({
        label: 'Nota Matemática (0 a 10)',
        data: dataMat,
        backgroundColor: '#059669',
        borderRadius: 4
      });
    }

    if (chartEscolas) chartEscolas.destroy();
    chartEscolas = new Chart(ctxEsc, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#475569', font: { family: 'Outfit', size: 12, weight: '600' } } },
          tooltip: {
            callbacks: {
              label: function(context) { return ` ${context.dataset.label}: ${formatarNota(context.parsed.y)}`; }
            }
          }
        },
        scales: {
          x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
          y: { 
            min: 0, 
            max: 10, 
            grid: { color: '#e2e8f0' }, 
            ticks: { color: '#64748b', callback: v => formatarNota(v) } 
          }
        }
      }
    });
  }

  // Atualizar Gráfico de Metas com o recorte filtrado
  const ctxMetas = document.getElementById('chartMetasComparativo');
  if (ctxMetas) {
    const total = alunos.length || 1;
    const nAbaixo = alunos.filter(a => a.nivel_lp === 'Abaixo do Básico' || a.nivel_mat === 'Abaixo do Básico').length;
    const nBasico = alunos.filter(a => a.nivel_lp === 'Básico' || a.nivel_mat === 'Básico').length;
    const nAdequado = alunos.filter(a => a.nivel_lp === 'Adequado' || a.nivel_mat === 'Adequado').length;
    const nAvancado = alunos.filter(a => a.nivel_lp === 'Avançado' || a.nivel_mat === 'Avançado').length;

    const realPercs = [
      parseFloat(((nAbaixo / total) * 100).toFixed(1)),
      parseFloat(((nBasico / total) * 100).toFixed(1)),
      parseFloat(((nAdequado / total) * 100).toFixed(1)),
      parseFloat(((nAvancado / total) * 100).toFixed(1))
    ];

    if (chartMetas) chartMetas.destroy();
    chartMetas = new Chart(ctxMetas, {
      type: 'bar',
      data: {
        labels: ["Abaixo do Básico", "Básico", "Adequado", "Avançado"],
        datasets: [
          {
            label: 'Recorte Selecionado (%)',
            data: realPercs,
            backgroundColor: '#0284c7',
            borderRadius: 4
          },
          {
            label: 'Meta Municipal 2026 (%)',
            data: [8.0, 18.0, 52.0, 22.0],
            backgroundColor: '#d97706',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#475569', font: { family: 'Outfit', size: 12, weight: '600' } } }
        },
        scales: {
          x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
          y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', callback: v => v + '%' } }
        }
      }
    });
  }
}

function exportarRelatorioFiltradoCSV() {
  const escola = encodeURIComponent(document.getElementById('rel-filtro-escola')?.value || 'todos');
  const turma = encodeURIComponent(document.getElementById('rel-filtro-turma')?.value || 'todos');
  const disciplina = encodeURIComponent(document.getElementById('rel-filtro-disciplina')?.value || 'todas');
  const nivel = encodeURIComponent(document.getElementById('rel-filtro-nivel')?.value || 'todos');

  const url = `/api/v1/exportar/csv?escola=${escola}&turma=${turma}&disciplina=${disciplina}&nivel=${nivel}`;
  window.location.href = url;
}

function imprimirRelatorioFiltrado() {
  window.print();
}

function imprimirRelatorioBI() {
  window.print();
}

// --- 9. MODAIS & TOAST ---
function fecharModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

function mostrarToast(mensagem, tipo = 'sucesso') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = mensagem;
  if (tipo === 'erro') toast.style.borderLeftColor = 'var(--color-danger)';
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Inicialização automática de Alta Performance (Arquitetura Modular)
document.addEventListener('DOMContentLoaded', async () => {
  // Carrega componentes de interface (views e modais) se ainda não estiverem embutidos
  if (typeof ComponentLoader !== 'undefined') {
    await ComponentLoader.initAll();
  }

  // Inicializa permissões e dados em paralelo
  aplicarPermissoesPerfilUI(perfilAtivoRBAC);
  carregarTodasMetricas();
  carregarAvaliacoes();
  carregarDadosCadastros();
  carregarConfiguracoes();

  // Otimização de Performance: Debounce automático para todos os campos de busca rápida
  const inputBuscaCad = document.getElementById('busca-cadastros');
  if (inputBuscaCad) {
    inputBuscaCad.removeAttribute('oninput');
    inputBuscaCad.addEventListener('input', debounce((e) => filtrarCadastrosGenerico(e.target.value), 200));
  }
  const inputBuscaEstudante = document.getElementById('busca-estudante');
  if (inputBuscaEstudante) {
    inputBuscaEstudante.removeAttribute('onkeyup');
    inputBuscaEstudante.addEventListener('input', debounce((e) => filtrarAlunosTabela(e.target.value), 200));
  }
  const inputBuscaNotas = document.getElementById('notas-busca-aluno');
  if (inputBuscaNotas) {
    inputBuscaNotas.removeAttribute('oninput');
    inputBuscaNotas.addEventListener('input', debounce((e) => filtrarTabelaNotasAlunos(e.target.value), 200));
  }
});

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