import psycopg
import json
import os

url_direct = "postgresql://postgres:AvaliaAB2026%40Seduc@db.utgyyjwiziekpcvbjjuf.supabase.co:5432/postgres"

dump_json_path = os.path.join(os.path.dirname(__file__), "database_dumps", "backup_banco_completo.json")
with open(dump_json_path, "r", encoding="utf-8") as f:
    dump_data = json.load(f)

tables = dump_data.get("tables", {})

ddl_script = """
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    cargo TEXT NOT NULL,
    perfil TEXT DEFAULT 'admin',
    senha_hash TEXT DEFAULT '',
    endereco TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    escola_vinculo TEXT DEFAULT '',
    status TEXT DEFAULT 'Ativo'
);

CREATE TABLE IF NOT EXISTS escolas (
    id SERIAL PRIMARY KEY,
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
    proficiencia_lp DOUBLE PRECISION DEFAULT 7.9,
    proficiencia_mat DOUBLE PRECISION DEFAULT 8.2,
    nota_media_lp DOUBLE PRECISION DEFAULT 7.9,
    nota_media_mat DOUBLE PRECISION DEFAULT 8.2,
    taxa_participacao TEXT DEFAULT '96.0%',
    status TEXT DEFAULT 'Ativo'
);

CREATE TABLE IF NOT EXISTS alunos (
    id SERIAL PRIMARY KEY,
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
    nota_lp DOUBLE PRECISION DEFAULT 0.0,
    nota_mat DOUBLE PRECISION DEFAULT 0.0,
    nota_ciencias DOUBLE PRECISION DEFAULT 0.0,
    frequencia TEXT DEFAULT '100%',
    nivel_lp TEXT DEFAULT 'Adequado',
    nivel_mat TEXT DEFAULT 'Adequado',
    proficiencia_lp DOUBLE PRECISION DEFAULT 150.0,
    proficiencia_mat DOUBLE PRECISION DEFAULT 150.0,
    situacao TEXT DEFAULT 'Ativo',
    habilidades_dominadas_json TEXT DEFAULT '',
    habilidades_desenvolvimento_json TEXT DEFAULT '',
    habilidades_intervencao_json TEXT DEFAULT '',
    parecer_pedagogico TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cargos (
    id SERIAL PRIMARY KEY,
    codigo_cargo TEXT NOT NULL,
    cargo TEXT NOT NULL,
    departamento TEXT DEFAULT 'Secretaria Municipal de Educação',
    data_atribuicao TEXT DEFAULT '2026-02-01'
);

CREATE TABLE IF NOT EXISTS turmas (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS matriz_curricular (
    id SERIAL PRIMARY KEY,
    codigo_escola TEXT NOT NULL,
    nome_escola TEXT NOT NULL,
    codigo_aluno TEXT NOT NULL,
    codigo_inep TEXT NOT NULL,
    turma TEXT NOT NULL,
    sala TEXT NOT NULL,
    turno TEXT NOT NULL,
    nome_disciplina TEXT NOT NULL,
    nome TEXT DEFAULT '',
    carga_horaria TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
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
    proficiencia_media DOUBLE PRECISION DEFAULT 0.0,
    status TEXT DEFAULT 'Agendada'
);

CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auditoria_lgpd (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    usuario TEXT NOT NULL,
    perfil TEXT NOT NULL,
    acao TEXT NOT NULL,
    detalhes TEXT NOT NULL,
    ip_origem TEXT DEFAULT '127.0.0.1',
    hash_integridade TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tokens_revogados (
    jti TEXT PRIMARY KEY,
    expira_em BIGINT NOT NULL
);
"""

print("[1/3] Conectando ao Supabase para criar tabelas...")
with psycopg.connect(url_direct, autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute(ddl_script)
        print("Tabelas criadas com sucesso!")

        # 2. Migrando dados
        print("[2/3] Populando dados reais de Água Boa...")

        # usuarios
        for u in tables.get("usuarios", []):
            cur.execute("""
                INSERT INTO usuarios (id, codigo, nome, cpf, cargo, perfil, senha_hash, endereco, telefone, email, escola_vinculo, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (codigo) DO NOTHING;
            """, (u["id"], u["codigo"], u["nome"], u["cpf"], u["cargo"], u.get("perfil", "admin"), u.get("senha_hash", ""), u["endereco"], u["telefone"], u["email"], u.get("escola_vinculo", ""), u.get("status", "Ativo")))

        # escolas
        for e in tables.get("escolas", []):
            cur.execute("""
                INSERT INTO escolas (id, codigo, nome, endereco, numero, bairro, telefone, codigo_inep, tipo_unidade, total_turmas, total_alunos, proficiencia_lp, proficiencia_mat, nota_media_lp, nota_media_mat, taxa_participacao, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (codigo) DO NOTHING;
            """, (e["id"], e["codigo"], e["nome"], e["endereco"], e["numero"], e["bairro"], e["telefone"], e.get("codigo_inep", ""), e.get("tipo_unidade", "Urbana"), e.get("total_turmas", 0), e.get("total_alunos", 0), e.get("proficiencia_lp", 7.9), e.get("proficiencia_mat", 8.2), e.get("nota_media_lp", 7.9), e.get("nota_media_mat", 8.2), e.get("taxa_participacao", "96.0%"), e.get("status", "Ativo")))

        # turmas
        for t in tables.get("turmas", []):
            cur.execute("""
                INSERT INTO turmas (id, codigo_escola, nome_escola, periodo_letivo, modalidade, etapa, turma, turno, total_alunos, sala)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (t["id"], t["codigo_escola"], t["nome_escola"], t["periodo_letivo"], t["modalidade"], t["etapa"], t["turma"], t["turno"], t.get("total_alunos", 0), t["sala"]))

        # alunos
        for a in tables.get("alunos", []):
            cur.execute("""
                INSERT INTO alunos (id, codigo_escola, nome_escola, codigo_aluno, codigo_inep, nome, nome_responsavel, endereco, telefone_responsavel, turma, sala, turno, nota_lp, nota_mat, nota_ciencias, frequencia, nivel_lp, nivel_mat, proficiencia_lp, proficiencia_mat, situacao, habilidades_dominadas_json, habilidades_desenvolvimento_json, habilidades_intervencao_json, parecer_pedagogico)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (codigo_aluno) DO NOTHING;
            """, (a["id"], a["codigo_escola"], a["nome_escola"], a["codigo_aluno"], a["codigo_inep"], a["nome"], a["nome_responsavel"], a["endereco"], a["telefone_responsavel"], a["turma"], a["sala"], a["turno"], a.get("nota_lp", 0.0), a.get("nota_mat", 0.0), a.get("nota_ciencias", 0.0), a.get("frequencia", "100%"), a.get("nivel_lp", "Adequado"), a.get("nivel_mat", "Adequado"), a.get("proficiencia_lp", 150.0), a.get("proficiencia_mat", 150.0), a.get("situacao", "Ativo"), a.get("habilidades_dominadas_json", ""), a.get("habilidades_desenvolvimento_json", ""), a.get("habilidades_intervencao_json", ""), a.get("parecer_pedagogico", "")))

        # cargos
        for c in tables.get("cargos", []):
            cur.execute("""
                INSERT INTO cargos (id, codigo_cargo, cargo, departamento, data_atribuicao)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (c["id"], c["codigo_cargo"], c["cargo"], c.get("departamento", "Secretaria Municipal de Educação"), c.get("data_atribuicao", "2026-02-01")))

        # matriz_curricular
        for m in tables.get("matriz_curricular", []):
            cur.execute("""
                INSERT INTO matriz_curricular (id, codigo_escola, nome_escola, codigo_aluno, codigo_inep, turma, sala, turno, nome_disciplina, carga_horaria)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (m["id"], m["codigo_escola"], m["nome_escola"], m.get("codigo_aluno", ""), m.get("codigo_inep", ""), m["turma"], m["sala"], m["turno"], m["nome_disciplina"], m.get("carga_horaria", "")))

        # configuracoes
        for cfg in tables.get("configuracoes", []):
            cur.execute("""
                INSERT INTO configuracoes (chave, valor)
                VALUES (%s, %s)
                ON CONFLICT (chave) DO NOTHING;
            """, (cfg["chave"], cfg["valor"]))

        # auditoria_lgpd
        for aud in tables.get("auditoria_lgpd", []):
            cur.execute("""
                INSERT INTO auditoria_lgpd (id, timestamp, usuario, perfil, acao, detalhes, ip_origem, hash_integridade)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (aud["id"], aud["timestamp"], aud["usuario"], aud["perfil"], aud["acao"], aud["detalhes"], aud.get("ip_origem", "127.0.0.1"), aud.get("hash_integridade", "")))

        # Atualizar sequências SERIAL do Postgres
        for seq_table in ['usuarios', 'escolas', 'turmas', 'alunos', 'cargos', 'matriz_curricular', 'auditoria_lgpd']:
            cur.execute(f"SELECT setval('{seq_table}_id_seq', COALESCE((SELECT MAX(id) FROM {seq_table}), 1), true);")

print("[3/3] Migração para o Supabase concluída com sucesso total!")

