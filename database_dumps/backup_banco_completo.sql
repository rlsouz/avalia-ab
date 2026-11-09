BEGIN TRANSACTION;
CREATE TABLE alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_escola TEXT NOT NULL,
        nome_escola TEXT NOT NULL,
        codigo_aluno TEXT UNIQUE NOT NULL,
        codigo_inep TEXT NOT NULL,
        nome TEXT NOT NULL,
        nome_responsavel TEXT NOT NULL,
        endereco TEXT NOT NULL,
        telefone_responsavel TEXT NOT NULL,
        turma TEXT NOT NULL,
        sala TEXT NOT NULL,
        turno TEXT NOT NULL,
        nota_lp REAL DEFAULT 8.0,
        nota_mat REAL DEFAULT 8.0,
        nota_ciencias REAL DEFAULT 8.0,
        frequencia TEXT DEFAULT '100%',
        nivel_lp TEXT DEFAULT 'Adequado',
        nivel_mat TEXT DEFAULT 'Adequado',
        proficiencia_lp REAL DEFAULT 240.0,
        proficiencia_mat REAL DEFAULT 245.0,
        situacao TEXT DEFAULT 'Ativo'
    , habilidades_dominadas_json TEXT DEFAULT '', habilidades_desenvolvimento_json TEXT DEFAULT '', habilidades_intervencao_json TEXT DEFAULT '', parecer_pedagogico TEXT DEFAULT '');
INSERT INTO "alunos" VALUES(1,'003','Escola Municipal Cecília Meireles','0001','000000000','Ana Lima','José Lima','Centro','000000000','5.ºAno','Sala 01','Matutino',9.0,7.1,0.0,'100%','Avançado','Adequado',267.0,245.8,'Ativo','','','','');
INSERT INTO "alunos" VALUES(2,'001','Escola Municipal Ermindo Mendel','0002','000000000','Gabriel Santos','Ana Santo','Rua 60','000000000','1.º Ano','Sala 01','Matutino',9.2,9.1,0.0,'100%','Avançado','Avançado',269.6,272.9,'Ativo','','','','');
CREATE TABLE auditoria_lgpd (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario TEXT NOT NULL,
        perfil TEXT NOT NULL,
        acao TEXT NOT NULL,       -- 'VISUALIZACAO', 'EXPORTACAO_CSV', 'ALTERACAO_NOTA', 'LOGIN'
        detalhes TEXT NOT NULL,
        ip_origem TEXT DEFAULT '127.0.0.1'
    , hash_integridade TEXT DEFAULT '');
INSERT INTO "auditoria_lgpd" VALUES(1,'2026-10-23T10:45:59-03:00','Usuário Conectado','admin','EXPORTACAO_CSV','Exportação CSV gerada: 2 registros (Escola: todos, Turma: Todas)','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(2,'2026-10-23T10:50:42-03:00','Sistema / Admin','admin','PARAMETRIZACAO','Atualização das faixas de corte e média geral de aprovação','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(3,'2026-10-27T08:26:48-03:00','Sistema / Admin','admin','PARAMETRIZACAO','Atualização das faixas de corte e média geral de aprovação','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(4,'2026-11-03T13:40:48-03:00','Usuário Conectado','admin','EXPORTACAO_CSV','Exportação CSV gerada: 2 registros (Escola: todos, Turma: todos)','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(5,'2026-11-03T14:29:03-03:00','Pablo Souza','admin','LOGIN','Login realizado na plataforma pelo usuário Pablo Souza (pablorobertolima@gmail.com)','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(6,'2026-11-03T16:06:35-03:00','Pablo Souza','admin','LOGIN','Login realizado na plataforma pelo usuário Pablo Souza (pablorobertolima@gmail.com)','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(7,'2026-11-03T16:23:48-03:00','Pablo Souza','admin','LOGIN','Login realizado na plataforma pelo usuário Pablo Souza (pablorobertolima@gmail.com)','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(8,'2026-11-04T08:14:59-03:00','WAF / Firewall','sistema','BLOQUEIO_SCANNER','Scanner bloqueado: UA=sqlmap/1.7','127.0.0.1','');
INSERT INTO "auditoria_lgpd" VALUES(9,'2026-11-04T08:40:32-03:00','WAF / CSRF','sistema','BLOQUEIO_CSRF','Requisição bloqueada por proteção CSRF: Origem externa não autorizada.','127.0.0.1','21e64dc94dd8be826c342f48ce5913921e71b74c787ae688e7f6b4a7d467e664');
INSERT INTO "auditoria_lgpd" VALUES(10,'2026-11-04T08:53:26-03:00','Pablo Souza','admin','LOGIN','Login autenticado com token criptográfico por Pablo Souza (pablorobertolima@gmail.com)','127.0.0.1','bad8c8a7b43cf35993621beac7de630b12869253ba141a238718eb9e84d4d4a4');
INSERT INTO "auditoria_lgpd" VALUES(11,'2026-11-04T09:09:59-03:00','Pablo Souza','admin','LOGIN','Login autenticado com token criptográfico por Pablo Souza (pablorobertolima@gmail.com)','127.0.0.1','975c7dac65abb0a2b89e37a5becb8dad5bbbe40a4575dc12af86d38072493ea3');
INSERT INTO "auditoria_lgpd" VALUES(12,'2026-11-04T10:22:51-03:00','Pablo Souza','admin','LOGIN','Login autenticado com token criptográfico por Pablo Souza (pablorobertolima@gmail.com)','127.0.0.1','eba7d57a0ecfd3bcb69c08d77d946b1579137d9c1fe486df5bf4be0749eef666');
CREATE TABLE avaliacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        titulo TEXT NOT NULL,
        componente TEXT NOT NULL,
        ano_escolar TEXT NOT NULL,
        tipo TEXT NOT NULL,
        periodo_inicio TEXT NOT NULL,
        periodo_fim TEXT NOT NULL,
        total_itens INTEGER DEFAULT 20,
        total_inscritos INTEGER DEFAULT 0,
        total_avaliados INTEGER DEFAULT 0,
        taxa_participacao TEXT DEFAULT '0%',
        proficiencia_media REAL DEFAULT 0.0,
        status TEXT DEFAULT 'Agendada'
    );
CREATE TABLE cargos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_cargo TEXT NOT NULL,
        cargo TEXT NOT NULL,
        departamento TEXT DEFAULT 'Secretaria Municipal de Educação',
        data_atribuicao TEXT DEFAULT '2026-02-01'
    );
INSERT INTO "cargos" VALUES(1,'CARG-001','Coordenador Técnico','Secretaria Municipal de Educação','2026-02-01');
INSERT INTO "cargos" VALUES(2,'CARG-002','Coordenador Pedagógico','Secretaria Municipal de Educação','2026-02-01');
INSERT INTO "cargos" VALUES(3,'CARG-003','Professor Titular','Rede Municipal de Ensino','2026-02-01');
INSERT INTO "cargos" VALUES(4,'CARG-004','Diretor Escolar','Unidades Escolares','2026-02-01');
INSERT INTO "cargos" VALUES(5,'CARG-005','Secretário Escolar','Unidades Escolares','2026-02-01');
INSERT INTO "cargos" VALUES(6,'CARG-006','Supervisor SME','Secretaria Municipal de Educação','2026-02-01');
INSERT INTO "cargos" VALUES(7,'CARG-007','Nutricionista SME','Secretaria Municipal de Educação','2026-02-01');
INSERT INTO "cargos" VALUES(8,'CARG-008','Psicopedagogo','Secretaria Municipal de Educação','2026-02-01');
INSERT INTO "cargos" VALUES(9,'CARG-009','Orientador Educacional','Unidades Escolares','2026-02-01');
INSERT INTO "cargos" VALUES(10,'CARG-010','Apoio Administrativo','Secretaria Municipal de Educação','2026-02-01');
CREATE TABLE configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
    );
INSERT INTO "configuracoes" VALUES('parametrizacao_media_nivel','{"media_geral_aprovacao": 7.0, "nota_min_avancado": 8.0, "nota_max_avancado": 10.0, "nota_min_adequado": 7.0, "nota_max_adequado": 7.9, "nota_min_basico": 6.0, "nota_max_basico": 6.9, "nota_min_abaixo": 0.0, "nota_max_abaixo": 5.9}');
INSERT INTO "configuracoes" VALUES('seguranca','{"autenticacao_2fa": true, "politica_senhas_fortes": true, "tempo_sessao_minutos": 60, "bloqueio_tentativas_incorretas": true, "max_tentativas_login": 5, "trilha_auditoria_ativa": true}');
INSERT INTO "configuracoes" VALUES('funcionalidades','{"modulo_dashboard": true, "modulo_avaliacoes": true, "modulo_escolas": true, "modulo_alunos": true, "modulo_bi_relatorios": true, "modulo_cadastros_gerais": true, "modulo_boletins_online": true, "modulo_exportacao_csv": true, "modulo_integracao_seduc": true, "modulo_simulados_saeb": true}');
CREATE TABLE escolas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        endereco TEXT NOT NULL,
        numero TEXT NOT NULL,
        bairro TEXT NOT NULL,
        telefone TEXT NOT NULL,
        codigo_inep TEXT DEFAULT '',
        tipo_unidade TEXT DEFAULT 'Urbana',
        total_turmas INTEGER DEFAULT 0,
        total_alunos INTEGER DEFAULT 0,
        proficiencia_lp REAL DEFAULT 7.9,
        proficiencia_mat REAL DEFAULT 8.2,
        nota_media_lp REAL DEFAULT 7.9,
        nota_media_mat REAL DEFAULT 8.2,
        taxa_participacao TEXT DEFAULT '96.0%',
        status TEXT DEFAULT 'Ativo'
    );
INSERT INTO "escolas" VALUES(2,'001','Escola Municipal Ermindo Mendel','R. BC01','S/N','Universitario','(66) 99985-9642','51000001','Urbana',1,1,269.6,272.9,9.2,9.1,'96.0%','Ativo');
INSERT INTO "escolas" VALUES(3,'003','Escola Municipal Cecília Meireles','Rua  C','173 ','Jardim Tropical','(66) 3468-2111','51060507','Urbana',4,1,267.0,245.8,9.0,7.1,'96.0%','Ativo');
CREATE TABLE matriz_curricular (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_escola TEXT NOT NULL,
        nome_escola TEXT NOT NULL,
        codigo_aluno TEXT NOT NULL,
        codigo_inep TEXT NOT NULL,
        nome TEXT NOT NULL,
        turma TEXT NOT NULL,
        sala TEXT NOT NULL,
        turno TEXT NOT NULL,
        nome_disciplina TEXT NOT NULL,
        carga_horaria TEXT NOT NULL
    );
INSERT INTO "matriz_curricular" VALUES(2,'001','Escola Municipal Ermindo Mendel','','','','1.º Ano','Sala 01','Matutino','Matemática','');
INSERT INTO "matriz_curricular" VALUES(3,'001','Escola Municipal Ermindo Mendel','','','','1.º Ano','Sala 01','Matutino','Língua Portuguesa','');
CREATE TABLE tokens_revogados (
        jti TEXT PRIMARY KEY,
        expira_em INTEGER NOT NULL
    );
CREATE TABLE turmas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_escola TEXT NOT NULL,
        nome_escola TEXT NOT NULL,
        periodo_letivo TEXT NOT NULL,
        modalidade TEXT NOT NULL,
        etapa TEXT NOT NULL,
        turma TEXT NOT NULL,
        turno TEXT NOT NULL,
        total_alunos INTEGER DEFAULT 0,
        sala TEXT NOT NULL
    );
INSERT INTO "turmas" VALUES(2,'001','Escola Municipal Ermindo Mendel','2026 - Anual','Ensino Fundamental Regular','AI (1.º a 5.º) anos','1.º Ano','Matutino',1,'Sala 01');
INSERT INTO "turmas" VALUES(3,'003','Escola Municipal Cecília Meireles','2026 - Anual','Ensino Fundamental Regular','AI (1.º a 5.º) anos','2.ºAno','Matutino',0,'Sala 01');
INSERT INTO "turmas" VALUES(4,'003','Escola Municipal Cecília Meireles','2026 - Anual','Ensino Fundamental Regular','AI (1.º a 5.º) anos','3.ºAno','Matutino',0,'Sala 01');
INSERT INTO "turmas" VALUES(5,'003','Escola Municipal Cecília Meireles','2026 - Anual','Ensino Fundamental Regular','AI (1.º a 5.º) anos','4.ºAno','Matutino',0,'Sala 01');
INSERT INTO "turmas" VALUES(6,'003','Escola Municipal Cecília Meireles','2026 - Anual','Ensino Fundamental Regular','AI (1.º a 5.º) anos','5.ºAno','Matutino',1,'Sala 01');
CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL,
        cargo TEXT NOT NULL,
        endereco TEXT NOT NULL,
        telefone TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT DEFAULT 'Ativo'
    , perfil TEXT DEFAULT 'admin', senha_hash TEXT DEFAULT '', escola_vinculo TEXT DEFAULT '');
INSERT INTO "usuarios" VALUES(1,'0001','Pablo Souza','78855110578','','Centro','5171991788375','pablorobertolima@gmail.com','Ativo','admin','pbkdf2_sha256$600000$a7671200edb21d7e7d376110778b6265$4577b7e785ba81555e9c5204c2436da5e3b6f57e5ca8ee5471c9847d430fb35d','');
CREATE INDEX idx_alunos_escola ON alunos(codigo_escola);
CREATE INDEX idx_alunos_turma ON alunos(turma);
CREATE INDEX idx_alunos_niveis ON alunos(nivel_lp, nivel_mat);
CREATE INDEX idx_turmas_escola ON turmas(codigo_escola);
CREATE INDEX idx_matriz_escola ON matriz_curricular(codigo_escola);
CREATE INDEX idx_matriz_disciplina ON matriz_curricular(nome_disciplina);
CREATE INDEX idx_auditoria_data ON auditoria_lgpd(timestamp);
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('escolas',3);
INSERT INTO "sqlite_sequence" VALUES('turmas',6);
INSERT INTO "sqlite_sequence" VALUES('usuarios',3);
INSERT INTO "sqlite_sequence" VALUES('cargos',10);
INSERT INTO "sqlite_sequence" VALUES('alunos',2);
INSERT INTO "sqlite_sequence" VALUES('matriz_curricular',3);
INSERT INTO "sqlite_sequence" VALUES('avaliacoes',1);
INSERT INTO "sqlite_sequence" VALUES('auditoria_lgpd',12);
COMMIT;
