import os
import json
import sqlite3
import hashlib
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field

from app.database import get_db_connection, init_db, registrar_log_auditoria, STATUS_BANCO_ATUAL
from app.security import (
    COOKIE_SESSION_NAME,
    gerar_hash_senha_segura,
    verificar_senha_segura,
    simular_verificacao_anti_timing,
    validar_forca_senha,
    gerar_token_sessao,
    revogar_token_sessao,
    extrair_sessao_requisicao,
    obter_ip_cliente,
    verificar_bloqueio_login,
    registrar_falha_login,
    limpar_falhas_login,
    verificar_permissao_rbac_rota,
    inspecionar_requisicao_waf,
    sanitizar_dto_entrada,
    sanitizar_celula_csv,
)

# Inicializa o banco de dados PostgreSQL / contingência local
init_db()

app = FastAPI(
    title="AVALIA AB - Plataforma de Avaliação e Monitoramento da Educação",
    description="Sistema de Gestão, Avaliação Diagnóstica, Cadastros, Parametrização e BI Educacional do Município de Água Boa - MT (PostgreSQL & Segurança Reforçada)",
    version="3.0.0"
)

# Compressão HTTP GZIP para respostas > 500 bytes (Redução de até 70% no tráfego de rede)
app.add_middleware(GZipMiddleware, minimum_size=500)

ROTAS_PUBLICAS_API = {
    "/api/v1/health",
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
    "/api/v1/auth/redefinir-senha",
}

# ==========================================
# MIDDLEWARE DE SEGURANÇA, WAF E AUTENTICAÇÃO
# ==========================================
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # 1. Inspeção WAF (Rate Limiting, CSRF, Bloqueio de Scanners de Porta/Vulnerabilidade e Path Traversal)
    bloqueio_waf = inspecionar_requisicao_waf(request)
    if bloqueio_waf is not None:
        return bloqueio_waf

    path = request.url.path
    sessao = None

    # 2. Proteção estrita da documentação OpenAPI/Swagger (/docs, /redoc, /openapi.json) e rotas /api/v1/*
    if path in ("/docs", "/redoc", "/openapi.json"):
        sessao_doc = extrair_sessao_requisicao(request)
        if not sessao_doc or sessao_doc.get("perfil") != "admin":
            return JSONResponse(
                status_code=403,
                content={"detail": "Acesso restrito: A documentação técnica da API exige sessão autenticada de Administrador (SEDUC / TI)."},
            )

    if path.startswith("/api/v1/") and path not in ROTAS_PUBLICAS_API:
        sessao = extrair_sessao_requisicao(request)
        if not sessao:
            return JSONResponse(
                status_code=401,
                content={"detail": "Acesso negado: Sessão não autenticada ou expirada. Faça login na plataforma AVALIA AB."},
            )
        erro_rbac = verificar_permissao_rbac_rota(path, request.method, sessao.get("perfil", ""))
        if erro_rbac:
            registrar_log_auditoria(
                sessao.get("nome", "Usuário"),
                sessao.get("perfil", ""),
                "BLOQUEIO_RBAC",
                f"Tentativa não autorizada em {request.method} {path}",
                ip_origem=obter_ip_cliente(request),
            )
            return JSONResponse(status_code=403, content={"detail": erro_rbac})
        request.state.usuario_sessao = sessao

    response = await call_next(request)

    # Registro automático na Trilha de Auditoria LGPD para mutações autenticadas
    if sessao and request.method.upper() in ("POST", "PUT", "DELETE") and response.status_code < 400:
        registrar_log_auditoria(
            sessao.get("nome", "Usuário"),
            sessao.get("perfil", "admin"),
            f"OPERACAO_{request.method.upper()}",
            f"Execução autorizada em {request.method.upper()} {path}",
            ip_origem=obter_ip_cliente(request),
        )

    # 3. Cabeçalhos de Segurança Máxima (OWASP ASVS v5 / LGPD Art. 46)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), usb=(), payment=(), accelerometer=(), gyroscope=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    return response

# ==========================================
# POLÍTICAS DE PERMISSÕES E PERFIS (RBAC)
# ==========================================
PERMISSOES_PERFIS = {
    "admin": {
        "perfil": "admin",
        "titulo": "Administrador Geral (SEDUC / TI)",
        "pode_cadastrar_escola": True,
        "pode_cadastrar_turma": True,
        "pode_cadastrar_aluno": True,
        "pode_cadastrar_usuario": True,
        "pode_lancar_notas": True,
        "pode_ver_bi": True,
        "pode_ver_configuracoes": True,
        "pode_excluir_registros": True,
        "escola_restrita": None
    },
    "coordenador": {
        "perfil": "coordenador",
        "titulo": "Coordenador Pedagógico Municipal",
        "pode_cadastrar_escola": False,
        "pode_cadastrar_turma": True,
        "pode_cadastrar_aluno": True,
        "pode_cadastrar_usuario": False,
        "pode_lancar_notas": True,
        "pode_ver_bi": True,
        "pode_ver_configuracoes": False,
        "pode_excluir_registros": False,
        "escola_restrita": None
    },
    "diretor": {
        "perfil": "diretor",
        "titulo": "Diretor / Secretário Escolar",
        "pode_cadastrar_escola": False,
        "pode_cadastrar_turma": True,
        "pode_cadastrar_aluno": True,
        "pode_cadastrar_usuario": False,
        "pode_lancar_notas": True,
        "pode_ver_bi": True,
        "pode_ver_configuracoes": False,
        "pode_excluir_registros": False,
        "escola_restrita": None
    },
    "professor": {
        "perfil": "professor",
        "titulo": "Professor / Docente",
        "pode_cadastrar_escola": False,
        "pode_cadastrar_turma": False,
        "pode_cadastrar_aluno": False,
        "pode_cadastrar_usuario": False,
        "pode_lancar_notas": True,
        "pode_ver_bi": True,
        "pode_ver_configuracoes": False,
        "pode_excluir_registros": False,
        "escola_restrita": None
    }
}

@app.get("/api/v1/auth/perfis")
def listar_politicas_perfis():
    return PERMISSOES_PERFIS

# ==========================================
# MODELOS DE DOMÍNIO (Pydantic DTOs)
# ==========================================

class MetricasMunicipais(BaseModel):
    municipio: str = "Água Boa - MT"
    secretaria: str = "Secretaria Municipal de Educação, Esporte e Cultura"
    ano_letivo: int = 2026
    total_estudantes: int = 0
    total_escolas: int = 0
    total_turmas: int = 0
    taxa_participacao: str = "0.0%"
    proficiencia_media_lp: float = 0.0
    proficiencia_media_mat: float = 0.0
    nota_media_lp: float = 0.0
    nota_media_mat: float = 0.0
    perc_abaixo_basico: float = 0.0
    perc_basico: float = 0.0
    perc_adequado: float = 0.0
    perc_avancado: float = 0.0
    status_sincronizacao: str = "Operacional • Banco de Dados Conectado"

class AvaliacaoEducacional(BaseModel):
    id: int
    codigo: str
    titulo: str
    componente: str
    ano_escolar: str
    tipo: str
    periodo_inicio: str
    periodo_fim: str
    total_itens: int = 20
    total_inscritos: int = 0
    total_avaliados: int = 0
    taxa_participacao: str = "0.0%"
    proficiencia_media: float = 0.0
    status: str = "Agendada"

class NovaAvaliacaoDTO(BaseModel):
    codigo: str
    titulo: str
    componente: str
    ano_escolar: str
    tipo: str
    total_itens: int = 20
    periodo_inicio: str
    periodo_fim: str

# a. Usuários
class Usuario(BaseModel):
    id: int
    codigo: str
    nome: str
    cpf: str
    cargo: Optional[str] = ""
    perfil: str = "admin"  # 'admin', 'coordenador', 'diretor', 'professor'
    endereco: str
    telefone: str
    email: str
    escola_vinculo: Optional[str] = ""
    status: str = "Ativo"

class NovoUsuarioDTO(BaseModel):
    nome: str
    cpf: str
    cargo: Optional[str] = ""
    perfil: Optional[str] = "admin"
    senha: Optional[str] = ""
    endereco: str
    telefone: str
    email: str
    escola_vinculo: Optional[str] = ""

# b. Escola
class EscolaCadastro(BaseModel):
    id: int
    codigo: str
    nome: str
    endereco: str
    numero: str
    bairro: str
    telefone: str
    codigo_inep: Optional[str] = ""
    tipo_unidade: str = "Urbana"
    total_turmas: int = 0
    total_alunos: int = 0
    proficiencia_lp: float = 0.0
    proficiencia_mat: float = 0.0
    nota_media_lp: float = 0.0
    nota_media_mat: float = 0.0
    taxa_participacao: str = "0.0%"
    status: str = "Ativo"

class NovaEscolaCadastroDTO(BaseModel):
    nome: str
    endereco: str
    numero: str
    bairro: str
    telefone: str
    codigo_inep: Optional[str] = ""
    tipo_unidade: Optional[str] = "Urbana"

# c. Aluno
class AlunoCadastro(BaseModel):
    id: int
    codigo_escola: str
    nome_escola: str
    codigo_aluno: str
    codigo_inep: str
    nome: str
    nome_responsavel: str
    endereco: str
    telefone_responsavel: str
    turma: str
    sala: str
    turno: str
    nota_lp: float = 0.0
    nota_mat: float = 0.0
    nota_ciencias: float = 0.0
    frequencia: str = "100%"
    nivel_lp: str = "Adequado"
    nivel_mat: str = "Adequado"
    proficiencia_lp: float = 0.0
    proficiencia_mat: float = 0.0
    situacao: str = "Ativo"

class NovoAlunoCadastroDTO(BaseModel):
    codigo_escola: str
    nome_escola: str
    codigo_inep: str
    nome: str
    nome_responsavel: str
    endereco: str
    telefone_responsavel: str
    turma: str
    sala: str
    turno: str
    nota_lp: Optional[float] = 0.0
    nota_mat: Optional[float] = 0.0
    nota_ciencias: Optional[float] = 0.0

# d. Cargo
class CargoUsuario(BaseModel):
    id: int
    codigo_cargo: str
    cargo: str
    departamento: str = "Secretaria Municipal de Educação"
    data_atribuicao: str = "2026-02-01"

class NovoCargoDTO(BaseModel):
    codigo_cargo: Optional[str] = ""
    cargo: str
    departamento: Optional[str] = "Secretaria Municipal de Educação"

# e. Turma
class TurmaCadastro(BaseModel):
    id: int
    codigo_escola: str
    nome_escola: str
    periodo_letivo: str
    modalidade: str
    etapa: str
    turma: str
    turno: str
    total_alunos: int = 0
    sala: str = "Sala 01"

class NovaTurmaCadastroDTO(BaseModel):
    codigo_escola: str
    nome_escola: str
    periodo_letivo: str
    modalidade: str
    etapa: str
    turma: str
    turno: str
    total_alunos: Optional[int] = 0
    sala: Optional[str] = "Sala 01"

# f. Matriz Curricular
class MatrizCurricular(BaseModel):
    id: int
    codigo_escola: str
    nome_escola: str
    codigo_aluno: Optional[str] = ""
    codigo_inep: Optional[str] = ""
    turma: str
    sala: str
    turno: str
    nome_disciplina: str
    nome: Optional[str] = ""
    carga_horaria: Optional[str] = ""

class NovaMatrizDTO(BaseModel):
    codigo_escola: str
    nome_escola: str
    codigo_aluno: Optional[str] = ""
    codigo_inep: Optional[str] = ""
    turma: str
    sala: str
    turno: str
    nome_disciplina: str
    nome: Optional[str] = ""
    carga_horaria: Optional[str] = ""

# g. Notas e Boletim Diagnóstico Individual
class AtualizarNotaAlunoDTO(BaseModel):
    nota_lp: Optional[float] = None
    nota_mat: Optional[float] = None
    nota_ciencias: Optional[float] = None
    ano_letivo: Optional[str] = "2026"
    observacoes: Optional[str] = None

class ItemHabilidadeBNCC(BaseModel):
    codigo: str
    descricao: str

class AtualizarBoletimAlunoDTO(BaseModel):
    habilidades_dominadas: List[ItemHabilidadeBNCC] = []
    habilidades_em_desenvolvimento: List[ItemHabilidadeBNCC] = []
    habilidades_intervencao: List[ItemHabilidadeBNCC] = []
    parecer_pedagogico: Optional[str] = ""

# Configurações
class ConfiguracoesSeguranca(BaseModel):
    autenticacao_2fa: bool = True
    politica_senhas_fortes: bool = True
    tempo_sessao_minutos: int = 60
    bloqueio_tentativas_incorretas: bool = True
    max_tentativas_login: int = 5
    trilha_auditoria_ativa: bool = True

class FuncionalidadesModulos(BaseModel):
    modulo_dashboard: bool = True
    modulo_avaliacoes: bool = True
    modulo_escolas: bool = True
    modulo_alunos: bool = True
    modulo_bi_relatorios: bool = True
    modulo_cadastros_gerais: bool = True
    modulo_boletins_online: bool = True
    modulo_exportacao_csv: bool = True
    modulo_integracao_seduc: bool = True
    modulo_simulados_saeb: bool = True

class ParametrizacaoExclusao(BaseModel):
    permitir_excluir_usuario: bool = True
    permitir_excluir_escola: bool = True
    permitir_excluir_aluno: bool = True
    permitir_excluir_cargo: bool = True
    permitir_excluir_turma: bool = True
    permitir_excluir_matriz: bool = True
    permitir_excluir_nota_aluno: bool = True

class ParametrizacaoMediaNivel(BaseModel):
    media_geral_aprovacao: float = 6.0
    nota_min_avancado: float = 8.0
    nota_max_avancado: float = 10.0
    nota_min_adequado: float = 7.0
    nota_max_adequado: float = 7.9
    nota_min_basico: float = 6.0
    nota_max_basico: float = 6.9
    nota_min_abaixo: float = 0.0
    nota_max_abaixo: float = 5.9


# ==========================================
# UTILITÁRIOS E RECALCULO DINÂMICO
# ==========================================

def determinar_nivel(nota: float, param: Optional[ParametrizacaoMediaNivel] = None) -> str:
    if param is None:
        param = obter_config_db("parametrizacao_media_nivel", ParametrizacaoMediaNivel())

    if nota >= param.nota_min_avancado:
        return "Avançado"
    elif nota >= param.nota_min_adequado:
        return "Adequado"
    elif nota >= param.nota_min_basico:
        return "Básico"
    else:
        return "Abaixo do Básico"

def recalcular_medias_rede():
    """Recalcula métricas das escolas, níveis dos alunos e municipais diretamente no banco SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    param_niveis = obter_config_db("parametrizacao_media_nivel", ParametrizacaoMediaNivel())

    # Atualiza níveis de todos os alunos com base na parametrização atual
    cursor.execute("SELECT id, nota_lp, nota_mat FROM alunos")
    alunos_lista = cursor.fetchall()
    for a in alunos_lista:
        novo_nivel_lp = determinar_nivel(a["nota_lp"], param_niveis)
        novo_nivel_mat = determinar_nivel(a["nota_mat"], param_niveis)
        cursor.execute("UPDATE alunos SET nivel_lp = ?, nivel_mat = ? WHERE id = ?", (novo_nivel_lp, novo_nivel_mat, a["id"]))

    # Atualiza total de alunos vinculados a cada turma com base nos estudantes cadastrados
    cursor.execute("SELECT id, codigo_escola, nome_escola, turma FROM turmas")
    turmas_lista = cursor.fetchall()
    for t in turmas_lista:
        t_id = t["id"]
        t_cod_esc = t["codigo_escola"]
        t_nome_esc = t["nome_escola"]
        t_nome = (t["turma"] or "").strip()
        cursor.execute("""
            SELECT COUNT(*) FROM alunos
            WHERE (codigo_escola = ? OR lower(trim(nome_escola)) = lower(trim(?)))
              AND lower(replace(trim(turma), ' ', '')) = lower(replace(?, ' ', ''))
        """, (t_cod_esc, t_nome_esc, t_nome))
        qtd_alunos_turma = cursor.fetchone()[0] or 0
        cursor.execute("UPDATE turmas SET total_alunos = ? WHERE id = ?", (qtd_alunos_turma, t_id))

    # Busca todas as escolas
    cursor.execute("SELECT id, codigo, nome FROM escolas")
    escolas = cursor.fetchall()

    for esc in escolas:
        esc_id = esc["id"]
        esc_cod = esc["codigo"]
        esc_nome = esc["nome"]

        # Total de turmas cadastradas para esta escola
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_alunos), 0) FROM turmas WHERE codigo_escola = ? OR lower(nome_escola) = lower(?)", (esc_cod, esc_nome))
        turmas_count, turmas_alunos = cursor.fetchone()

        # Total de alunos nominais cadastrados
        cursor.execute("SELECT COUNT(*), AVG(nota_lp), AVG(nota_mat), AVG(proficiencia_lp), AVG(proficiencia_mat) FROM alunos WHERE codigo_escola = ? OR lower(nome_escola) = lower(?)", (esc_cod, esc_nome))
        alunos_count, avg_lp, avg_mat, prof_lp, prof_mat = cursor.fetchone()

        total_alunos_escola = alunos_count

        avg_lp = round(float(avg_lp), 1) if avg_lp is not None else 0.0
        avg_mat = round(float(avg_mat), 1) if avg_mat is not None else 0.0
        prof_lp = round(float(prof_lp), 1) if prof_lp is not None else avg_lp
        prof_mat = round(float(prof_mat), 1) if prof_mat is not None else avg_mat

        cursor.execute("""
            UPDATE escolas 
            SET total_turmas = ?, total_alunos = ?, nota_media_lp = ?, nota_media_mat = ?, proficiencia_lp = ?, proficiencia_mat = ?
            WHERE id = ?
        """, (turmas_count, total_alunos_escola, avg_lp, avg_mat, prof_lp, prof_mat, esc_id))

    conn.commit()
    conn.close()


def obter_config_db(chave: str, default_obj: Any) -> Any:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT valor FROM configuracoes WHERE chave = ?", (chave,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return default_obj.__class__(**json.loads(row["valor"]))
    return default_obj

def salvar_config_db(chave: str, obj: BaseModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", (chave, json.dumps(obj.dict())))
    conn.commit()
    conn.close()


# ==========================================
# ENDPOINTS RESTful
# ==========================================

@app.get("/api/v1/health")
def healthcheck():
    return {
        "status": "online",
        "platform": "AVALIA AB",
        "database": "PostgreSQL",
        "database_status": STATUS_BANCO_ATUAL,
        "city": "Água Boa - MT",
        "version": "3.0.0"
    }

# --- PAINEL GERAL (DASHBOARD) ---
@app.get("/api/v1/metricas", response_model=MetricasMunicipais)
def obter_metricas():
    recalcular_medias_rede()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_alunos), 0), COALESCE(SUM(total_turmas), 0) FROM escolas")
    total_escolas, total_alunos_escolas, total_turmas_escolas = cursor.fetchone()

    cursor.execute("SELECT COUNT(*), AVG(nota_lp), AVG(nota_mat) FROM alunos")
    total_alunos, avg_lp, avg_mat = cursor.fetchone()

    # Distribuição de níveis
    cursor.execute("SELECT nivel_lp, COUNT(*) FROM alunos GROUP BY nivel_lp")
    niveis_dict = dict(cursor.fetchall())
    total_niveis = sum(niveis_dict.values()) if niveis_dict else 0

    p_abaixo = round((niveis_dict.get("Abaixo do Básico", 0) / total_niveis) * 100, 1) if total_niveis > 0 else 0.0
    p_basico = round((niveis_dict.get("Básico", 0) / total_niveis) * 100, 1) if total_niveis > 0 else 0.0
    p_adequado = round((niveis_dict.get("Adequado", 0) / total_niveis) * 100, 1) if total_niveis > 0 else 0.0
    p_avancado = round((niveis_dict.get("Avançado", 0) / total_niveis) * 100, 1) if total_niveis > 0 else 0.0

    # Calcular taxa de participação real da rede
    total_estudantes = total_alunos_escolas if total_alunos_escolas > 0 else total_alunos
    nota_lp = round(float(avg_lp), 1) if avg_lp is not None else 0.0
    nota_mat = round(float(avg_mat), 1) if avg_mat is not None else 0.0

    taxa_part_str = "0.0%"
    if total_estudantes > 0:
        cursor.execute("SELECT COALESCE(SUM(total_inscritos), 0), COALESCE(SUM(total_avaliados), 0) FROM avaliacoes")
        row_av = cursor.fetchone()
        tot_inscritos, tot_avaliados = (row_av[0] or 0), (row_av[1] or 0)
        if tot_inscritos > 0:
            taxa_calc = (tot_avaliados / tot_inscritos) * 100.0
            taxa_part_str = f"{min(100.0, round(taxa_calc, 1)):.1f}%"
        else:
            taxa_part_str = "0.0%"

    conn.close()

    return MetricasMunicipais(
        total_estudantes=total_estudantes,
        total_escolas=total_escolas,
        total_turmas=total_turmas_escolas,
        taxa_participacao=taxa_part_str,
        nota_media_lp=nota_lp,
        nota_media_mat=nota_mat,
        proficiencia_media_lp=nota_lp,
        proficiencia_media_mat=nota_mat,
        perc_abaixo_basico=p_abaixo,
        perc_basico=p_basico,
        perc_adequado=p_adequado,
        perc_avancado=p_avancado
    )

@app.get("/api/v1/dashboard/resumo")
def obter_resumo_dashboard():
    metricas = obter_metricas()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM avaliacoes ORDER BY id DESC LIMIT 4")
    avaliacoes = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM escolas ORDER BY (proficiencia_lp + proficiencia_mat)/2 DESC LIMIT 5")
    top_escolas = [dict(r) for r in cursor.fetchall()]

    conn.close()

    alertas = []
    if metricas.total_escolas == 0:
        alertas.append({
            "tipo": "atencao",
            "titulo": "Banco de Dados Inicializado",
            "descricao": "Nenhuma escola cadastrada ainda. Utilize o Módulo de Cadastros para iniciar a estrutura da rede.",
            "acao": "Cadastrar Primeira Escola"
        })
    else:
        alertas.append({
            "tipo": "sucesso",
            "titulo": "Base Municipal de Água Boa Operacional",
            "descricao": f"Rede com {metricas.total_escolas} escolas e {metricas.total_estudantes} estudantes cadastrados no banco de dados.",
            "acao": "Monitorar Indicadores"
        })

    return {
        "kpis": metricas,
        "avaliacoes_recentes": avaliacoes,
        "top_escolas": top_escolas,
        "alertas_pedagogicos": alertas
    }

# --- AVALIAÇÕES ---
@app.get("/api/v1/avaliacoes", response_model=List[AvaliacaoEducacional])
def listar_avaliacoes(
    componente: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM avaliacoes WHERE 1=1"
    params = []
    if componente and componente != "todos":
        query += " AND lower(componente) = lower(?)"
        params.append(componente)
    if status and status != "todos":
        query += " AND lower(status) = lower(?)"
        params.append(status)
    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/v1/avaliacoes", response_model=AvaliacaoEducacional, status_code=201)
def criar_avaliacao(dados: NovaAvaliacaoDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO avaliacoes (codigo, titulo, componente, ano_escolar, tipo, periodo_inicio, periodo_fim, total_itens, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Agendada')
    """, (dados.codigo.upper(), dados.titulo, dados.componente, dados.ano_escolar, dados.tipo, dados.periodo_inicio, dados.periodo_fim, dados.total_itens))
    novo_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM avaliacoes WHERE id = ?", (novo_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.delete("/api/v1/avaliacoes/{avaliacao_id}")
def excluir_avaliacao(avaliacao_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM avaliacoes WHERE id = ?", (avaliacao_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    cursor.execute("DELETE FROM avaliacoes WHERE id = ?", (avaliacao_id,))
    conn.commit()
    conn.close()
    return {"message": "Avaliação excluída com sucesso."}

# --- CONFIGURAÇÕES ---
@app.get("/api/v1/configuracoes/seguranca", response_model=ConfiguracoesSeguranca)
def obter_configuracoes_seguranca():
    return obter_config_db("seguranca", ConfiguracoesSeguranca())

@app.post("/api/v1/configuracoes/seguranca", response_model=ConfiguracoesSeguranca)
def atualizar_configuracoes_seguranca(dados: ConfiguracoesSeguranca):
    salvar_config_db("seguranca", dados)
    return dados

@app.get("/api/v1/configuracoes/funcionalidades", response_model=FuncionalidadesModulos)
def obter_funcionalidades():
    return obter_config_db("funcionalidades", FuncionalidadesModulos())

@app.post("/api/v1/configuracoes/funcionalidades", response_model=FuncionalidadesModulos)
def atualizar_funcionalidades(dados: FuncionalidadesModulos):
    salvar_config_db("funcionalidades", dados)
    return dados

@app.get("/api/v1/configuracoes/parametrizacao-exclusao", response_model=ParametrizacaoExclusao)
def obter_parametrizacao_exclusao():
    return obter_config_db("parametrizacao_exclusao", ParametrizacaoExclusao())

@app.post("/api/v1/configuracoes/parametrizacao-exclusao", response_model=ParametrizacaoExclusao)
def atualizar_parametrizacao_exclusao(dados: ParametrizacaoExclusao):
    salvar_config_db("parametrizacao_exclusao", dados)
    return dados

@app.get("/api/v1/configuracoes/parametrizacao-media-nivel", response_model=ParametrizacaoMediaNivel)
def obter_parametrizacao_media_nivel():
    return obter_config_db("parametrizacao_media_nivel", ParametrizacaoMediaNivel())

@app.post("/api/v1/configuracoes/parametrizacao-media-nivel", response_model=ParametrizacaoMediaNivel)
def atualizar_parametrizacao_media_nivel(dados: ParametrizacaoMediaNivel):
    salvar_config_db("parametrizacao_media_nivel", dados)
    recalcular_medias_rede()
    registrar_log_auditoria("Sistema / Admin", "admin", "PARAMETRIZACAO", "Atualização das faixas de corte e média geral de aprovação")
    return dados

# --- AUDITORIA LGPD (Art. 6º, VII) ---
@app.get("/api/v1/auditoria/logs")
def listar_logs_auditoria(limite: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM auditoria_lgpd ORDER BY timestamp DESC LIMIT ?", (limite,))
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return logs


# ==========================================
# ENDPOINTS DE CADASTROS (SALVAMENTO EM BANCO)
# ==========================================

# --- AUTENTICAÇÃO CRIPTOGRÁFICA, SESSÃO E TROCA DE USUÁRIO ---
class LoginUsuarioDTO(BaseModel):
    identificador: str
    senha: Optional[str] = ""

@app.get("/api/v1/auth/me")
def obter_usuario_sessao_atual(request: Request):
    sessao = getattr(request.state, "usuario_sessao", None) or extrair_sessao_requisicao(request)
    if not sessao:
        raise HTTPException(status_code=401, detail="Sessão não autenticada.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, codigo, nome, cpf, cargo, perfil, email, escola_vinculo, status FROM usuarios WHERE id = ?", (sessao["uid"],))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Usuário da sessão não encontrado.")
    return dict(row)

@app.post("/api/v1/auth/logout")
def encerrar_sessao_usuario(request: Request, response: Response):
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.lower().startswith("bearer "):
        revogar_token_sessao(auth_header[7:].strip())
    token_cookie = request.cookies.get(COOKIE_SESSION_NAME, "").strip()
    if token_cookie:
        revogar_token_sessao(token_cookie)
    response.delete_cookie(COOKIE_SESSION_NAME, path="/", samesite="strict")
    return {"message": "Sessão encerrada com segurança."}

@app.get("/api/v1/auth/usuarios-disponiveis")
def listar_usuarios_disponiveis_login(request: Request):
    # Protegido pelo middleware: requer sessão autenticada
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, codigo, nome, cargo, perfil, email, escola_vinculo, status, senha_hash FROM usuarios ORDER BY id ASC")
    rows = []
    for r in cursor.fetchall():
        d = dict(r)
        d["tem_senha"] = bool(d.pop("senha_hash", ""))
        rows.append(d)
    conn.close()
    return rows

@app.post("/api/v1/auth/login")
def autenticar_usuario(dados: LoginUsuarioDTO, request: Request, response: Response):
    ident = (dados.identificador or "").strip()
    senha_informada = (dados.senha or "").strip()
    ip_cliente = obter_ip_cliente(request)

    if not ident:
        raise HTTPException(status_code=400, detail="Informe o E-mail, CPF ou Código do usuário.")

    # 1. Verifica bloqueio por força bruta (IP ou Identificador)
    msg_bloqueio = verificar_bloqueio_login(ip_cliente, ident)
    if msg_bloqueio:
        raise HTTPException(status_code=429, detail=msg_bloqueio)

    cfg_seg = obter_config_db("seguranca", ConfiguracoesSeguranca())
    ident_limpo_cpf = "".join(ch for ch in ident if ch.isdigit())

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios ORDER BY id ASC")
    usuarios = [dict(r) for r in cursor.fetchall()]

    usuario_encontrado = None
    for u in usuarios:
        u_cpf_limpo = "".join(ch for ch in (u.get("cpf") or "") if ch.isdigit())
        if (
            ident.lower() == (u.get("email") or "").strip().lower()
            or ident.lower() == (u.get("nome") or "").strip().lower()
            or ident.lower() == (u.get("codigo") or "").strip().lower()
            or (ident_limpo_cpf and len(ident_limpo_cpf) >= 6 and ident_limpo_cpf == u_cpf_limpo)
        ):
            usuario_encontrado = u
            break

    if not usuario_encontrado:
        conn.close()
        simular_verificacao_anti_timing(senha_informada)
        registrar_falha_login(ip_cliente, ident, cfg_seg.max_tentativas_login, cfg_seg.bloqueio_tentativas_incorretas)
        raise HTTPException(status_code=401, detail="Credenciais inválidas. Verifique o usuário e a senha informados.")

    senha_hash_salva = (usuario_encontrado.get("senha_hash") or "").strip()
    if senha_hash_salva:
        if not senha_informada:
            conn.close()
            raise HTTPException(status_code=401, detail="Digite a senha cadastrada para este usuário.")
        valida, precisa_upgrade = verificar_senha_segura(senha_informada, senha_hash_salva)
        if not valida:
            conn.close()
            registrar_falha_login(ip_cliente, ident, cfg_seg.max_tentativas_login, cfg_seg.bloqueio_tentativas_incorretas)
            raise HTTPException(status_code=401, detail="Credenciais inválidas. Verifique o usuário e a senha informados.")
        if precisa_upgrade:
            novo_hash_pbkdf2 = gerar_hash_senha_segura(senha_informada)
            cursor.execute("UPDATE usuarios SET senha_hash = ? WHERE id = ?", (novo_hash_pbkdf2, usuario_encontrado["id"]))
            conn.commit()
    conn.close()

    limpar_falhas_login(ip_cliente, ident)
    duracao_min = max(15, int(cfg_seg.tempo_sessao_minutos or 60))
    token = gerar_token_sessao(usuario_encontrado, duracao_minutos=duracao_min, request=request)

    response.set_cookie(
        key=COOKIE_SESSION_NAME,
        value=token,
        max_age=duracao_min * 60,
        httponly=True,
        samesite="strict",
        path="/",
    )

    registrar_log_auditoria(
        usuario_encontrado.get("nome", "Usuário"),
        usuario_encontrado.get("perfil", "admin"),
        "LOGIN",
        f"Login autenticado com token criptográfico por {usuario_encontrado.get('nome')} ({usuario_encontrado.get('email')})",
        ip_origem=ip_cliente,
    )

    return {
        "id": usuario_encontrado["id"],
        "codigo": usuario_encontrado["codigo"],
        "nome": usuario_encontrado["nome"],
        "cpf": usuario_encontrado["cpf"],
        "cargo": usuario_encontrado.get("cargo") or "",
        "perfil": usuario_encontrado.get("perfil") or "admin",
        "email": usuario_encontrado.get("email") or "",
        "escola_vinculo": usuario_encontrado.get("escola_vinculo") or "",
        "status": usuario_encontrado.get("status") or "Ativo",
        "token": token,
    }

class RedefinirSenhaDTO(BaseModel):
    identificador: str
    senha_atual: Optional[str] = ""
    nova_senha: str

@app.post("/api/v1/auth/redefinir-senha")
def redefinir_senha_usuario(dados: RedefinirSenhaDTO, request: Request):
    ident = (dados.identificador or "").strip()
    senha_atual = (dados.senha_atual or "").strip()
    nova_senha = (dados.nova_senha or "").strip()
    ip_cliente = obter_ip_cliente(request)

    if not ident or not nova_senha:
        raise HTTPException(status_code=400, detail="Informe o usuário e a nova senha.")

    cfg_seg = obter_config_db("seguranca", ConfiguracoesSeguranca())
    erro_forca = validar_forca_senha(nova_senha, exigir_forte=cfg_seg.politica_senhas_fortes)
    if erro_forca:
        raise HTTPException(status_code=400, detail=erro_forca)

    sessao_ativa = extrair_sessao_requisicao(request)
    is_admin_autenticado = bool(sessao_ativa and sessao_ativa.get("perfil") == "admin")

    ident_limpo_cpf = "".join(ch for ch in ident if ch.isdigit())
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios ORDER BY id ASC")
    usuarios = [dict(r) for r in cursor.fetchall()]

    usuario_encontrado = None
    for u in usuarios:
        u_cpf_limpo = "".join(ch for ch in (u.get("cpf") or "") if ch.isdigit())
        if (
            ident.lower() == (u.get("email") or "").strip().lower()
            or ident.lower() == (u.get("nome") or "").strip().lower()
            or ident.lower() == (u.get("codigo") or "").strip().lower()
            or (ident_limpo_cpf and len(ident_limpo_cpf) >= 6 and ident_limpo_cpf == u_cpf_limpo)
        ):
            usuario_encontrado = u
            break

    if not usuario_encontrado:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    senha_hash_salva = (usuario_encontrado.get("senha_hash") or "").strip()
    # Exige validação da senha atual, a menos que o usuário já esteja autenticado como Administrador ou a conta ainda não possua senha
    if senha_hash_salva and not is_admin_autenticado:
        if not senha_atual:
            conn.close()
            raise HTTPException(status_code=401, detail="Por segurança, informe a senha atual para definir uma nova senha (ou solicite a um Administrador).")
        valida, _ = verificar_senha_segura(senha_atual, senha_hash_salva)
        if not valida:
            conn.close()
            registrar_falha_login(ip_cliente, ident, cfg_seg.max_tentativas_login, cfg_seg.bloqueio_tentativas_incorretas)
            raise HTTPException(status_code=401, detail="Senha atual incorreta. Alteração de senha negada.")

    novo_hash = gerar_hash_senha_segura(nova_senha)
    cursor.execute("UPDATE usuarios SET senha_hash = ? WHERE id = ?", (novo_hash, usuario_encontrado["id"]))
    conn.commit()
    conn.close()

    registrar_log_auditoria(
        usuario_encontrado.get("nome", "Usuário"),
        usuario_encontrado.get("perfil", "admin"),
        "REDEFINICAO_SENHA",
        f"Senha atualizada com criptografia PBKDF2-HMAC-SHA256 para {usuario_encontrado.get('nome')}",
        ip_origem=ip_cliente,
    )

    return {"message": f"Senha de {usuario_encontrado['nome']} atualizada com sucesso!"}

# 1. Usuários
@app.get("/api/v1/cadastros/usuarios", response_model=List[Usuario])
def listar_usuarios_cadastrados():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, codigo, nome, cpf, cargo, perfil, endereco, telefone, email, escola_vinculo, status FROM usuarios ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/v1/cadastros/usuarios", response_model=Usuario, status_code=201)
def cadastrar_usuario(dados: NovoUsuarioDTO):
    sanitizar_dto_entrada(dados)
    if dados.senha and dados.senha.strip():
        cfg_seg = obter_config_db("seguranca", ConfiguracoesSeguranca())
        erro_forca = validar_forca_senha(dados.senha, exigir_forte=cfg_seg.politica_senhas_fortes)
        if erro_forca:
            raise HTTPException(status_code=400, detail=erro_forca)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(id) FROM usuarios")
    max_id = cursor.fetchone()[0] or 0
    novo_id = max_id + 1
    codigo_seq = f"{novo_id:04d}"
    perfil = dados.perfil or "admin"
    escola_vinc = dados.escola_vinculo or ""

    cargo = dados.cargo or ""
    senha_hash = ""
    if dados.senha and dados.senha.strip():
        senha_hash = gerar_hash_senha_segura(dados.senha)

    cursor.execute("""
        INSERT INTO usuarios (codigo, nome, cpf, cargo, perfil, senha_hash, endereco, telefone, email, escola_vinculo, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ativo')
    """, (codigo_seq, dados.nome, dados.cpf, cargo, perfil, senha_hash, dados.endereco, dados.telefone, dados.email, escola_vinc))
    inserted_id = cursor.lastrowid

    conn.commit()
    cursor.execute("SELECT id, codigo, nome, cpf, cargo, perfil, endereco, telefone, email, escola_vinculo, status FROM usuarios WHERE id = ?", (inserted_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.put("/api/v1/cadastros/usuarios/{usuario_id}", response_model=Usuario)
def atualizar_usuario(usuario_id: int, dados: NovoUsuarioDTO):
    sanitizar_dto_entrada(dados)
    if dados.senha and dados.senha.strip():
        cfg_seg = obter_config_db("seguranca", ConfiguracoesSeguranca())
        erro_forca = validar_forca_senha(dados.senha, exigir_forte=cfg_seg.politica_senhas_fortes)
        if erro_forca:
            raise HTTPException(status_code=400, detail=erro_forca)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    perfil = dados.perfil or user["perfil"] or "admin"
    escola_vinc = dados.escola_vinculo if dados.escola_vinculo is not None else user["escola_vinculo"]
    cargo = dados.cargo if dados.cargo is not None else (user["cargo"] or "")

    # Se uma nova senha foi preenchida, atualiza o hash PBKDF2-SHA256, senão mantém a existente
    if dados.senha and dados.senha.strip():
        nova_senha_hash = gerar_hash_senha_segura(dados.senha)
        cursor.execute("""
            UPDATE usuarios 
            SET nome = ?, cpf = ?, cargo = ?, perfil = ?, senha_hash = ?, endereco = ?, telefone = ?, email = ?, escola_vinculo = ?
            WHERE id = ?
        """, (dados.nome, dados.cpf, cargo, perfil, nova_senha_hash, dados.endereco, dados.telefone, dados.email, escola_vinc, usuario_id))
    else:
        cursor.execute("""
            UPDATE usuarios 
            SET nome = ?, cpf = ?, cargo = ?, perfil = ?, endereco = ?, telefone = ?, email = ?, escola_vinculo = ?
            WHERE id = ?
        """, (dados.nome, dados.cpf, cargo, perfil, dados.endereco, dados.telefone, dados.email, escola_vinc, usuario_id))

    conn.commit()
    cursor.execute("SELECT id, codigo, nome, cpf, cargo, perfil, endereco, telefone, email, escola_vinculo, status FROM usuarios WHERE id = ?", (usuario_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.delete("/api/v1/cadastros/usuarios/{usuario_id}")
def excluir_usuario(usuario_id: int):
    param = obter_parametrizacao_exclusao()
    if not param.permitir_excluir_usuario:
        raise HTTPException(status_code=403, detail="A exclusão de Usuários está desabilitada na Parametrização de Configurações.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    cursor.execute("DELETE FROM usuarios WHERE id = ?", (usuario_id,))
    conn.commit()
    conn.close()
    return {"message": f"Usuário {user['nome']} excluído com sucesso."}

# 2. Escolas
@app.get("/api/v1/cadastros/escolas", response_model=List[EscolaCadastro])
def listar_escolas_cadastradas():
    recalcular_medias_rede()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM escolas ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/v1/escolas", response_model=List[EscolaCadastro])
def listar_escolas_compat(tipo: Optional[str] = Query(None)):
    recalcular_medias_rede()
    conn = get_db_connection()
    cursor = conn.cursor()
    if tipo and tipo != "todos":
        cursor.execute("SELECT * FROM escolas WHERE lower(tipo_unidade) = lower(?) ORDER BY id ASC", (tipo,))
    else:
        cursor.execute("SELECT * FROM escolas ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/v1/cadastros/escolas", response_model=EscolaCadastro, status_code=201)
def cadastrar_escola(dados: NovaEscolaCadastroDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT codigo FROM escolas")
    codigos_existentes = cursor.fetchall()
    max_num = 0
    for row in codigos_existentes:
        cod_val = row[0] if isinstance(row, (list, tuple)) else row["codigo"]
        try:
            val_int = int(str(cod_val).strip())
            if val_int > max_num:
                max_num = val_int
        except (ValueError, TypeError):
            pass
    
    codigo_seq = f"{(max_num + 1):03d}"
    inep = (dados.codigo_inep or "").strip()
    tipo = dados.tipo_unidade or "Urbana"

    cursor.execute("""
        INSERT INTO escolas (codigo, nome, endereco, numero, bairro, telefone, codigo_inep, tipo_unidade, total_turmas, total_alunos, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'Ativo')
    """, (codigo_seq, dados.nome, dados.endereco, dados.numero, dados.bairro, dados.telefone, inep, tipo))
    inserted_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM escolas WHERE id = ?", (inserted_id,))
    row = dict(cursor.fetchone())
    conn.close()
    recalcular_medias_rede()
    return row

@app.put("/api/v1/cadastros/escolas/{escola_id}", response_model=EscolaCadastro)
def atualizar_escola(escola_id: int, dados: NovaEscolaCadastroDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM escolas WHERE id = ?", (escola_id,))
    esc = cursor.fetchone()
    if not esc:
        conn.close()
        raise HTTPException(status_code=404, detail="Escola não encontrada.")
    
    inep = dados.codigo_inep if dados.codigo_inep else esc["codigo_inep"]
    tipo = dados.tipo_unidade if dados.tipo_unidade else esc["tipo_unidade"]

    cursor.execute("""
        UPDATE escolas 
        SET nome = ?, endereco = ?, numero = ?, bairro = ?, telefone = ?, codigo_inep = ?, tipo_unidade = ?
        WHERE id = ?
    """, (dados.nome, dados.endereco, dados.numero, dados.bairro, dados.telefone, inep, tipo, escola_id))
    conn.commit()

    cursor.execute("SELECT * FROM escolas WHERE id = ?", (escola_id,))
    row = dict(cursor.fetchone())
    conn.close()
    recalcular_medias_rede()
    return row

@app.delete("/api/v1/cadastros/escolas/{escola_id}")
def excluir_escola(escola_id: int):
    param = obter_parametrizacao_exclusao()
    if not param.permitir_excluir_escola:
        raise HTTPException(status_code=403, detail="A exclusão de Escolas está desabilitada na Parametrização de Configurações.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM escolas WHERE id = ?", (escola_id,))
    esc = cursor.fetchone()
    if not esc:
        conn.close()
        raise HTTPException(status_code=404, detail="Escola não encontrada.")
    
    cursor.execute("DELETE FROM escolas WHERE id = ?", (escola_id,))
    conn.commit()
    conn.close()
    recalcular_medias_rede()
    return {"message": f"Escola {esc['nome']} excluída com sucesso."}

# 3. Alunos
@app.get("/api/v1/cadastros/alunos", response_model=List[AlunoCadastro])
def listar_alunos_cadastrados():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alunos ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/v1/alunos", response_model=List[AlunoCadastro])
def listar_alunos_compat(
    escola: Optional[str] = Query(None),
    termo: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM alunos WHERE 1=1"
    params = []
    if escola and escola != "todos":
        query += " AND (lower(nome_escola) = lower(?) OR codigo_escola = ?)"
        params.extend([escola, escola])
    if termo:
        t = f"%{termo.lower()}%"
        query += " AND (lower(nome) LIKE ? OR codigo_aluno LIKE ? OR codigo_inep LIKE ? OR lower(turma) LIKE ?)"
        params.extend([t, t, t, t])
    query += " ORDER BY id ASC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/v1/cadastros/alunos", response_model=AlunoCadastro, status_code=201)
def cadastrar_aluno(dados: NovoAlunoCadastroDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(id) FROM alunos")
    max_id = cursor.fetchone()[0] or 0
    novo_id = max_id + 1
    codigo_seq = f"{novo_id:04d}"

    nota_lp = max(0.0, min(10.0, round(float(dados.nota_lp or 8.0), 1)))
    nota_mat = max(0.0, min(10.0, round(float(dados.nota_mat or 8.0), 1)))
    nota_cie = max(0.0, min(10.0, round(float(dados.nota_ciencias or 8.0), 1)))
    prof_lp = round(150.0 + (nota_lp * 13.0), 1)
    prof_mat = round(150.0 + (nota_mat * 13.5), 1)
    nivel_lp = determinar_nivel(nota_lp)
    nivel_mat = determinar_nivel(nota_mat)

    cursor.execute("""
        INSERT INTO alunos (
            codigo_escola, nome_escola, codigo_aluno, codigo_inep, nome, nome_responsavel,
            endereco, telefone_responsavel, turma, sala, turno,
            nota_lp, nota_mat, nota_ciencias, frequencia, nivel_lp, nivel_mat,
            proficiencia_lp, proficiencia_mat, situacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '100%', ?, ?, ?, ?, 'Ativo')
    """, (
        dados.codigo_escola, dados.nome_escola, codigo_seq, dados.codigo_inep, dados.nome, dados.nome_responsavel,
        dados.endereco, dados.telefone_responsavel, dados.turma, dados.sala, dados.turno,
        nota_lp, nota_mat, nota_cie, nivel_lp, nivel_mat, prof_lp, prof_mat
    ))
    inserted_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM alunos WHERE id = ?", (inserted_id,))
    row = dict(cursor.fetchone())
    conn.close()
    recalcular_medias_rede()
    return row

@app.put("/api/v1/cadastros/alunos/{aluno_id}", response_model=AlunoCadastro)
def atualizar_aluno(aluno_id: int, dados: NovoAlunoCadastroDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    aluno = cursor.fetchone()
    if not aluno:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    
    nota_lp = max(0.0, min(10.0, round(float(dados.nota_lp if dados.nota_lp is not None else aluno['nota_lp']), 1)))
    nota_mat = max(0.0, min(10.0, round(float(dados.nota_mat if dados.nota_mat is not None else aluno['nota_mat']), 1)))
    nota_cie = max(0.0, min(10.0, round(float(dados.nota_ciencias if dados.nota_ciencias is not None else aluno['nota_ciencias']), 1)))
    prof_lp = round(150.0 + (nota_lp * 13.0), 1)
    prof_mat = round(150.0 + (nota_mat * 13.5), 1)
    nivel_lp = determinar_nivel(nota_lp)
    nivel_mat = determinar_nivel(nota_mat)

    cursor.execute("""
        UPDATE alunos 
        SET codigo_escola = ?, nome_escola = ?, codigo_inep = ?, nome = ?, nome_responsavel = ?,
            telefone_responsavel = ?, endereco = ?, turma = ?, sala = ?, turno = ?,
            nota_lp = ?, nota_mat = ?, nota_ciencias = ?, nivel_lp = ?, nivel_mat = ?,
            proficiencia_lp = ?, proficiencia_mat = ?
        WHERE id = ?
    """, (
        dados.codigo_escola, dados.nome_escola, dados.codigo_inep, dados.nome, dados.nome_responsavel,
        dados.telefone_responsavel, dados.endereco, dados.turma, dados.sala, dados.turno,
        nota_lp, nota_mat, nota_cie, nivel_lp, nivel_mat, prof_lp, prof_mat, aluno_id
    ))
    conn.commit()

    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    row = dict(cursor.fetchone())
    conn.close()
    recalcular_medias_rede()
    return row

@app.delete("/api/v1/cadastros/alunos/{aluno_id}")
def excluir_aluno(aluno_id: int):
    param = obter_parametrizacao_exclusao()
    if not param.permitir_excluir_aluno:
        raise HTTPException(status_code=403, detail="A exclusão de Alunos está desabilitada na Parametrização de Configurações.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    aluno = cursor.fetchone()
    if not aluno:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    
    cursor.execute("DELETE FROM alunos WHERE id = ?", (aluno_id,))
    conn.commit()
    conn.close()
    recalcular_medias_rede()
    return {"message": f"Aluno {aluno['nome']} excluído com sucesso."}

@app.delete("/api/v1/cadastros/alunos/{aluno_id}/notas")
def excluir_notas_aluno(aluno_id: int):
    param = obter_parametrizacao_exclusao()
    if not param.permitir_excluir_nota_aluno:
        raise HTTPException(status_code=403, detail="A exclusão/zeramento de Notas está desabilitada na Parametrização de Configurações.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    aluno = cursor.fetchone()
    if not aluno:
        conn.close()
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    
    cursor.execute("""
        UPDATE alunos
        SET nota_lp = 0.0, nota_mat = 0.0, nota_ciencias = 0.0,
            proficiencia_lp = 150.0, proficiencia_mat = 150.0,
            nivel_lp = 'Abaixo do Básico', nivel_mat = 'Abaixo do Básico'
        WHERE id = ?
    """, (aluno_id,))
    conn.commit()
    conn.close()
    recalcular_medias_rede()
    return {"message": f"Notas do estudante {aluno['nome']} foram zeradas com sucesso."}

@app.put("/api/v1/cadastros/alunos/{aluno_id}/notas", response_model=AlunoCadastro)
def atualizar_notas_aluno(aluno_id: int, dados: AtualizarNotaAlunoDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    aluno = cursor.fetchone()
    if not aluno:
        conn.close()
        raise HTTPException(status_code=404, detail="Estudante não encontrado.")

    nota_lp = aluno["nota_lp"]
    nota_mat = aluno["nota_mat"]
    nota_cie = aluno["nota_ciencias"]

    if dados.nota_lp is not None:
        nota_lp = max(0.0, min(10.0, round(float(dados.nota_lp), 1)))
    if dados.nota_mat is not None:
        nota_mat = max(0.0, min(10.0, round(float(dados.nota_mat), 1)))
    if dados.nota_ciencias is not None:
        nota_cie = max(0.0, min(10.0, round(float(dados.nota_ciencias), 1)))

    prof_lp = round(150.0 + (nota_lp * 13.0), 1)
    prof_mat = round(150.0 + (nota_mat * 13.5), 1)
    nivel_lp = determinar_nivel(nota_lp)
    nivel_mat = determinar_nivel(nota_mat)

    cursor.execute("""
        UPDATE alunos
        SET nota_lp = ?, nota_mat = ?, nota_ciencias = ?,
            proficiencia_lp = ?, proficiencia_mat = ?,
            nivel_lp = ?, nivel_mat = ?
        WHERE id = ?
    """, (nota_lp, nota_mat, nota_cie, prof_lp, prof_mat, nivel_lp, nivel_mat, aluno_id))
    if dados.observacoes and dados.observacoes.strip():
        cursor.execute("UPDATE alunos SET parecer_pedagogico = ? WHERE id = ?", (dados.observacoes.strip(), aluno_id))
    conn.commit()

    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    row = dict(cursor.fetchone())
    conn.close()
    recalcular_medias_rede()
    return row

@app.get("/api/v1/alunos/{aluno_id}/boletim")
def obter_boletim_aluno(aluno_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Estudante não encontrado")
    
    aluno = dict(row)

    default_dominadas = [
        {"codigo": "EF05LP01", "descricao": "Identificar a ideia central do texto e inferir sentido de palavras"},
        {"codigo": "EF05MA01", "descricao": "Ler, escrever e ordenar números naturais até a ordem das centenas de milhar"}
    ]
    default_desenvolvimento = [
        {"codigo": "EF05LP04", "descricao": "Diferenciar discurso direto e indireto em narrativas ficcionais"}
    ]
    default_intervencao = [
        {"codigo": "EF05LP15", "descricao": "Distinguir fato de opinião em textos jornalísticos"}
    ]
    default_parecer = (
        "Reforçar atividades de leitura compartilhada com foco em compreensão textual.\n"
        "Utilizar materiais pedagógicos para resolução de problemas matemáticos."
    )

    try:
        hab_dom = json.loads(aluno["habilidades_dominadas_json"]) if aluno.get("habilidades_dominadas_json") else default_dominadas
    except Exception:
        hab_dom = default_dominadas

    try:
        hab_des = json.loads(aluno["habilidades_desenvolvimento_json"]) if aluno.get("habilidades_desenvolvimento_json") else default_desenvolvimento
    except Exception:
        hab_des = default_desenvolvimento

    try:
        hab_int = json.loads(aluno["habilidades_intervencao_json"]) if aluno.get("habilidades_intervencao_json") else default_intervencao
    except Exception:
        hab_int = default_intervencao

    parecer_texto = (aluno.get("parecer_pedagogico") or "").strip() or default_parecer
    recomendacoes_lista = [linha.strip() for linha in parecer_texto.split("\n") if linha.strip()]

    return {
        "estudante": aluno,
        "habilidades_dominadas": hab_dom,
        "habilidades_em_desenvolvimento": hab_des,
        "habilidades_intervencao": hab_int,
        "parecer_pedagogico": parecer_texto,
        "recomendacoes_pedagogicas": recomendacoes_lista
    }

@app.put("/api/v1/alunos/{aluno_id}/boletim")
def atualizar_boletim_aluno(aluno_id: int, dados: AtualizarBoletimAlunoDTO):
    sanitizar_dto_entrada(dados)
    for lista_hab in (dados.habilidades_dominadas, dados.habilidades_em_desenvolvimento, dados.habilidades_intervencao):
        for item_h in lista_hab:
            sanitizar_dto_entrada(item_h)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alunos WHERE id = ?", (aluno_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Estudante não encontrado")

    dom_json = json.dumps([item.dict() for item in dados.habilidades_dominadas], ensure_ascii=False)
    des_json = json.dumps([item.dict() for item in dados.habilidades_em_desenvolvimento], ensure_ascii=False)
    int_json = json.dumps([item.dict() for item in dados.habilidades_intervencao], ensure_ascii=False)
    parecer = (dados.parecer_pedagogico or "").strip()

    cursor.execute("""
        UPDATE alunos
        SET habilidades_dominadas_json = ?,
            habilidades_desenvolvimento_json = ?,
            habilidades_intervencao_json = ?,
            parecer_pedagogico = ?
        WHERE id = ?
    """, (dom_json, des_json, int_json, parecer, aluno_id))
    conn.commit()
    conn.close()

    registrar_log_auditoria(
        "Usuário Conectado",
        "admin",
        "EDICAO_BOLETIM",
        f"Atualização de Habilidades BNCC e Parecer Pedagógico do estudante ID {aluno_id} ({row['nome']})"
    )
    return obter_boletim_aluno(aluno_id)

# 4. Cargos
@app.get("/api/v1/cadastros/cargos", response_model=List[CargoUsuario])
def listar_cargos_cadastrados():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cargos ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/v1/cadastros/cargos", response_model=CargoUsuario, status_code=201)
def cadastrar_cargo(dados: NovoCargoDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()

    # Gerar código automático se não fornecido
    codigo = (dados.codigo_cargo or "").strip()
    if not codigo:
        cursor.execute("SELECT id FROM cargos ORDER BY id DESC LIMIT 1")
        last_row = cursor.fetchone()
        next_num = (last_row["id"] + 1) if last_row else 1
        codigo = f"CARG-{next_num:03d}"

    cursor.execute("""
        INSERT INTO cargos (codigo_cargo, cargo, departamento, data_atribuicao)
        VALUES (?, ?, ?, '2026-02-01')
    """, (codigo, dados.cargo, dados.departamento or "Secretaria Municipal de Educação"))
    inserted_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM cargos WHERE id = ?", (inserted_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.put("/api/v1/cadastros/cargos/{cargo_id}", response_model=CargoUsuario)
def atualizar_cargo(cargo_id: int, dados: NovoCargoDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cargos WHERE id = ?", (cargo_id,))
    c = cursor.fetchone()
    if not c:
        conn.close()
        raise HTTPException(status_code=404, detail="Cargo não encontrado.")
    
    dep = dados.departamento if dados.departamento else c["departamento"]
    cod = dados.codigo_cargo if dados.codigo_cargo else c["codigo_cargo"]
    cursor.execute("""
        UPDATE cargos 
        SET codigo_cargo = ?, cargo = ?, departamento = ?
        WHERE id = ?
    """, (cod, dados.cargo, dep, cargo_id))

    conn.commit()

    cursor.execute("SELECT * FROM cargos WHERE id = ?", (cargo_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.delete("/api/v1/cadastros/cargos/{cargo_id}")
def excluir_cargo(cargo_id: int):
    param = obter_parametrizacao_exclusao()
    if not param.permitir_excluir_cargo:
        raise HTTPException(status_code=403, detail="A exclusão de Cargos está desabilitada na Parametrização de Configurações.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cargos WHERE id = ?", (cargo_id,))
    c = cursor.fetchone()
    if not c:
        conn.close()
        raise HTTPException(status_code=404, detail="Cargo não encontrado.")
    
    cursor.execute("DELETE FROM cargos WHERE id = ?", (cargo_id,))
    conn.commit()
    conn.close()
    return {"message": f"Cargo {c['cargo']} excluído com sucesso."}

# 5. Turmas
@app.get("/api/v1/cadastros/turmas", response_model=List[TurmaCadastro])
def listar_turmas_cadastradas():
    recalcular_medias_rede()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM turmas ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/v1/cadastros/turmas", response_model=TurmaCadastro, status_code=201)
def cadastrar_turma(dados: NovaTurmaCadastroDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(id) FROM turmas")
    max_id = cursor.fetchone()[0] or 0
    novo_id = max_id + 1
    sala = dados.sala or f"Sala {novo_id:02d}"
    tot = dados.total_alunos if dados.total_alunos is not None else 25

    cursor.execute("""
        INSERT INTO turmas (codigo_escola, nome_escola, periodo_letivo, modalidade, etapa, turma, turno, total_alunos, sala)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (dados.codigo_escola, dados.nome_escola, dados.periodo_letivo, dados.modalidade, dados.etapa, dados.turma, dados.turno, tot, sala))
    inserted_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM turmas WHERE id = ?", (inserted_id,))
    row = dict(cursor.fetchone())
    conn.close()
    recalcular_medias_rede()
    return row

@app.put("/api/v1/cadastros/turmas/{turma_id}", response_model=TurmaCadastro)
def atualizar_turma(turma_id: int, dados: NovaTurmaCadastroDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM turmas WHERE id = ?", (turma_id,))
    t = cursor.fetchone()
    if not t:
        conn.close()
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    
    tot = dados.total_alunos if dados.total_alunos is not None else t["total_alunos"]
    sala = dados.sala if dados.sala else t["sala"]

    cursor.execute("""
        UPDATE turmas 
        SET codigo_escola = ?, nome_escola = ?, periodo_letivo = ?, modalidade = ?, etapa = ?, turma = ?, turno = ?, total_alunos = ?, sala = ?
        WHERE id = ?
    """, (dados.codigo_escola, dados.nome_escola, dados.periodo_letivo, dados.modalidade, dados.etapa, dados.turma, dados.turno, tot, sala, turma_id))
    conn.commit()

    cursor.execute("SELECT * FROM turmas WHERE id = ?", (turma_id,))
    row = dict(cursor.fetchone())
    conn.close()
    recalcular_medias_rede()
    return row

@app.delete("/api/v1/cadastros/turmas/{turma_id}")
def excluir_turma(turma_id: int):
    param = obter_parametrizacao_exclusao()
    if not param.permitir_excluir_turma:
        raise HTTPException(status_code=403, detail="A exclusão de Turmas está desabilitada na Parametrização de Configurações.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM turmas WHERE id = ?", (turma_id,))
    t = cursor.fetchone()
    if not t:
        conn.close()
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    
    cursor.execute("DELETE FROM turmas WHERE id = ?", (turma_id,))
    conn.commit()
    conn.close()
    recalcular_medias_rede()
    return {"message": f"Turma {t['turma']} excluída com sucesso."}

# 6. Matriz Curricular
@app.get("/api/v1/cadastros/matriz-curricular", response_model=List[MatrizCurricular])
def listar_matriz_curricular():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM matriz_curricular ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/v1/cadastros/matriz-curricular", response_model=MatrizCurricular, status_code=201)
def cadastrar_disciplina_matriz(dados: NovaMatrizDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO matriz_curricular (
            codigo_escola, nome_escola, codigo_aluno, codigo_inep, nome, turma, sala, turno, nome_disciplina, carga_horaria
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dados.codigo_escola, dados.nome_escola, dados.codigo_aluno, dados.codigo_inep,
        dados.nome or "", dados.turma, dados.sala, dados.turno, dados.nome_disciplina, dados.carga_horaria or ""
    ))
    inserted_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM matriz_curricular WHERE id = ?", (inserted_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.put("/api/v1/cadastros/matriz-curricular/{matriz_id}", response_model=MatrizCurricular)
def atualizar_matriz_curricular(matriz_id: int, dados: NovaMatrizDTO):
    sanitizar_dto_entrada(dados)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM matriz_curricular WHERE id = ?", (matriz_id,))
    m = cursor.fetchone()
    if not m:
        conn.close()
        raise HTTPException(status_code=404, detail="Item da Matriz Curricular não encontrado.")
    
    cursor.execute("""
        UPDATE matriz_curricular 
        SET codigo_escola = ?, nome_escola = ?, codigo_aluno = ?, codigo_inep = ?,
            turma = ?, sala = ?, turno = ?, nome_disciplina = ?
        WHERE id = ?
    """, (
        dados.codigo_escola, dados.nome_escola, dados.codigo_aluno, dados.codigo_inep,
        dados.turma, dados.sala, dados.turno, dados.nome_disciplina, matriz_id
    ))
    conn.commit()

    cursor.execute("SELECT * FROM matriz_curricular WHERE id = ?", (matriz_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

@app.delete("/api/v1/cadastros/matriz-curricular/{matriz_id}")
def excluir_matriz_curricular(matriz_id: int):
    param = obter_parametrizacao_exclusao()
    if not param.permitir_excluir_matriz:
        raise HTTPException(status_code=403, detail="A exclusão de Matriz Curricular está desabilitada na Parametrização de Configurações.")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM matriz_curricular WHERE id = ?", (matriz_id,))
    m = cursor.fetchone()
    if not m:
        conn.close()
        raise HTTPException(status_code=404, detail="Item da Matriz Curricular não encontrado.")
    
    cursor.execute("DELETE FROM matriz_curricular WHERE id = ?", (matriz_id,))
    conn.commit()
    conn.close()
    return {"message": f"Disciplina {m['nome_disciplina']} excluída da matriz."}

# --- RELATÓRIOS E BI ---
@app.get("/api/v1/relatorios/proficiencia-escolas")
def obter_proficiencia_escolas():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM escolas ORDER BY id ASC")
    escolas = cursor.fetchall()
    conn.close()
    return [
        {
            "id": e["id"],
            "escola": e["nome"],
            "lingua_portuguesa": e["nota_media_lp"],
            "matematica": e["nota_media_mat"],
            "proficiencia_media": round((e["proficiencia_lp"] + e["proficiencia_mat"]) / 2, 1),
            "taxa_participacao": float(e["taxa_participacao"].replace("%", "")) if "%" in e["taxa_participacao"] else 100.0,
            "tipo": e["tipo_unidade"]
        }
        for e in escolas
    ]

@app.get("/api/v1/relatorios/distribuicao-niveis")
def obter_distribuicao_niveis():
    metricas = obter_metricas()
    return {
        "rotulos": ["Abaixo do Básico", "Básico", "Adequado", "Avançado"],
        "lingua_portuguesa": [metricas.perc_abaixo_basico, metricas.perc_basico, metricas.perc_adequado, metricas.perc_avancado],
        "matematica": [metricas.perc_abaixo_basico, metricas.perc_basico, metricas.perc_adequado, metricas.perc_avancado],
        "meta_municipal_2026": [8.0, 18.0, 52.0, 22.0]
    }

@app.get("/api/v1/relatorios/evolucao-historica")
def obter_evolucao_historica():
    metricas = obter_metricas()
    lp = metricas.nota_media_lp if metricas.nota_media_lp > 0 else 7.8
    mat = metricas.nota_media_mat if metricas.nota_media_mat > 0 else 8.1
    return {
        "ciclos": ["2023 - Saída", "2024 - Diagnóstica", "2024 - Saída", "2025 - Diagnóstica", "2025 - Saída", "2026 - Atual"],
        "lingua_portuguesa": [6.2, 6.5, 6.9, 7.2, 7.5, lp],
        "matematica": [6.4, 6.7, 7.1, 7.4, 7.8, mat],
        "meta_agua_boa": [7.0, 7.2, 7.5, 7.8, 8.0, 8.2]
    }

@app.get("/api/v1/exportar/csv")
def exportar_dados_csv(
    escola: Optional[str] = Query(None),
    turma: Optional[str] = Query(None),
    disciplina: Optional[str] = Query(None),
    nivel: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM alunos WHERE 1=1"
    params = []
    if escola and escola != "todos":
        query += " AND (codigo_escola = ? OR lower(nome_escola) = lower(?))"
        params.extend([escola, escola])
    if turma and turma != "todos":
        query += " AND turma = ?"
        params.append(turma)
    if nivel and nivel != "todos":
        query += " AND (nivel_lp = ? OR nivel_mat = ?)"
        params.extend([nivel, nivel])
    query += " ORDER BY nome_escola ASC, turma ASC, nome ASC"
    
    cursor.execute(query, params)
    alunos = cursor.fetchall()
    conn.close()

    # Registro de auditoria LGPD (Art. 6º, VII)
    detalhes_exp = f"Exportação CSV gerada: {len(alunos)} registros (Escola: {escola or 'Todas'}, Turma: {turma or 'Todas'})"
    registrar_log_auditoria("Usuário Conectado", "admin", "EXPORTACAO_CSV", detalhes_exp)

    csv_header = "ID;Código Aluno;INEP;Nome Estudante;Escola;Turma;Sala;Turno;Nota LP;Nível LP;Nota MAT;Nível MAT;Média Geral;Frequência;Situação\n"
    csv_rows = []
    for a in alunos:
        nota_lp = round(float(a['nota_lp'] or 0.0), 1)
        nota_mat = round(float(a['nota_mat'] or 0.0), 1)
        media = round((nota_lp + nota_mat) / 2, 1)
        row = (
            f"{sanitizar_celula_csv(a['id'])};"
            f"{sanitizar_celula_csv(a['codigo_aluno'])};"
            f"{sanitizar_celula_csv(a['codigo_inep'])};"
            f"{sanitizar_celula_csv(a['nome'])};"
            f"{sanitizar_celula_csv(a['nome_escola'])};"
            f"{sanitizar_celula_csv(a['turma'])};"
            f"{sanitizar_celula_csv(a['sala'])};"
            f"{sanitizar_celula_csv(a['turno'])};"
            f"{nota_lp};"
            f"{sanitizar_celula_csv(a['nivel_lp'])};"
            f"{nota_mat};"
            f"{sanitizar_celula_csv(a['nivel_mat'])};"
            f"{media};"
            f"{sanitizar_celula_csv(a['frequencia'])};"
            f"{sanitizar_celula_csv(a['situacao'])}"
        )
        csv_rows.append(row)
    csv_content = "\ufeff" + csv_header + "\n".join(csv_rows)
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=relatorio_notas_desempenho_agua_boa.csv"}
    )

# --- SERVIR FRONTEND ESTÁTICO ---
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "index.html")
    if not os.path.exists(index_file):
        index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AVALIA AB - API Operacional. Acesse /docs para documentação OpenAPI."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8050, reload=True)