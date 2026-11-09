// ==========================================
// AVALIA AB - Plataforma de Avaliação Educacional
// Município de Água Boa - MT • Controlador Reativo SPA
// ==========================================

// Interceptador Global de Requisições HTTP (Anexa Token Criptográfico, Proteção CSRF, Cookies Seguros e Mock para GitHub Pages)
function responderMockDemo(urlStr, opcoes = {}) {
  const method = (opcoes.method || 'GET').toUpperCase();
  const demoData = window._AVALIA_AB_DEMO_DATA_?.tables || {};
  let bodyJson = {};
  if (opcoes.body && typeof opcoes.body === 'string') {
    try { bodyJson = JSON.parse(opcoes.body); } catch(e) {}
  }

  const cleanUrl = urlStr.split('?')[0];

  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  // 1. Autenticação e Sessão
  if (cleanUrl.endsWith('/api/v1/auth/me')) {
    const usuarioSalvo = localStorage.getItem('avalia_ab_usuario');
    if (usuarioSalvo) {
      return jsonResponse(JSON.parse(usuarioSalvo));
    }
    return jsonResponse({ detail: "Sessão não autenticada." }, 401);
  }

  if (cleanUrl.endsWith('/api/v1/auth/login')) {
    const usuarioAdmin = demoData.usuarios?.[0] || {
      id: 1, codigo: "0001", nome: "Pablo Souza (Administrador)",
      perfil: "admin", cargo: "Administrador Geral (SEDUC / TI)",
      email: "pablorobertolima@gmail.com"
    };
    const ident = bodyJson.identificador || '0001';
    let usuEncontrado = (demoData.usuarios || []).find(u => 
      u.codigo === ident || u.email === ident || u.cpf === ident
    ) || { ...usuarioAdmin, nome: ident.includes('@') ? ident.split('@')[0] : `Usuário (${ident})` };
    
    usuEncontrado = { ...usuEncontrado, token: 'demo_token_' + Date.now() };
    return jsonResponse(usuEncontrado);
  }

  if (cleanUrl.endsWith('/api/v1/auth/logout')) {
    return jsonResponse({ ok: true, detail: "Sessão encerrada com sucesso." });
  }

  if (cleanUrl.endsWith('/api/v1/auth/usuarios-disponiveis')) {
    return jsonResponse((demoData.usuarios || []).map(u => ({
      codigo: u.codigo, nome: u.nome, perfil: u.perfil, cargo: u.cargo
    })));
  }

  if (cleanUrl.endsWith('/api/v1/auth/redefinir-senha')) {
    return jsonResponse({ ok: true, mensagem: "Senha redefinida com sucesso no ambiente demonstrativo." });
  }

  // 2. Dashboard e Telemetria
  if (cleanUrl.endsWith('/api/v1/dashboard/resumo')) {
    const escolas = demoData.escolas || [];
    const turmas = demoData.turmas || [];
    const alunos = demoData.alunos || [];
    const avaliacoes = demoData.avaliacoes || [];
    return jsonResponse({
      kpis: {
        total_escolas: escolas.length,
        total_turmas: turmas.length || 24,
        total_estudantes: 631,
        taxa_participacao: "96.5%",
        nota_media_lp: 8.9,
        nota_media_mat: 8.5,
        proficiencia_media_lp: 266.3,
        proficiencia_media_mat: 261.2
      },
      avaliacoes_recentes: avaliacoes,
      top_escolas: escolas,
      alertas_pedagogicos: [
        {
          tipo: "sucesso",
          titulo: "Plataforma AVALIA AB Operacional • Água Boa - MT",
          descricao: `Rede Municipal com ${escolas.length} Unidades Escolares ativas no ciclo de monitoramento educacional 2026.`,
          acao: "Acompanhar Indicadores"
        },
        {
          tipo: "atencao",
          titulo: "Meta Municipal de Proficiência SAEB / BNCC",
          descricao: "96.5% de taxa de participação consolidada nas avaliações formativas e diagnósticas municipais.",
          acao: "Ver Relatórios e BI"
        }
      ]
    });
  }

  // 3. Relatórios e Gráficos
  if (cleanUrl.endsWith('/api/v1/relatorios/evolucao-historica')) {
    return jsonResponse({
      ciclos: ["2023 - Saída", "2024 - Diagnóstica", "2024 - Saída", "2025 - Diagnóstica", "2025 - Saída", "2026 - Atual"],
      lingua_portuguesa: [6.2, 6.5, 6.9, 7.2, 7.5, 8.9],
      matematica: [6.4, 6.7, 7.1, 7.4, 7.8, 8.5],
      meta_agua_boa: [7.0, 7.2, 7.5, 7.8, 8.0, 8.2]
    });
  }

  if (cleanUrl.endsWith('/api/v1/relatorios/distribuicao-niveis')) {
    return jsonResponse({
      rotulos: ["Abaixo do Básico", "Básico", "Adequado", "Avançado"],
      lingua_portuguesa: [6.5, 14.2, 53.8, 25.5],
      matematica: [7.0, 16.5, 52.4, 24.1],
      meta_municipal_2026: [8.0, 18.0, 52.0, 22.0]
    });
  }

  // 4. Módulos e Tabelas (Leitura e Mutações com Persistência Reativa via AvaliaDB)
  const db = window.AvaliaDB;

  // USUÁRIOS
  if (cleanUrl.endsWith('/api/v1/cadastros/usuarios')) {
    if (method === 'POST') {
      const codigoSeq = String((db.obterTabela('usuarios').length || 0) + 1).padStart(4, '0');
      const novoUsu = db.inserir('usuarios', {
        codigo: bodyJson.codigo || codigoSeq,
        nome: bodyJson.nome || 'Novo Usuário',
        cpf: bodyJson.cpf || '',
        cargo: bodyJson.cargo || (bodyJson.perfil === 'admin' ? 'Administrador Geral' : 'Coordenador Pedagógico'),
        endereco: bodyJson.endereco || 'Água Boa - MT',
        telefone: bodyJson.telefone || '',
        email: bodyJson.email || '',
        status: bodyJson.status || 'Ativo',
        perfil: bodyJson.perfil || 'coordenador',
        escola_vinculo: bodyJson.escola_vinculo || ''
      });
      return jsonResponse(novoUsu, 201);
    }
    return jsonResponse(db.obterTabela('usuarios'));
  }

  const matchUsuId = cleanUrl.match(/\/api\/v1\/cadastros\/usuarios\/(\d+)/);
  if (matchUsuId) {
    const id = Number(matchUsuId[1]);
    if (method === 'PUT') {
      const atualizado = db.atualizar('usuarios', id, bodyJson);
      return jsonResponse(atualizado || { id, ...bodyJson });
    }
    if (method === 'DELETE') {
      db.excluir('usuarios', id);
      return jsonResponse({ ok: true, mensagem: "Usuário excluído com sucesso." });
    }
  }

  // ESCOLAS
  if (cleanUrl.endsWith('/api/v1/escolas') || cleanUrl.endsWith('/api/v1/cadastros/escolas')) {
    if (method === 'POST') {
      const codigoSeq = String((db.obterTabela('escolas').length || 0) + 1).padStart(3, '0');
      const novaEscola = db.inserir('escolas', {
        codigo: bodyJson.codigo || codigoSeq,
        nome: bodyJson.nome || 'Nova Escola',
        endereco: bodyJson.endereco || '',
        numero: bodyJson.numero || 'S/N',
        bairro: bodyJson.bairro || 'Centro',
        telefone: bodyJson.telefone || '',
        codigo_inep: bodyJson.codigo_inep || '',
        tipo_unidade: bodyJson.tipo_unidade || 'Urbana',
        total_turmas: 0,
        total_alunos: 0,
        proficiencia_lp: 250.0,
        proficiencia_mat: 250.0,
        nota_media_lp: 8.0,
        nota_media_mat: 8.0,
        taxa_participacao: '100%',
        status: 'Ativo'
      });
      return jsonResponse(novaEscola, 201);
    }
    return jsonResponse(db.obterTabela('escolas'));
  }

  const matchEscolaId = cleanUrl.match(/\/api\/v1\/cadastros\/escolas\/(\d+)/);
  if (matchEscolaId) {
    const id = Number(matchEscolaId[1]);
    if (method === 'PUT') {
      const atualizado = db.atualizar('escolas', id, bodyJson);
      return jsonResponse(atualizado || { id, ...bodyJson });
    }
    if (method === 'DELETE') {
      db.excluir('escolas', id);
      return jsonResponse({ ok: true, mensagem: "Escola excluída com sucesso." });
    }
  }

  // ALUNOS
  if (cleanUrl.endsWith('/api/v1/alunos') || cleanUrl.endsWith('/api/v1/cadastros/alunos')) {
    if (method === 'POST') {
      const codigoSeq = String((db.obterTabela('alunos').length || 0) + 1).padStart(4, '0');
      const novoAluno = db.inserir('alunos', {
        codigo_escola: bodyJson.codigo_escola || '001',
        nome_escola: bodyJson.nome_escola || 'Escola Municipal',
        codigo_aluno: bodyJson.codigo_aluno || codigoSeq,
        codigo_inep: bodyJson.codigo_inep || '',
        nome: bodyJson.nome || 'Novo Aluno',
        nome_responsavel: bodyJson.nome_responsavel || 'Responsável',
        endereco: bodyJson.endereco || 'Água Boa - MT',
        telefone_responsavel: bodyJson.telefone_responsavel || '',
        turma: bodyJson.turma || '1º Ano',
        sala: bodyJson.sala || 'Sala 01',
        turno: bodyJson.turno || 'Matutino',
        nota_lp: 8.0,
        nota_mat: 8.0,
        nota_ciencias: 8.0,
        frequencia: '100%',
        nivel_lp: 'Adequado',
        nivel_mat: 'Adequado',
        proficiencia_lp: 250.0,
        proficiencia_mat: 250.0,
        situacao: 'Ativo',
        habilidades_dominadas_json: '[]',
        habilidades_desenvolvimento_json: '[]',
        habilidades_intervencao_json: '[]',
        parecer_pedagogico: ''
      });
      return jsonResponse(novoAluno, 201);
    }
    return jsonResponse(db.obterTabela('alunos'));
  }

  const matchAlunoId = cleanUrl.match(/\/api\/v1\/cadastros\/alunos\/(\d+)/);
  if (matchAlunoId) {
    const id = Number(matchAlunoId[1]);
    if (cleanUrl.endsWith('/notas') && method === 'PUT') {
      const aluno = db.obterTabela('alunos').find(a => Number(a.id) === id);
      if (aluno) {
        const lp = Number(bodyJson.nota_lp ?? aluno.nota_lp);
        const mat = Number(bodyJson.nota_mat ?? aluno.nota_mat);
        const atualizado = db.atualizar('alunos', id, {
          nota_lp: lp,
          nota_mat: mat,
          nivel_lp: lp >= 8 ? 'Avançado' : lp >= 7 ? 'Adequado' : lp >= 6 ? 'Básico' : 'Abaixo do Básico',
          nivel_mat: mat >= 8 ? 'Avançado' : mat >= 7 ? 'Adequado' : mat >= 6 ? 'Básico' : 'Abaixo do Básico',
          proficiencia_lp: Number((lp * 28 + 15).toFixed(1)),
          proficiencia_mat: Number((mat * 28 + 18).toFixed(1))
        });
        return jsonResponse(atualizado);
      }
      return jsonResponse({ ok: true });
    }
    if (method === 'PUT') {
      const atualizado = db.atualizar('alunos', id, bodyJson);
      return jsonResponse(atualizado || { id, ...bodyJson });
    }
    if (method === 'DELETE') {
      db.excluir('alunos', id);
      return jsonResponse({ ok: true, mensagem: "Aluno excluído com sucesso." });
    }
  }

  // TURMAS
  if (cleanUrl.endsWith('/api/v1/cadastros/turmas')) {
    if (method === 'POST') {
      const novaTurma = db.inserir('turmas', {
        codigo_escola: bodyJson.codigo_escola || '001',
        nome_escola: bodyJson.nome_escola || 'Escola Municipal',
        periodo_letivo: bodyJson.periodo_letivo || '2026 - Anual',
        modalidade: bodyJson.modalidade || 'Ensino Fundamental Regular',
        etapa: bodyJson.etapa || 'AI (1.º a 5.º) anos',
        turma: bodyJson.turma || 'Turma A',
        turno: bodyJson.turno || 'Matutino',
        total_alunos: 0,
        sala: bodyJson.sala || 'Sala 01'
      });
      return jsonResponse(novaTurma, 201);
    }
    return jsonResponse(db.obterTabela('turmas'));
  }

  const matchTurmaId = cleanUrl.match(/\/api\/v1\/cadastros\/turmas\/(\d+)/);
  if (matchTurmaId) {
    const id = Number(matchTurmaId[1]);
    if (method === 'PUT') {
      const atualizado = db.atualizar('turmas', id, bodyJson);
      return jsonResponse(atualizado || { id, ...bodyJson });
    }
    if (method === 'DELETE') {
      db.excluir('turmas', id);
      return jsonResponse({ ok: true, mensagem: "Turma excluída com sucesso." });
    }
  }

  // MATRIZ CURRICULAR
  if (cleanUrl.endsWith('/api/v1/cadastros/matriz-curricular')) {
    if (method === 'POST') {
      const novaMatriz = db.inserir('matriz_curricular', {
        codigo_escola: bodyJson.codigo_escola || '001',
        nome_escola: bodyJson.nome_escola || 'Escola Municipal',
        codigo_aluno: bodyJson.codigo_aluno || '',
        codigo_inep: bodyJson.codigo_inep || '',
        nome: bodyJson.nome || '',
        turma: bodyJson.turma || '1.º Ano',
        sala: bodyJson.sala || 'Sala 01',
        turno: bodyJson.turno || 'Matutino',
        nome_disciplina: bodyJson.nome_disciplina || 'Língua Portuguesa',
        carga_horaria: bodyJson.carga_horaria || '200h'
      });
      return jsonResponse(novaMatriz, 201);
    }
    return jsonResponse(db.obterTabela('matriz_curricular'));
  }

  const matchMatrizId = cleanUrl.match(/\/api\/v1\/cadastros\/matriz-curricular\/(\d+)/);
  if (matchMatrizId) {
    const id = Number(matchMatrizId[1]);
    if (method === 'PUT') {
      const atualizado = db.atualizar('matriz_curricular', id, bodyJson);
      return jsonResponse(atualizado || { id, ...bodyJson });
    }
    if (method === 'DELETE') {
      db.excluir('matriz_curricular', id);
      return jsonResponse({ ok: true, mensagem: "Disciplina excluída com sucesso." });
    }
  }

  // AVALIAÇÕES
  if (cleanUrl.endsWith('/api/v1/avaliacoes')) {
    if (method === 'POST') {
      const novaAval = db.inserir('avaliacoes', {
        codigo: bodyJson.codigo || 'AVAL-' + Date.now(),
        titulo: bodyJson.titulo || 'Nova Avaliação',
        componente: bodyJson.componente || 'Língua Portuguesa & Matemática',
        ano_escolar: bodyJson.ano_escolar || '5º Ano',
        tipo: bodyJson.tipo || 'Diagnóstica',
        periodo_inicio: bodyJson.periodo_inicio || '2026-03-01',
        periodo_fim: bodyJson.periodo_fim || '2026-03-15',
        total_itens: Number(bodyJson.total_itens) || 20,
        total_inscritos: 150,
        total_avaliados: 0,
        taxa_participacao: '0%',
        proficiencia_media: 0.0,
        status: 'Agendada'
      });
      return jsonResponse(novaAval, 201);
    }
    return jsonResponse(db.obterTabela('avaliacoes'));
  }

  const matchAvalId = cleanUrl.match(/\/api\/v1\/avaliacoes\/(\d+)/);
  if (matchAvalId) {
    const id = Number(matchAvalId[1]);
    if (method === 'DELETE') {
      db.excluir('avaliacoes', id);
      return jsonResponse({ ok: true, mensagem: "Avaliação excluída com sucesso." });
    }
  }

  // Boletim do Aluno
  if (cleanUrl.includes('/api/v1/alunos/') && cleanUrl.endsWith('/boletim')) {
    const aluno = (demoData.alunos || [])[0] || {
      id: 1, nome: "Estudante Municipal", turma: "5º Ano", nome_escola: "Escola Municipal Ermindo Mendel"
    };
    return jsonResponse({
      aluno: aluno,
      ciclo: "Ciclo Avaliativo 2026",
      media_lp: aluno.nota_lp || 9.0,
      media_mat: aluno.nota_mat || 8.5,
      proficiencia_lp: aluno.proficiencia_lp || 269.6,
      proficiencia_mat: aluno.proficiencia_mat || 272.9,
      nivel_lp: aluno.nivel_lp || "Avançado",
      nivel_mat: aluno.nivel_mat || "Avançado",
      habilidades: [
        { codigo: "EF05LP01", descricao: "Identificar a função social de textos de circulação pública.", status: "Consolidada" },
        { codigo: "EF05LP04", descricao: "Diferenciar na leitura palavras homônimas e parônimas.", status: "Consolidada" },
        { codigo: "EF05MA01", descricao: "Ler, escrever e ordenar números naturais até ordem de centenas de milhar.", status: "Consolidada" },
        { codigo: "EF05MA07", descricao: "Resolver e elaborar problemas de divisão cujo divisor tenha até dois algarismos.", status: "Em Desenvolvimento" }
      ],
      parecer: aluno.parecer_pedagogico || "Estudante com excelente evolução pedagógica nas avaliações formativas de Água Boa."
    });
  }

  // Configurações
  if (cleanUrl.endsWith('/api/v1/configuracoes/parametrizacao-media-nivel')) {
    return jsonResponse({
      media_geral_aprovacao: 7.0,
      nota_min_avancado: 8.0, nota_max_avancado: 10.0,
      nota_min_adequado: 7.0, nota_max_adequado: 7.9,
      nota_min_basico: 6.0, nota_max_basico: 6.9,
      nota_min_abaixo: 0.0, nota_max_abaixo: 5.9
    });
  }

  if (cleanUrl.endsWith('/api/v1/configuracoes/seguranca')) {
    return jsonResponse({
      autenticacao_2fa: true, politica_senhas_fortes: true,
      tempo_sessao_minutos: 60, bloqueio_tentativas_incorretas: true,
      max_tentativas_login: 5, trilha_auditoria_ativa: true
    });
  }

  if (cleanUrl.endsWith('/api/v1/configuracoes/funcionalidades')) {
    return jsonResponse({
      modulo_dashboard: true, modulo_avaliacoes: true,
      modulo_escolas: true, modulo_alunos: true,
      modulo_bi_relatorios: true, modulo_cadastros_gerais: true,
      modulo_boletins_online: true, modulo_exportacao_csv: true,
      modulo_integracao_seduc: true, modulo_simulados_saeb: true
    });
  }

  if (cleanUrl.endsWith('/api/v1/auditoria/logs')) {
    return jsonResponse(demoData.auditoria_lgpd || []);
  }

  // Operações de Mutação em modo Demo (POST, PUT, DELETE)
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    return jsonResponse({
      ok: true,
      mensagem: "Operação simulada com sucesso no ambiente demonstrativo.",
      registro: bodyJson
    });
  }

  return jsonResponse({ detail: "Operação demonstrativa realizada" });
}

(function configurarFetchSeguro() {
  const fetchOriginal = window.fetch.bind(window);
  const isDeployEstatico = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';

  window.fetch = async function(input, init = {}) {
    const urlStr = typeof input === 'string' ? input : (input?.url || '');
    
    // Tratamento de requisições à API
    if (urlStr.startsWith('/api/') || urlStr.includes('/api/v1/')) {
      if (isDeployEstatico) {
        return responderMockDemo(urlStr, init);
      }

      const opcoes = { ...init };
      opcoes.credentials = 'same-origin';
      const headers = new Headers(opcoes.headers || {});
      headers.set('X-Requested-With', 'XMLHttpRequest');
      const tokenSalvo = localStorage.getItem('avalia_ab_token');
      if (tokenSalvo && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${tokenSalvo}`);
      }
      opcoes.headers = headers;

      try {
        const resposta = await fetchOriginal(input, opcoes);
        if (resposta.status === 404) {
          return responderMockDemo(urlStr, init);
        }
        return resposta;
      } catch (err) {
        return responderMockDemo(urlStr, init);
      }
    }

    // Para arquivos estáticos normais
    return fetchOriginal(input, init);
  };
})();

// Formatador Oficial de Data e Hora no Fuso Horário de Brasília - Brasil (America/Sao_Paulo, UTC-3)
function formatarDataHoraBrasilia(valorTimestamp) {
  if (!valorTimestamp) return '—';
  let str = String(valorTimestamp).trim();
  // Se vier no formato SQL puro "YYYY-MM-DD HH:MM:SS" sem fuso, trata como UTC para converter para Brasília (-03:00)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const dt = new Date(str);
  if (isNaN(dt.getTime())) return String(valorTimestamp);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(dt);
}

// Relógio em Tempo Real sincronizado com o Horário Oficial de Brasília (America/Sao_Paulo)
(function iniciarRelogioOficialBrasilia() {
  function atualizarRelogio() {
    const el = document.getElementById('relogio-oficial-brasilia');
    if (!el) return;
    el.textContent = formatarDataHoraBrasilia(new Date().toISOString());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      atualizarRelogio();
      setInterval(atualizarRelogio, 1000);
    });
  } else {
    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);
  }
})();

// Utilitário Global de Sanitização contra DOM XSS
function escaparHTML(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Variáveis Globais de Estado
let chartHistorico = null;
let chartNiveis = null;
let chartEscolas = null;
let chartMetas = null;

let listaAvaliacoesGlobal = [];
let listaEscolasGlobal = [];
let listaAlunosGlobal = [];
let listaUsuariosGlobal = [];
let listaTurmasGlobal = [];
let listaMatrizGlobal = [];

let subAbaCadastroAtual = 'usuarios';
let subAbaConfigAtual = 'seguranca';

// Modos de exibição independentes por sub-aba e tela (lista / cartoes)
let modoExibicaoPorSubAba = {
  'usuarios': 'lista',
  'escolas': 'lista',
  'turmas': 'lista',
  'alunos': 'lista',
  'matriz': 'lista'
};
let modoExibicaoAvaliacoes = 'lista';
let modoExibicaoEscolas = 'cartoes';
let modoExibicaoAlunos = 'lista';

// --- CONTROLE DE ACESSO RBAC (POLÍTICAS, USUÁRIO LOGADO E PERFIS) ---
let perfilAtivoRBAC = localStorage.getItem('avalia_ab_perfil') || 'admin';
let usuarioLogadoGlobal = null;
try {
  const salvo = localStorage.getItem('avalia_ab_usuario');
  if (salvo) usuarioLogadoGlobal = JSON.parse(salvo);
} catch (e) {
  usuarioLogadoGlobal = null;
}

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

// Helper de Conformidade LGPD (Art. 6º, VII): Mascaramento de dados pessoais (CPF)
function mascararCPF(cpfStr) {
  if (!cpfStr) return '—';
  // Perfis com privilégio total de TI / Administração veem completo
  if (perfilAtivoRBAC === 'admin') return cpfStr;

  const limpo = String(cpfStr).replace(/\D/g, '');
  if (limpo.length === 11) {
    return `${limpo.slice(0, 3)}.***.***-${limpo.slice(9, 11)}`;
  }
  return '***.***.***-**';
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
  const perfilRealUsuario = usuarioLogadoGlobal?.perfil || 'professor';
  if (perfilRealUsuario !== 'admin' && novoPerfil !== perfilRealUsuario) {
    const selHeader = document.getElementById('select-perfil-rbac');
    if (selHeader) selHeader.value = perfilRealUsuario;
    mostrarToast('Apenas Administradores (SEDUC/TI) podem simular visualização de outros perfis.', 'erro');
    return;
  }
  perfilAtivoRBAC = novoPerfil || perfilRealUsuario;
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

  // Atualizar o nome do usuário exibido no topo
  const lblNomeUsuario = document.getElementById('nome-usuario-logado');
  if (lblNomeUsuario) {
    if (usuarioLogadoGlobal && usuarioLogadoGlobal.nome) {
      lblNomeUsuario.textContent = `${usuarioLogadoGlobal.nome} (${usuarioLogadoGlobal.codigo || 'ID ' + usuarioLogadoGlobal.id})`;
    } else {
      lblNomeUsuario.textContent = perm.nome.split(' ')[0];
    }
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

// ==========================================
// AUTENTICAÇÃO, LOGIN E TROCA DE USUÁRIO
// ==========================================
async function inicializarSessaoUsuario() {
  const sessaoEncerrada = localStorage.getItem('avalia_ab_sessao_encerrada') === 'true';
  if (sessaoEncerrada) {
    await abrirModalLoginUsuario(true);
    return false;
  }

  // Valida o token criptográfico da sessão junto ao backend (/api/v1/auth/me)
  try {
    const res = await fetch('/api/v1/auth/me');
    if (res.ok) {
      const usuarioValido = await res.json();
      usuarioLogadoGlobal = usuarioValido;
      localStorage.setItem('avalia_ab_usuario', JSON.stringify(usuarioValido));
      perfilAtivoRBAC = usuarioValido.perfil || 'admin';
      localStorage.setItem('avalia_ab_perfil', perfilAtivoRBAC);
      aplicarPermissoesPerfilUI(perfilAtivoRBAC);

      const modal = document.getElementById('modal-login-usuario');
      if (modal) {
        modal.setAttribute('data-bloqueado', 'false');
        modal.classList.remove('active');
      }
      return true;
    }
  } catch (e) {
    console.warn('Sessão não autenticada ou expirada:', e);
  }

  // Caso não haja token válido, exige logon obrigatório na tela inicial
  usuarioLogadoGlobal = null;
  localStorage.removeItem('avalia_ab_usuario');
  localStorage.removeItem('avalia_ab_token');
  await abrirModalLoginUsuario(true);
  return false;
}

async function abrirModalLoginUsuario(bloqueado = false) {
  const modal = document.getElementById('modal-login-usuario');
  if (!modal) return;

  modal.setAttribute('data-bloqueado', bloqueado ? 'true' : 'false');
  const btnFechar = document.getElementById('btn-fechar-modal-login');
  const btnCancelar = document.getElementById('btn-cancelar-modal-login');
  if (btnFechar) btnFechar.style.display = bloqueado ? 'none' : '';
  if (btnCancelar) btnCancelar.style.display = bloqueado ? 'none' : '';

  const divErro = document.getElementById('login-mensagem-erro');
  if (divErro) {
    divErro.style.display = 'none';
    divErro.textContent = '';
  }

  const inputSenha = document.getElementById('login-senha');
  if (inputSenha) inputSenha.value = '';

  modal.classList.add('active');
  if (!bloqueado && usuarioLogadoGlobal) {
    await carregarContasModalLogin();
  }
}

function fecharModalLoginUsuario() {
  const modal = document.getElementById('modal-login-usuario');
  if (!modal) return;
  if (modal.getAttribute('data-bloqueado') === 'true') {
    mostrarToast('Faça login com um usuário para acessar a plataforma.', 'erro');
    return;
  }
  modal.classList.remove('active');
}

async function carregarContasModalLogin() {
  const container = document.getElementById('lista-contas-login-rapido');
  if (!container) return;

  try {
    const res = await fetch('/api/v1/auth/usuarios-disponiveis');
    if (!res.ok) throw new Error('Falha ao buscar usuários');
    const usuarios = await res.json();

    if (!usuarios || usuarios.length === 0) {
      container.innerHTML = `<div style="padding: 8px; font-size: 0.8rem; color: var(--text-muted);">Nenhum usuário cadastrado ainda.</div>`;
      return;
    }

    container.innerHTML = '';
    usuarios.forEach(u => {
      const nomePerfil = PERMISSOES_RBAC_UI[u.perfil]?.nome || u.perfil || 'Administrador';
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: all 0.15s;';
      item.onmouseover = () => { item.style.borderColor = '#3b82f6'; item.style.background = '#eff6ff'; };
      item.onmouseout = () => { item.style.borderColor = '#e2e8f0'; item.style.background = '#ffffff'; };
      item.onclick = () => selecionarContaNoModalLogin(u);

      const isAtual = usuarioLogadoGlobal && usuarioLogadoGlobal.id === u.id;
      item.innerHTML = `
        <div>
          <div style="font-size: 0.84rem; font-weight: 700; color: var(--gov-primary);">
            ${u.nome} <span style="font-weight: 500; color: var(--text-muted); font-size: 0.76rem;">(Cód: ${u.codigo})</span>
            ${isAtual ? '<span style="background: #dcfce7; color: #166534; font-size: 0.68rem; padding: 1px 6px; border-radius: 10px; margin-left: 6px;">Atual</span>' : ''}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${u.email || u.cpf} • <strong>${nomePerfil}</strong>
          </div>
        </div>
        <span style="font-size: 0.72rem; font-weight: 600; color: #0284c7;">Selecionar ➔</span>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<div style="padding: 8px; font-size: 0.8rem; color: var(--color-danger);">Erro ao carregar lista de usuários.</div>`;
  }
}

function selecionarContaNoModalLogin(u) {
  const inputIdent = document.getElementById('login-identificador');
  const inputSenha = document.getElementById('login-senha');
  const dica = document.getElementById('login-dica-senha');
  const divErro = document.getElementById('login-mensagem-erro');

  if (divErro) divErro.style.display = 'none';
  if (inputIdent) inputIdent.value = u.email || u.cpf || u.codigo;
  if (inputSenha) {
    inputSenha.value = '';
    inputSenha.focus();
  }
  if (dica) {
    if (u.tem_senha) {
      dica.innerHTML = `Conta selecionada: <strong>${u.nome}</strong>. Digite a senha cadastrada e clique em <strong>Entrar na Plataforma</strong>.`;
    } else {
      dica.innerHTML = `Conta selecionada: <strong>${u.nome}</strong> (sem senha configurada). Clique diretamente em <strong>Entrar na Plataforma</strong>.`;
    }
  }
}

async function submeterLoginPlataforma(event) {
  event.preventDefault();
  const ident = (document.getElementById('login-identificador')?.value || '').trim();
  const senha = (document.getElementById('login-senha')?.value || '').trim();
  const divErro = document.getElementById('login-mensagem-erro');

  if (divErro) {
    divErro.style.display = 'none';
    divErro.textContent = '';
  }

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identificador: ident, senha })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.detail || 'Não foi possível autenticar o usuário.';
      if (divErro) {
        divErro.textContent = msg;
        divErro.style.display = 'block';
      } else {
        mostrarToast(msg, 'erro');
      }
      return;
    }

    const usuario = await res.json();
    if (usuario.token) {
      localStorage.setItem('avalia_ab_token', usuario.token);
    }
    usuarioLogadoGlobal = usuario;
    localStorage.setItem('avalia_ab_usuario', JSON.stringify(usuario));
    localStorage.removeItem('avalia_ab_sessao_encerrada');

    perfilAtivoRBAC = usuario.perfil || 'admin';
    localStorage.setItem('avalia_ab_perfil', perfilAtivoRBAC);

    aplicarPermissoesPerfilUI(perfilAtivoRBAC);

    const modal = document.getElementById('modal-login-usuario');
    if (modal) {
      modal.setAttribute('data-bloqueado', 'false');
      modal.classList.remove('active');
    }

    if (typeof carregarModulosAutenticados === 'function') {
      await carregarModulosAutenticados();
    }

    mostrarToast(`Bem-vindo(a), ${usuario.nome}! Perfil: ${PERMISSOES_RBAC_UI[perfilAtivoRBAC]?.nome || perfilAtivoRBAC}`);
  } catch (err) {
    if (divErro) {
      divErro.textContent = 'Erro de conexão ao realizar login.';
      divErro.style.display = 'block';
    }
  }
}

async function realizarLogoutPlataforma() {
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
  } catch (e) {
    // Continua limpeza local mesmo se offline
  }
  usuarioLogadoGlobal = null;
  localStorage.removeItem('avalia_ab_usuario');
  localStorage.removeItem('avalia_ab_token');
  localStorage.setItem('avalia_ab_sessao_encerrada', 'true');

  const lblNome = document.getElementById('nome-usuario-logado');
  if (lblNome) lblNome.textContent = 'Não autenticado';

  mostrarToast('Sessão encerrada com segurança. Faça login para continuar.');
  abrirModalLoginUsuario(true);
}

function irParaCadastroNovoUsuario() {
  const modalLogin = document.getElementById('modal-login-usuario');
  if (modalLogin && modalLogin.getAttribute('data-bloqueado') === 'true') {
    mostrarToast('Entre primeiro com uma conta de Administrador para cadastrar novos usuários.', 'erro');
    return;
  }
  if (modalLogin) modalLogin.classList.remove('active');
  if (perfilAtivoRBAC !== 'admin' && perfilAtivoRBAC !== 'coordenador' && perfilAtivoRBAC !== 'diretor') {
    aoMudarPerfilAtivoRBAC('admin');
  }
  trocarTela('cadastros');
  if (typeof alternarSubAbaCadastro === 'function') {
    alternarSubAbaCadastro('usuarios');
  }
  if (typeof abrirModalCadastroUsuario === 'function') {
    setTimeout(() => abrirModalCadastroUsuario(), 150);
  }
}

function alternarBoxRedefinirSenha() {
  const box = document.getElementById('box-redefinir-senha-login');
  if (!box) return;
  box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
  const inputAtual = document.getElementById('login-senha-atual-redefinir');
  const inputNova = document.getElementById('login-nova-senha-redefinir');
  if (box.style.display === 'block') {
    if (inputAtual) inputAtual.focus();
    else if (inputNova) inputNova.focus();
  }
}

async function confirmarRedefinicaoSenhaLogin() {
  const ident = (document.getElementById('login-identificador')?.value || '').trim();
  const senhaAtual = (document.getElementById('login-senha-atual-redefinir')?.value || '').trim();
  const novaSenha = (document.getElementById('login-nova-senha-redefinir')?.value || '').trim();
  const divErro = document.getElementById('login-mensagem-erro');

  if (!ident) {
    if (divErro) {
      divErro.textContent = 'Informe o E-mail, CPF ou Código do usuário no campo acima antes de redefinir a senha.';
      divErro.style.display = 'block';
    }
    return;
  }
  if (!novaSenha || novaSenha.length < 4) {
    if (divErro) {
      divErro.textContent = 'A nova senha deve possuir no mínimo 4 caracteres.';
      divErro.style.display = 'block';
    }
    return;
  }

  try {
    const res = await fetch('/api/v1/auth/redefinir-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identificador: ident,
        senha_atual: senhaAtual,
        nova_senha: novaSenha
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (divErro) {
        divErro.textContent = data.detail || 'Erro ao redefinir a senha.';
        divErro.style.display = 'block';
      }
      return;
    }
    const inputSenha = document.getElementById('login-senha');
    if (inputSenha) inputSenha.value = novaSenha;
    const inputAtual = document.getElementById('login-senha-atual-redefinir');
    if (inputAtual) inputAtual.value = '';
    const box = document.getElementById('box-redefinir-senha-login');
    if (box) box.style.display = 'none';
    if (divErro) divErro.style.display = 'none';
    mostrarToast(data.message || 'Senha atualizada com segurança!');
  } catch (err) {
    mostrarToast('Erro de conexão ao redefinir senha.', 'erro');
  }
}

// Configurar listeners nas abas de navegação
document.querySelectorAll('.nav-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const screen = btn.getAttribute('data-screen');
    if (screen) trocarTela(screen);
  });
});
