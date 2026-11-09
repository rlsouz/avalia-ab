// ==========================================
// AVALIA AB - Banco de Dados Local / Mock Reativo para GitHub Pages
// Suporta CRUD completo em memória e persistência em localStorage
// ==========================================

const CHAVE_STORAGE_DEMO = 'avalia_ab_banco_dados_v1';

// Dados iniciais de Água Boa - MT
const DADOS_INICIAIS_AGUA_BOA = {
  "usuarios": [
    {
      "id": 1,
      "codigo": "0001",
      "nome": "Pablo Souza",
      "cpf": "78855110578",
      "cargo": "Administrador Geral (SEDUC / TI)",
      "endereco": "Centro",
      "telefone": "(66) 99999-0001",
      "email": "pablorobertolima@gmail.com",
      "status": "Ativo",
      "perfil": "admin",
      "escola_vinculo": ""
    },
    {
      "id": 2,
      "codigo": "0002",
      "nome": "Coordenador Pedagógico",
      "cpf": "11122233344",
      "cargo": "Coordenador Pedagógico Municipal",
      "endereco": "Centro",
      "telefone": "(66) 99999-0002",
      "email": "coordenacao@aguaboa.mt.gov.br",
      "status": "Ativo",
      "perfil": "coordenador",
      "escola_vinculo": ""
    }
  ],
  "escolas": [
    {
      "id": 1,
      "codigo": "001",
      "nome": "Escola Municipal Ermindo Mendel",
      "endereco": "R. BC01",
      "numero": "S/N",
      "bairro": "Universitário",
      "telefone": "(66) 99985-9642",
      "codigo_inep": "51000001",
      "tipo_unidade": "Urbana",
      "total_turmas": 6,
      "total_alunos": 142,
      "proficiencia_lp": 269.6,
      "proficiencia_mat": 272.9,
      "nota_media_lp": 9.2,
      "nota_media_mat": 9.1,
      "taxa_participacao": "98.5%",
      "status": "Ativo"
    },
    {
      "id": 2,
      "codigo": "002",
      "nome": "Escola Municipal Cecília Meireles",
      "endereco": "Rua C",
      "numero": "173",
      "bairro": "Jardim Tropical",
      "telefone": "(66) 3468-2111",
      "codigo_inep": "51060507",
      "tipo_unidade": "Urbana",
      "total_turmas": 8,
      "total_alunos": 185,
      "proficiencia_lp": 267.0,
      "proficiencia_mat": 245.8,
      "nota_media_lp": 9.0,
      "nota_media_mat": 7.1,
      "taxa_participacao": "96.0%",
      "status": "Ativo"
    },
    {
      "id": 3,
      "codigo": "003",
      "nome": "Escola Municipal Cristalino",
      "endereco": "Assentamento Cristalino",
      "numero": "S/N",
      "bairro": "Zona Rural",
      "telefone": "(66) 3468-1200",
      "codigo_inep": "51060899",
      "tipo_unidade": "Campo",
      "total_turmas": 4,
      "total_alunos": 64,
      "proficiencia_lp": 254.2,
      "proficiencia_mat": 258.0,
      "nota_media_lp": 8.1,
      "nota_media_mat": 8.3,
      "taxa_participacao": "94.2%",
      "status": "Ativo"
    },
    {
      "id": 4,
      "codigo": "004",
      "nome": "Escola Municipal Simone de Moura",
      "endereco": "Av. Brasil",
      "numero": "450",
      "bairro": "Centro",
      "telefone": "(66) 3468-3344",
      "codigo_inep": "51060123",
      "tipo_unidade": "Urbana",
      "total_turmas": 10,
      "total_alunos": 240,
      "proficiencia_lp": 275.4,
      "proficiencia_mat": 268.9,
      "nota_media_lp": 8.9,
      "nota_media_mat": 8.6,
      "taxa_participacao": "97.1%",
      "status": "Ativo"
    }
  ],
  "alunos": [
    {
      "id": 1,
      "codigo_escola": "002",
      "nome_escola": "Escola Municipal Cecília Meireles",
      "codigo_aluno": "0001",
      "codigo_inep": "510605070001",
      "nome": "Ana Lima",
      "nome_responsavel": "José Lima",
      "endereco": "Centro",
      "telefone_responsavel": "(66) 99911-2233",
      "turma": "5.º Ano",
      "sala": "Sala 01",
      "turno": "Matutino",
      "nota_lp": 9.0,
      "nota_mat": 7.1,
      "nota_ciencias": 8.5,
      "frequencia": "100%",
      "nivel_lp": "Avançado",
      "nivel_mat": "Adequado",
      "proficiencia_lp": 267.0,
      "proficiencia_mat": 245.8,
      "situacao": "Ativo",
      "habilidades_dominadas_json": "[\"EF05LP01\", \"EF05LP04\", \"EF05MA01\", \"EF05MA07\"]",
      "habilidades_desenvolvimento_json": "[\"EF05LP15\", \"EF05MA19\"]",
      "habilidades_intervencao_json": "[\"EF05MA08\"]",
      "parecer_pedagogico": "Estudante demonstra excelente leitura e interpretação de textos. Em matemática, domina números racionais mas necessita reforço pontual em divisão com decimais."
    },
    {
      "id": 2,
      "codigo_escola": "001",
      "nome_escola": "Escola Municipal Ermindo Mendel",
      "codigo_aluno": "0002",
      "codigo_inep": "510000010002",
      "nome": "Gabriel Santos",
      "nome_responsavel": "Ana Santos",
      "endereco": "Rua 60",
      "telefone_responsavel": "(66) 99922-4455",
      "turma": "1.º Ano",
      "sala": "Sala 01",
      "turno": "Matutino",
      "nota_lp": 9.2,
      "nota_mat": 9.1,
      "nota_ciencias": 9.0,
      "frequencia": "100%",
      "nivel_lp": "Avançado",
      "nivel_mat": "Avançado",
      "proficiencia_lp": 269.6,
      "proficiencia_mat": 272.9,
      "situacao": "Ativo",
      "habilidades_dominadas_json": "[\"EF01LP01\", \"EF01LP02\", \"EF01MA01\", \"EF01MA04\"]",
      "habilidades_desenvolvimento_json": "[\"EF01LP16\"]",
      "habilidades_intervencao_json": "[]",
      "parecer_pedagogico": "Excelente desenvolvimento na fase de alfabetização e raciocínio lógico-matemático."
    },
    {
      "id": 3,
      "codigo_escola": "004",
      "nome_escola": "Escola Municipal Simone de Moura",
      "codigo_aluno": "0003",
      "codigo_inep": "510601230003",
      "nome": "Lucas Oliveira Silva",
      "nome_responsavel": "Mariana Oliveira",
      "endereco": "Av. Brasil, 120",
      "telefone_responsavel": "(66) 99933-6677",
      "turma": "5.º Ano",
      "sala": "Sala 03",
      "turno": "Vespertino",
      "nota_lp": 8.5,
      "nota_mat": 8.8,
      "nota_ciencias": 8.2,
      "frequencia": "98%",
      "nivel_lp": "Avançado",
      "nivel_mat": "Avançado",
      "proficiencia_lp": 262.1,
      "proficiencia_mat": 265.4,
      "situacao": "Ativo",
      "habilidades_dominadas_json": "[\"EF05LP02\", \"EF05MA02\", \"EF05MA03\"]",
      "habilidades_desenvolvimento_json": "[\"EF05LP09\"]",
      "habilidades_intervencao_json": "[]",
      "parecer_pedagogico": "Desempenho consolidado nos componentes fundamentais da BNCC."
    }
  ],
  "turmas": [
    {
      "id": 1,
      "codigo_escola": "001",
      "nome_escola": "Escola Municipal Ermindo Mendel",
      "periodo_letivo": "2026 - Anual",
      "modalidade": "Ensino Fundamental Regular",
      "etapa": "AI (1.º a 5.º) anos",
      "turma": "1.º Ano",
      "turno": "Matutino",
      "total_alunos": 24,
      "sala": "Sala 01"
    },
    {
      "id": 2,
      "codigo_escola": "002",
      "nome_escola": "Escola Municipal Cecília Meireles",
      "periodo_letivo": "2026 - Anual",
      "modalidade": "Ensino Fundamental Regular",
      "etapa": "AI (1.º a 5.º) anos",
      "turma": "5.º Ano",
      "turno": "Matutino",
      "total_alunos": 26,
      "sala": "Sala 01"
    },
    {
      "id": 3,
      "codigo_escola": "004",
      "nome_escola": "Escola Municipal Simone de Moura",
      "periodo_letivo": "2026 - Anual",
      "modalidade": "Ensino Fundamental Regular",
      "etapa": "AI (1.º a 5.º) anos",
      "turma": "5.º Ano",
      "turno": "Vespertino",
      "total_alunos": 25,
      "sala": "Sala 03"
    }
  ],
  "avaliacoes": [
    {
      "id": 1,
      "codigo": "AVAL-2026-DIAG",
      "titulo": "Avaliação Diagnóstica Municipal 2026 - Entrada",
      "componente": "Língua Portuguesa & Matemática",
      "ano_escolar": "2º ao 9º Ano",
      "tipo": "Diagnóstica",
      "periodo_inicio": "2026-03-02",
      "periodo_fim": "2026-03-20",
      "total_itens": 24,
      "total_inscritos": 631,
      "total_avaliados": 609,
      "taxa_participacao": "96.5%",
      "proficiencia_media": 264.8,
      "status": "Concluída"
    },
    {
      "id": 2,
      "codigo": "AVAL-2026-INT",
      "titulo": "Monitoramento Formativo Intermediário 2026",
      "componente": "Matemática",
      "ano_escolar": "5º e 9º Anos",
      "tipo": "Formativa",
      "periodo_inicio": "2026-06-01",
      "periodo_fim": "2026-06-15",
      "total_itens": 20,
      "total_inscritos": 410,
      "total_avaliados": 398,
      "taxa_participacao": "97.0%",
      "proficiencia_media": 266.2,
      "status": "Concluída"
    },
    {
      "id": 3,
      "codigo": "AVAL-2026-FINAL",
      "titulo": "Avaliação Somativa de Saída (SAEB Água Boa)",
      "componente": "Língua Portuguesa & Matemática",
      "ano_escolar": "1º ao 9º Ano",
      "tipo": "Somativa",
      "periodo_inicio": "2026-11-10",
      "periodo_fim": "2026-11-28",
      "total_itens": 26,
      "total_inscritos": 650,
      "total_avaliados": 0,
      "taxa_participacao": "0%",
      "proficiencia_media": 0.0,
      "status": "Agendada"
    }
  ],
  "matriz_curricular": [
    {
      "id": 1,
      "codigo_escola": "001",
      "nome_escola": "Escola Municipal Ermindo Mendel",
      "codigo_aluno": "",
      "codigo_inep": "",
      "nome": "",
      "turma": "1.º Ano",
      "sala": "Sala 01",
      "turno": "Matutino",
      "nome_disciplina": "Língua Portuguesa",
      "carga_horaria": "200h"
    },
    {
      "id": 2,
      "codigo_escola": "001",
      "nome_escola": "Escola Municipal Ermindo Mendel",
      "codigo_aluno": "",
      "codigo_inep": "",
      "nome": "",
      "turma": "1.º Ano",
      "sala": "Sala 01",
      "turno": "Matutino",
      "nome_disciplina": "Matemática",
      "carga_horaria": "200h"
    }
  ],
  "cargos": [
    { "id": 1, "codigo_cargo": "CARG-001", "cargo": "Coordenador Técnico", "departamento": "Secretaria Municipal de Educação", "data_atribuicao": "2026-02-01" },
    { "id": 2, "codigo_cargo": "CARG-002", "cargo": "Coordenador Pedagógico", "departamento": "Secretaria Municipal de Educação", "data_atribuicao": "2026-02-01" },
    { "id": 3, "codigo_cargo": "CARG-003", "cargo": "Professor Titular", "departamento": "Rede Municipal de Ensino", "data_atribuicao": "2026-02-01" }
  ],
  "configuracoes": [
    { "chave": "parametrizacao_media_nivel", "valor": "{\"media_geral_aprovacao\": 7.0, \"nota_min_avancado\": 8.0, \"nota_max_avancado\": 10.0, \"nota_min_adequado\": 7.0, \"nota_max_adequado\": 7.9, \"nota_min_basico\": 6.0, \"nota_max_basico\": 6.9, \"nota_min_abaixo\": 0.0, \"nota_max_abaixo\": 5.9}" },
    { "chave": "seguranca", "valor": "{\"autenticacao_2fa\": true, \"politica_senhas_fortes\": true, \"tempo_sessao_minutos\": 60, \"bloqueio_tentativas_incorretas\": true, \"max_tentativas_login\": 5, \"trilha_auditoria_ativa\": true}" },
    { "chave": "funcionalidades", "valor": "{\"modulo_dashboard\": true, \"modulo_avaliacoes\": true, \"modulo_escolas\": true, \"modulo_alunos\": true, \"modulo_bi_relatorios\": true, \"modulo_cadastros_gerais\": true, \"modulo_boletins_online\": true, \"modulo_exportacao_csv\": true, \"modulo_integracao_seduc\": true, \"modulo_simulados_saeb\": true}" }
  ],
  "auditoria_lgpd": [
    {
      "id": 1,
      "timestamp": "2026-11-09T09:00:00-03:00",
      "usuario": "Pablo Souza",
      "perfil": "admin",
      "acao": "ACESSO_PLATAFORMA",
      "detalhes": "Sessão iniciada na Plataforma AVALIA AB - Rede Municipal de Água Boa - MT",
      "ip_origem": "127.0.0.1",
      "hash_integridade": "eba7d57a0ecfd3bcb69c08d77d946b1579137d9c1fe486df5bf4be0749eef666"
    }
  ]
};

// Gerenciador Reativo de Dados com Persistência
window.AvaliaDB = {
  obterDados() {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE_DEMO);
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch (e) {
      console.warn("Erro ao ler localStorage:", e);
    }
    // Inicializa com dados estruturados oficiais de Água Boa
    const copiaInicial = JSON.parse(JSON.stringify(DADOS_INICIAIS_AGUA_BOA));
    this.salvarDados(copiaInicial);
    return copiaInicial;
  },

  salvarDados(dados) {
    try {
      localStorage.setItem(CHAVE_STORAGE_DEMO, JSON.stringify(dados));
    } catch (e) {
      console.warn("Erro ao persistir no localStorage:", e);
    }
  },

  obterTabela(nomeTabela) {
    const dados = this.obterDados();
    return dados[nomeTabela] || [];
  },

  inserir(nomeTabela, item) {
    const dados = this.obterDados();
    if (!dados[nomeTabela]) dados[nomeTabela] = [];
    
    // Gera ID sequencial autoincrement
    const maxId = dados[nomeTabela].reduce((max, it) => Math.max(max, it.id || 0), 0);
    const novoItem = { ...item, id: maxId + 1 };
    
    dados[nomeTabela].push(novoItem);
    this.salvarDados(dados);
    return novoItem;
  },

  atualizar(nomeTabela, id, novosCampos) {
    const dados = this.obterDados();
    if (!dados[nomeTabela]) return null;

    const index = dados[nomeTabela].findIndex(it => String(it.id) === String(id));
    if (index !== -1) {
      dados[nomeTabela][index] = { ...dados[nomeTabela][index], ...novosCampos, id: Number(id) };
      this.salvarDados(dados);
      return dados[nomeTabela][index];
    }
    return null;
  },

  excluir(nomeTabela, id) {
    const dados = this.obterDados();
    if (!dados[nomeTabela]) return false;

    dados[nomeTabela] = dados[nomeTabela].filter(it => String(it.id) !== String(id));
    this.salvarDados(dados);
    return true;
  }
};

window._AVALIA_AB_DEMO_DATA_ = {
  platform: "Plataforma AVALIA AB - Agua Boa MT",
  get tables() {
    return window.AvaliaDB.obterDados();
  }
};
