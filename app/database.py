import os
import re
import hashlib
import sqlite3
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, urlunparse
from typing import List, Optional, Dict, Any

# Fuso Horário Oficial de Brasília - Brasil (BRT / America/Sao_Paulo = UTC-3)
FUSO_BRASILIA = timezone(timedelta(hours=-3))


def obter_timestamp_brasilia() -> str:
    """Retorna data e hora atuais no Horário Oficial de Brasília (ISO 8601 com offset -03:00)."""
    return datetime.now(FUSO_BRASILIA).strftime("%Y-%m-%dT%H:%M:%S-03:00")


def obter_data_brasilia() -> str:
    """Retorna a data atual (YYYY-MM-DD) no Horário Oficial de Brasília."""
    return datetime.now(FUSO_BRASILIA).strftime("%Y-%m-%d")

try:
    import psycopg
except ImportError:
    psycopg = None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")
DB_FILE = os.environ.get("AVALIA_DB_PATH", os.path.join(os.path.dirname(__file__), "avalia_ab.db"))


def carregar_variaveis_env():
    """Carrega variáveis do arquivo .env na raiz do projeto caso exista."""
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k and k not in os.environ:
                        os.environ[k] = v
        except Exception as e:
            print(f"[ENV WARNING] Erro ao ler .env: {e}")


carregar_variaveis_env()


def obter_database_url() -> str:
    """Retorna a URL de conexão PostgreSQL configurada via .env ou variáveis de ambiente."""
    carregar_variaveis_env()
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        # Compatibilidade com provedores cloud que usam postgres:// em vez de postgresql://
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        return url

    pg_user = os.environ.get("POSTGRES_USER", "postgres").strip()
    pg_pass = os.environ.get("POSTGRES_PASSWORD", "postgres").strip()
    pg_host = os.environ.get("POSTGRES_HOST", "127.0.0.1").strip()
    pg_port = os.environ.get("POSTGRES_PORT", "5432").strip()
    pg_db = os.environ.get("POSTGRES_DB", "avalia_ab").strip()
    return f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"


class PostgresRow:
    """
    Objeto de linha híbrido 100% compatível com sqlite3.Row:
    - Permite acesso por chave: row['id'], row.get('id'), dict(row)
    - Permite acesso por índice e desempacotamento: row[0], a, b = row
    - Permite dict(cursor.fetchall()) em consultas GROUP BY de 2 colunas
    """
    def __init__(self, columns: List[str], values: tuple):
        self._columns = list(columns)
        self._values = tuple(values)
        self._map = dict(zip(self._columns, self._values))

    def keys(self):
        return self._columns

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return self._map[key]

    def get(self, key, default=None):
        return self._map.get(key, default)

    def __iter__(self):
        return iter(self._values)

    def __len__(self):
        return len(self._values)

    def __contains__(self, item):
        return item in self._map

    def __repr__(self):
        return f"PostgresRow({self._map!r})"


TABELAS_COM_ID_SERIAL = {
    "usuarios",
    "escolas",
    "alunos",
    "cargos",
    "turmas",
    "matriz_curricular",
    "avaliacoes",
    "auditoria_lgpd",
}


class PostgresCursorWrapper:
    """Adapta consultas SQL padrão para sintaxe nativa do PostgreSQL (psycopg)."""
    def __init__(self, raw_cursor):
        self._cursor = raw_cursor
        self.lastrowid = None

    def _traduzir_sql(self, sql: str) -> tuple[str, bool]:
        s = sql.strip()

        # Ignora PRAGMAs específicos do SQLite
        if s.upper().startswith("PRAGMA"):
            return "SELECT 1", False

        # Converte INSERT OR REPLACE INTO configuracoes
        if re.match(r"^INSERT\s+OR\s+REPLACE\s+INTO\s+configuracoes", s, flags=re.IGNORECASE):
            s = re.sub(
                r"^INSERT\s+OR\s+REPLACE\s+INTO\s+configuracoes\s*\(\s*chave\s*,\s*valor\s*\)\s*VALUES\s*\(\s*\?\s*,\s*\?\s*\)",
                "INSERT INTO configuracoes (chave, valor) VALUES (%s, %s) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor",
                s,
                flags=re.IGNORECASE,
            )

        # Converte AUTOINCREMENT do SQLite caso executado em DDL genérico
        s = re.sub(
            r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
            "SERIAL PRIMARY KEY",
            s,
            flags=re.IGNORECASE,
        )

        # Substitui placeholders '?' por '%s'
        s = s.replace("?", "%s")

        # Verifica se é um INSERT em tabela com coluna 'id' para capturar lastrowid via RETURNING id
        precisa_returning_id = False
        m_ins = re.match(r"^INSERT\s+INTO\s+([a-zA-Z0-9_]+)", s, flags=re.IGNORECASE)
        if m_ins:
            nome_tabela = m_ins.group(1).lower()
            if nome_tabela in TABELAS_COM_ID_SERIAL and "RETURNING" not in s.upper():
                s = s.rstrip().rstrip(";") + " RETURNING id"
                precisa_returning_id = True

        return s, precisa_returning_id

    def execute(self, sql: str, params: Optional[Any] = None):
        pg_sql, precisa_returning_id = self._traduzir_sql(sql)
        if params is not None:
            self._cursor.execute(pg_sql, tuple(params))
        else:
            self._cursor.execute(pg_sql)

        if precisa_returning_id:
            row = self._cursor.fetchone()
            self.lastrowid = row[0] if row else None
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        cols = [desc[0] for desc in self._cursor.description] if self._cursor.description else []
        return PostgresRow(cols, row)

    def fetchall(self):
        rows = self._cursor.fetchall()
        if not rows:
            return []
        cols = [desc[0] for desc in self._cursor.description] if self._cursor.description else []
        return [PostgresRow(cols, r) for r in rows]

    def close(self):
        self._cursor.close()


class PostgresConnectionWrapper:
    """Encapsula a conexão PostgreSQL mantendo a mesma interface usada pelos endpoints."""
    def __init__(self, raw_conn):
        self._conn = raw_conn
        self.engine = "postgresql"

    def cursor(self):
        return PostgresCursorWrapper(self._conn.cursor())

    def execute(self, sql: str, params: Optional[Any] = None):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


# Controle de estado do motor ativo
STATUS_BANCO_ATUAL = {
    "engine": "PostgreSQL",
    "conectado_postgres": False,
    "detalhe": "Aguardando inicialização",
}


def garantir_banco_postgres_criado(db_url: str):
    """Cria automaticamente o banco de dados no servidor PostgreSQL caso ainda não exista."""
    if psycopg is None:
        return
    parsed = urlparse(db_url)
    target_db = (parsed.path or "").lstrip("/") or "avalia_ab"
    if not re.match(r"^[a-zA-Z0-9_]{1,63}$", target_db):
        raise ValueError("Nome do banco de dados PostgreSQL inválido por política de segurança.")
    admin_url = urlunparse((parsed.scheme, parsed.netloc, "/postgres", "", "", ""))
    try:
        with psycopg.connect(admin_url, autocommit=True, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
                if not cur.fetchone():
                    cur.execute(f'CREATE DATABASE "{target_db}" ENCODING \'UTF8\'')
                    print(f"[POSTGRESQL] Banco de dados '{target_db}' criado automaticamente!")
    except Exception:
        # Em provedores cloud (Render/Neon/Supabase) o banco já vem criado e o usuário pode não ter acesso ao DB 'postgres'
        pass


def get_db_connection():
    """
    Retorna conexão ativa com o PostgreSQL (padrão principal da plataforma).
    Caso a credencial local do PostgreSQL no .env ainda precise ser ajustada,
    mantém fallback seguro para não derrubar a aplicação.
    """
    db_url = obter_database_url()
    pg_options = "-c timezone=America/Sao_Paulo -c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=30000"
    if psycopg is not None:
        try:
            raw_conn = psycopg.connect(db_url, connect_timeout=3, options=pg_options)
            STATUS_BANCO_ATUAL["engine"] = "PostgreSQL"
            STATUS_BANCO_ATUAL["conectado_postgres"] = True
            STATUS_BANCO_ATUAL["detalhe"] = "PostgreSQL Ativo"
            return PostgresConnectionWrapper(raw_conn)
        except Exception as e:
            msg_erro = str(e).splitlines()[0] if str(e) else "Erro de conexão"
            # Tenta criar o banco caso o erro seja 'database "avalia_ab" does not exist'
            if "does not exist" in msg_erro:
                garantir_banco_postgres_criado(db_url)
                try:
                    raw_conn = psycopg.connect(db_url, connect_timeout=3, options=pg_options)
                    STATUS_BANCO_ATUAL["engine"] = "PostgreSQL"
                    STATUS_BANCO_ATUAL["conectado_postgres"] = True
                    STATUS_BANCO_ATUAL["detalhe"] = "PostgreSQL Ativo"
                    return PostgresConnectionWrapper(raw_conn)
                except Exception as e2:
                    msg_erro = str(e2).splitlines()[0]

            STATUS_BANCO_ATUAL["conectado_postgres"] = False
            STATUS_BANCO_ATUAL["detalhe"] = f"PostgreSQL pendente de credencial no .env ({msg_erro})"

    # Fallback de contingência local enquanto o usuário configura a senha do PostgreSQL no .env
    conn = sqlite3.connect(DB_FILE, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def migrar_dados_sqlite_para_postgres_se_necessario(pg_conn: PostgresConnectionWrapper):
    """Copia automaticamente os registros existentes do SQLite para o PostgreSQL na primeira conexão."""
    if not os.path.exists(DB_FILE):
        return

    try:
        pg_cur = pg_conn.cursor()
        pg_cur.execute("SELECT COUNT(*) FROM usuarios")
        qtd_usuarios_pg = pg_cur.fetchone()[0] or 0
        pg_cur.execute("SELECT COUNT(*) FROM escolas")
        qtd_escolas_pg = pg_cur.fetchone()[0] or 0

        if qtd_usuarios_pg > 0 or qtd_escolas_pg > 0:
            return

        sq_conn = sqlite3.connect(DB_FILE)
        sq_conn.row_factory = sqlite3.Row
        sq_cur = sq_conn.cursor()

        tabelas_migracao = [
            "usuarios",
            "escolas",
            "alunos",
            "cargos",
            "turmas",
            "matriz_curricular",
            "avaliacoes",
            "configuracoes",
            "auditoria_lgpd",
        ]

        for tabela in tabelas_migracao:
            try:
                sq_cur.execute(f"SELECT * FROM {tabela}")
                rows = sq_cur.fetchall()
                if not rows:
                    continue
                colunas = rows[0].keys()
                cols_str = ", ".join(colunas)
                placeholders = ", ".join(["%s"] * len(colunas))
                for r in rows:
                    valores = tuple(r[c] for c in colunas)
                    pg_cur._cursor.execute(
                        f"INSERT INTO {tabela} ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                        valores,
                    )
                if tabela in TABELAS_COM_ID_SERIAL:
                    pg_cur._cursor.execute(
                        f"SELECT setval(pg_get_serial_sequence('{tabela}', 'id'), COALESCE((SELECT MAX(id) FROM {tabela}), 1), true)"
                    )
            except Exception as err_tab:
                print(f"[MIGRAÇÃO POSTGRES] Aviso na tabela {tabela}: {err_tab}")

        pg_conn.commit()
        sq_conn.close()
        print("[POSTGRESQL] Migração automática de dados do SQLite para PostgreSQL concluída com sucesso!")
    except Exception as e:
        print(f"[MIGRAÇÃO POSTGRES ERROR] {e}")


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    is_pg = getattr(conn, "engine", "") == "postgresql"
    pk_type = "SERIAL PRIMARY KEY" if is_pg else "INTEGER PRIMARY KEY AUTOINCREMENT"
    real_type = "DOUBLE PRECISION" if is_pg else "REAL"

    # 1. Usuários com suporte a perfis (RBAC) e senha hash segura
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS usuarios (
        id {pk_type},
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
    """)

    # 2. Escolas
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS escolas (
        id {pk_type},
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
        proficiencia_lp {real_type} DEFAULT 7.9,
        proficiencia_mat {real_type} DEFAULT 8.2,
        nota_media_lp {real_type} DEFAULT 7.9,
        nota_media_mat {real_type} DEFAULT 8.2,
        taxa_participacao TEXT DEFAULT '96.0%',
        status TEXT DEFAULT 'Ativo'
    );
    """)

    # 3. Alunos
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS alunos (
        id {pk_type},
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
        nota_lp {real_type} DEFAULT 0.0,
        nota_mat {real_type} DEFAULT 0.0,
        nota_ciencias {real_type} DEFAULT 0.0,
        frequencia TEXT DEFAULT '100%',
        nivel_lp TEXT DEFAULT 'Adequado',
        nivel_mat TEXT DEFAULT 'Adequado',
        proficiencia_lp {real_type} DEFAULT 150.0,
        proficiencia_mat {real_type} DEFAULT 150.0,
        situacao TEXT DEFAULT 'Ativo',
        habilidades_dominadas_json TEXT DEFAULT '',
        habilidades_desenvolvimento_json TEXT DEFAULT '',
        habilidades_intervencao_json TEXT DEFAULT '',
        parecer_pedagogico TEXT DEFAULT ''
    );
    """)

    # 4. Cargos
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS cargos (
        id {pk_type},
        codigo_cargo TEXT NOT NULL,
        cargo TEXT NOT NULL,
        departamento TEXT DEFAULT 'Secretaria Municipal de Educação',
        data_atribuicao TEXT DEFAULT '2026-02-01'
    );
    """)

    # 5. Turmas
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS turmas (
        id {pk_type},
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
    """)

    # 6. Matriz Curricular
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS matriz_curricular (
        id {pk_type},
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
    """)

    # 7. Avaliações
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS avaliacoes (
        id {pk_type},
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
        proficiencia_media {real_type} DEFAULT 0.0,
        status TEXT DEFAULT 'Agendada'
    );
    """)

    # 8. Configurações
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
    );
    """)

    # 9. Trilha de Auditoria e Conformidade LGPD (Art. 6º, VII e Art. 46) com Hash de Integridade Encadeado
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS auditoria_lgpd (
        id {pk_type},
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario TEXT NOT NULL,
        perfil TEXT NOT NULL,
        acao TEXT NOT NULL,
        detalhes TEXT NOT NULL,
        ip_origem TEXT DEFAULT '127.0.0.1',
        hash_integridade TEXT DEFAULT ''
    );
    """)

    # 10. Lista Persistente de Tokens Revogados (Logout / Revogação de Sessão)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tokens_revogados (
        jti TEXT PRIMARY KEY,
        expira_em INTEGER NOT NULL
    );
    """)

    # Índices de Alto Desempenho
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alunos_escola ON alunos(codigo_escola);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alunos_niveis ON alunos(nivel_lp, nivel_mat);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_turmas_escola ON turmas(codigo_escola);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_matriz_escola ON matriz_curricular(codigo_escola);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_matriz_disciplina ON matriz_curricular(nome_disciplina);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria_lgpd(timestamp);")

    conn.commit()

    try:
        cursor.execute("ALTER TABLE auditoria_lgpd ADD COLUMN hash_integridade TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass

    if is_pg:
        migrar_dados_sqlite_para_postgres_se_necessario(conn)

    # Normaliza registros antigos da auditoria que estavam em UTC puro (sem offset -03:00) para o Horário Oficial de Brasília
    try:
        cursor.execute("SELECT id, timestamp FROM auditoria_lgpd")
        for r in cursor.fetchall():
            ts_val = str(r["timestamp"] or "").strip()
            if len(ts_val) == 19 and " " in ts_val and "-" in ts_val and not ts_val.endswith("-03:00"):
                dt_utc = datetime.strptime(ts_val, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                dt_brt = dt_utc.astimezone(FUSO_BRASILIA).strftime("%Y-%m-%dT%H:%M:%S-03:00")
                cursor.execute("UPDATE auditoria_lgpd SET timestamp = ? WHERE id = ?", (dt_brt, r["id"]))
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass

    conn.close()


def registrar_log_auditoria(usuario: str, perfil: str, acao: str, detalhes: str, ip_origem: str = "127.0.0.1"):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ts_brasilia = obter_timestamp_brasilia()
        hash_anterior = "GENESIS_AVALIA_AB"
        try:
            cursor.execute("SELECT hash_integridade FROM auditoria_lgpd ORDER BY id DESC LIMIT 1")
            ult = cursor.fetchone()
            if ult and ult[0]:
                hash_anterior = str(ult[0])
        except Exception:
            pass
        cadeia = f"{hash_anterior}|{ts_brasilia}|{usuario}|{perfil}|{acao}|{detalhes}|{ip_origem}"
        hash_atual = hashlib.sha256(cadeia.encode("utf-8")).hexdigest()
        cursor.execute("""
            INSERT INTO auditoria_lgpd (timestamp, usuario, perfil, acao, detalhes, ip_origem, hash_integridade)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (ts_brasilia, usuario, perfil, acao, detalhes, ip_origem, hash_atual))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[AUDITORIA LGPD ERROR] Falha ao registrar log: {e}")


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully! Status:", STATUS_BANCO_ATUAL)
