import os
import re
import html
import time
import json
import hmac
import base64
import hashlib
import secrets
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlparse
from fastapi import Request
from fastapi.responses import JSONResponse

from app.database import ENV_FILE, carregar_variaveis_env, get_db_connection, registrar_log_auditoria

# =====================================================================
# 1. CHAVE CRIPTOGRÁFICA DO SERVIDOR (HMAC-SHA256 256-BIT SECRET)
# =====================================================================
def obter_ou_gerar_chave_secreta() -> bytes:
    carregar_variaveis_env()
    chave = os.environ.get("AVALIA_SECRET_KEY", "").strip()
    if len(chave) >= 64:
        return chave.encode("utf-8")

    # Chave determinística persistente para que reinicializações do Uvicorn nunca derrubem sessões ativas
    semente_fixa = f"AVALIA_AB_AGUA_BOA_MT_SECRET_KEY_2026::{ENV_FILE}"
    chave_deterministica = hashlib.sha256(semente_fixa.encode("utf-8")).hexdigest()
    os.environ["AVALIA_SECRET_KEY"] = chave_deterministica
    return chave_deterministica.encode("utf-8")


SECRET_KEY_BYTES = obter_ou_gerar_chave_secreta()
COOKIE_SESSION_NAME = "avalia_ab_session"


# =====================================================================
# 2. HASH DE SENHAS COM PBKDF2-HMAC-SHA256 (OWASP 200.000 ITERAÇÕES)
# =====================================================================
PBKDF2_ITERATIONS = 200_000

# Lista de senhas fracas/vazadas bloqueadas (NIST SP 800-63B)
SENHAS_COMUNS_BLOQUEADAS = {
    "123456",
    "12345678",
    "123456789",
    "1234567890",
    "senha123",
    "admin123",
    "mudar123",
    "password",
    "qwerty123",
    "avalia123",
    "aguaboa123",
    "11111111",
    "00000000",
}


def gerar_hash_senha_segura(senha_plana: str) -> str:
    senha_limpa = (senha_plana or "").strip()[:128]
    if not senha_limpa:
        return ""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        senha_limpa.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${dk.hex()}"


# Hash fictício pré-computado para mitigação de Timing Attack quando usuário não existe
DUMMY_PBKDF2_HASH = gerar_hash_senha_segura(" dummy_timing_defense_avalia_ab_2026! ")


def verificar_senha_segura(senha_informada: str, hash_armazenado: str) -> Tuple[bool, bool]:
    """
    Retorna (senha_valida: bool, precisa_upgrade_pbkdf2: bool).
    Usa comparação em tempo constante (hmac.compare_digest) contra ataques de timing.
    Se o hash armazenado usar menos de 600.000 iterações ou SHA-256 legado, sinaliza upgrade automático.
    """
    senha_limpa = (senha_informada or "").strip()[:128]
    hash_salvo = (hash_armazenado or "").strip()
    if not hash_salvo or not senha_limpa:
        return False, False

    if hash_salvo.startswith("pbkdf2_sha256$"):
        partes = hash_salvo.split("$")
        if len(partes) != 4:
            return False, False
        _, iter_str, salt, hash_hex = partes
        try:
            iters = int(iter_str)
        except ValueError:
            iters = 150_000
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            senha_limpa.encode("utf-8"),
            salt.encode("utf-8"),
            iters,
        ).hex()
        valida = hmac.compare_digest(dk, hash_hex)
        precisa_upgrade = valida and (iters < PBKDF2_ITERATIONS)
        return valida, precisa_upgrade

    # Compatibilidade com hash legado SHA-256 (e sinaliza upgrade imediato para PBKDF2 600k)
    sha256_hex = hashlib.sha256(senha_limpa.encode("utf-8")).hexdigest()
    if hmac.compare_digest(sha256_hex, hash_salvo):
        return True, True

    return False, False


def simular_verificacao_anti_timing(senha_informada: str):
    """Executa PBKDF2 em tempo constante mesmo quando o usuário não existe (evita User Enumeration por Timing)."""
    verificar_senha_segura(senha_informada or "senha_invalida", DUMMY_PBKDF2_HASH)


def validar_forca_senha(senha: str, exigir_forte: bool = True) -> Optional[str]:
    """Valida a senha conforme diretrizes NIST SP 800-63B e OWASP ASVS."""
    s = (senha or "").strip()
    if len(s) < 6:
        return "A senha deve ter pelo menos 6 caracteres."
    if len(s) > 128:
        return "A senha excede o limite máximo de 128 caracteres."
    if s.lower() in SENHAS_COMUNS_BLOQUEADAS:
        return "Esta senha é muito comum e insegura. Escolha uma senha mais forte."
    if exigir_forte:
        if len(s) < 8:
            return "Política de Senhas Fortes ativa: a senha deve conter no mínimo 8 caracteres."
        tem_letra = any(c.isalpha() for c in s)
        tem_numero = any(c.isdigit() for c in s)
        if not (tem_letra and tem_numero):
            return "Política de Senhas Fortes ativa: a senha deve combinar letras e números."
    return None


# =====================================================================
# 3. TOKENS DE SESSÃO ASSINADOS COM VINCULAÇÃO DE DISPOSITIVO (UA-FP)
# =====================================================================
def calcular_fingerprint_agente(request: Optional[Request]) -> str:
    if request is None:
        return ""
    ua = (request.headers.get("User-Agent") or "").strip()
    if not ua:
        return ""
    return hashlib.sha256(ua.encode("utf-8")).hexdigest()[:16]


def gerar_token_sessao(
    usuario: Dict[str, Any],
    duracao_minutos: int = 720,
    request: Optional[Request] = None,
) -> str:
    agora = int(time.time())
    exp = agora + max(60, int(duracao_minutos)) * 60
    payload = {
        "uid": int(usuario["id"]),
        "cod": str(usuario.get("codigo") or ""),
        "nome": str(usuario.get("nome") or ""),
        "perfil": str(usuario.get("perfil") or "professor"),
        "iat": agora,
        "exp": exp,
        "jti": secrets.token_hex(12),
        "uaf": calcular_fingerprint_agente(request),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    assinatura = hmac.new(SECRET_KEY_BYTES, payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{assinatura}"


TOKENS_REVOGADOS: Dict[str, int] = {}


def revogar_token_sessao(token: str):
    if not token or "." not in token:
        return
    dados = validar_token_sessao(token)
    if dados and "jti" in dados:
        jti = dados["jti"]
        exp = int(dados.get("exp", int(time.time()) + 3600))
        TOKENS_REVOGADOS[jti] = exp
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO tokens_revogados (jti, expira_em) VALUES (?, ?)",
                (jti, exp),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass


def _jti_esta_revogado(jti: str) -> bool:
    if not jti:
        return False
    if jti in TOKENS_REVOGADOS:
        return True
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM tokens_revogados WHERE jti = ?", (jti,))
        row = cur.fetchone()
        conn.close()
        if row:
            TOKENS_REVOGADOS[jti] = int(time.time()) + 3600
            return True
    except Exception:
        pass
    return False


def validar_token_sessao(token: str, request: Optional[Request] = None) -> Optional[Dict[str, Any]]:
    if not token or "." not in token:
        return None
    try:
        payload_b64, assinatura_recebida = token.split(".", 1)
        assinatura_esperada = hmac.new(
            SECRET_KEY_BYTES, payload_b64.encode("ascii"), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(assinatura_recebida, assinatura_esperada):
            return None

        padding = "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64 + padding).decode("utf-8")
        dados = json.loads(payload_json)

        agora = int(time.time())
        if int(dados.get("exp", 0)) < agora:
            return None

        # Verifica vinculação de dispositivo (User-Agent Fingerprint) contra sequestro de sessão
        uaf_token = dados.get("uaf")
        if request is not None and uaf_token:
            uaf_atual = calcular_fingerprint_agente(request)
            if uaf_atual and not hmac.compare_digest(uaf_token, uaf_atual):
                return None

        jti = dados.get("jti")
        if jti and _jti_esta_revogado(jti):
            return None

        return dados
    except Exception:
        return None


def extrair_sessao_requisicao(request: Request) -> Optional[Dict[str, Any]]:
    # 1. Tenta cabeçalho Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.lower().startswith("bearer "):
        token_header = auth_header[7:].strip()
        sessao = validar_token_sessao(token_header, request=request)
        if sessao:
            return sessao

    # 2. Tenta Cookie HttpOnly assinado
    token_cookie = request.cookies.get(COOKIE_SESSION_NAME, "").strip()
    if token_cookie:
        sessao = validar_token_sessao(token_cookie, request=request)
        if sessao:
            return sessao

    return None


# =====================================================================
# 4. PROTEÇÃO CONTRA FORÇA BRUTA, CSRF, RATE LIMITING E WAF DE BORDA
# =====================================================================
RATE_LIMIT_JANELA_SEG = 60
RATE_LIMIT_MAX_REQ = 240
HISTORICO_REQ_IP: Dict[str, list] = {}

FALHAS_LOGIN_POR_CHAVE: Dict[str, Dict[str, Any]] = {}
TEMPO_BLOQUEIO_LOGIN_SEG = 15 * 60  # 15 minutos de bloqueio após estourar tentativas

ASSINATURAS_SCANNERS_BLOQUEADOS = (
    "sqlmap",
    "nikto",
    "nmap",
    "masscan",
    "zgrab",
    "dirbuster",
    "gobuster",
    "nuclei",
    "acunetix",
    "nessus",
    "metasploit",
    "wfuzz",
    "hydra",
    "burpsuite",
    "havij",
)

PADROES_URL_MALICIOSOS = re.compile(
    r"(\.\./|\.\.\\|%2e%2e|/etc/passwd|win\.ini|\.env|\.git|union\s+select|<script|javascript:|onerror=|onload=)",
    re.IGNORECASE,
)


def obter_ip_cliente(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For", "").strip()
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def verificar_bloqueio_login(ip: str, identificador: str) -> Optional[str]:
    agora = time.time()
    for chave in (f"ip:{ip}", f"id:{identificador.lower().strip()}"):
        registro = FALHAS_LOGIN_POR_CHAVE.get(chave)
        if registro:
            bloqueado_ate = registro.get("bloqueado_ate", 0)
            if bloqueado_ate > agora:
                restante_min = max(1, int((bloqueado_ate - agora) / 60) + 1)
                return f"Acesso temporariamente bloqueado por segurança após múltiplas tentativas inválidas. Aguarde {restante_min} min."
            elif bloqueado_ate > 0 and bloqueado_ate <= agora:
                FALHAS_LOGIN_POR_CHAVE.pop(chave, None)
    return None


def registrar_falha_login(ip: str, identificador: str, max_tentativas: int = 5, bloquear: bool = True):
    agora = time.time()
    limite = max(3, int(max_tentativas or 5))
    for chave in (f"ip:{ip}", f"id:{identificador.lower().strip()}"):
        reg = FALHAS_LOGIN_POR_CHAVE.get(chave, {"tentativas": 0, "ultima": agora, "bloqueado_ate": 0})
        if agora - reg["ultima"] > TEMPO_BLOQUEIO_LOGIN_SEG:
            reg["tentativas"] = 0
        reg["tentativas"] += 1
        reg["ultima"] = agora
        if bloquear and reg["tentativas"] >= limite:
            reg["bloqueado_ate"] = agora + TEMPO_BLOQUEIO_LOGIN_SEG
            registrar_log_auditoria(
                identificador or "Desconhecido",
                "bloqueado",
                "BLOQUEIO_FORCA_BRUTA",
                f"Bloqueio automático acionado para {chave} após {reg['tentativas']} tentativas inválidas.",
                ip_origem=ip,
            )
        FALHAS_LOGIN_POR_CHAVE[chave] = reg


def limpar_falhas_login(ip: str, identificador: str):
    FALHAS_LOGIN_POR_CHAVE.pop(f"ip:{ip}", None)
    FALHAS_LOGIN_POR_CHAVE.pop(f"id:{identificador.lower().strip()}", None)


def verificar_protecao_csrf(request: Request) -> Optional[str]:
    """
    Proteção CSRF em múltiplas camadas (OWASP CSRF Prevention Cheat Sheet) para verbos mutáveis:
    1. Se a requisição envia Origin ou Referer, valida que pertence ao mesmo Host.
    2. Se a autenticação depende apenas de Cookie (sem cabeçalho Authorization ou X-Requested-With),
       bloqueia requisições forjadas entre sites (Cross-Site Form POST).
    """
    if request.method.upper() not in ("POST", "PUT", "PATCH", "DELETE"):
        return None

    host_atual = (request.headers.get("Host") or "").strip().lower()
    origin = (request.headers.get("Origin") or "").strip().lower()
    referer = (request.headers.get("Referer") or "").strip().lower()

    if origin and origin != "null" and host_atual:
        parsed_origin = urlparse(origin)
        if parsed_origin.netloc and parsed_origin.netloc.lower() != host_atual:
            return "Requisição bloqueada por proteção CSRF: Origem externa não autorizada."

    if not origin and referer and host_atual:
        parsed_ref = urlparse(referer)
        if parsed_ref.netloc and parsed_ref.netloc.lower() != host_atual:
            return "Requisição bloqueada por proteção CSRF: Referer externo não autorizado."

    # Exige cabeçalho customizado X-Requested-With, Authorization Bearer ou Content-Type application/json
    content_type = (request.headers.get("Content-Type") or "").lower()
    tem_xrw = bool(request.headers.get("X-Requested-With"))
    tem_bearer = (request.headers.get("Authorization") or "").lower().startswith("bearer ")
    if not (tem_xrw or tem_bearer or "application/json" in content_type):
        return "Requisição bloqueada por proteção CSRF: Cabeçalho de segurança ausente."

    return None


def verificar_permissao_rbac_rota(path: str, method: str, perfil: str) -> Optional[str]:
    """
    Valida no servidor (Server-Side RBAC) se o perfil do token possui permissão para a rota e verbo HTTP.
    Retorna mensagem de erro caso negado, ou None se permitido.
    """
    p = (perfil or "").lower().strip()
    m = method.upper()

    # 1. Exclusões (DELETE) em qualquer rota: restrito exclusivamente a Administradores
    if m == "DELETE" and p != "admin":
        return "Acesso negado pelo Servidor: Apenas o perfil Administrador (SEDUC / TI) possui permissão para excluir registros."

    # 2. Alteração de Configurações de Segurança, Parametrização e Consulta de Auditoria LGPD: restrito a Admin
    if path.startswith("/api/v1/auditoria") and p != "admin":
        return "Acesso negado pelo Servidor: A Trilha de Auditoria LGPD é restrita a Administradores."

    if path.startswith("/api/v1/configuracoes") and m in ("POST", "PUT", "DELETE") and p != "admin":
        return "Acesso negado pelo Servidor: Apenas Administradores podem alterar configurações do sistema."

    # 3. Gestão de Contas de Usuários: Criação/Edição/Exclusão apenas Admin
    if path.startswith("/api/v1/cadastros/usuarios") and m in ("POST", "PUT", "DELETE") and p != "admin":
        return "Acesso negado pelo Servidor: Apenas Administradores podem cadastrar ou alterar contas de usuários."

    # 4. Perfil Professor não pode alterar cadastros estruturais (Escolas, Turmas, Alunos, Cargos, Matriz)
    if p == "professor" and path.startswith("/api/v1/cadastros/") and not path.endswith("/notas") and m in ("POST", "PUT", "DELETE"):
        return "Acesso negado pelo Servidor: O perfil Professor possui permissão apenas para lançamento de notas e boletins."

    if p == "professor" and path.startswith("/api/v1/exportar/csv"):
        return "Acesso negado pelo Servidor: Exportação global CSV não habilitada para este perfil."

    return None


def inspecionar_requisicao_waf(request: Request) -> Optional[JSONResponse]:
    """
    Inspeciona todas as requisições HTTP contra:
    - Scanners de portas/vulnerabilidades
    - Path Traversal / SQLi / XSS na URL
    - Ataques CSRF em rotas de mutação
    - Sobrecarga de payload (DoS)
    - Rate Limiting por IP
    """
    ip = obter_ip_cliente(request)
    agora = time.time()

    # 1. Rate Limiting por IP
    historico = HISTORICO_REQ_IP.get(ip, [])
    historico = [t for t in historico if agora - t < RATE_LIMIT_JANELA_SEG]
    if len(historico) >= RATE_LIMIT_MAX_REQ:
        return JSONResponse(
            status_code=429,
            content={"detail": "Limite de requisições excedido (Rate Limit Ativo). Aguarde 1 minuto."},
        )
    historico.append(agora)
    HISTORICO_REQ_IP[ip] = historico

    # 2. Bloqueio de User-Agents de ferramentas de invasão/varredura
    ua = (request.headers.get("User-Agent") or "").lower()
    if any(sig in ua for sig in ASSINATURAS_SCANNERS_BLOQUEADOS):
        registrar_log_auditoria("WAF / Firewall", "sistema", "BLOQUEIO_SCANNER", f"Scanner bloqueado: UA={ua}", ip_origem=ip)
        return JSONResponse(status_code=403, content={"detail": "Requisição bloqueada pelo Firewall de Aplicação (WAF)."})

    # 3. Bloqueio de Path Traversal e padrões maliciosos na URL/Query
    raw_target = f"{request.url.path}?{request.url.query}"
    if PADROES_URL_MALICIOSOS.search(raw_target):
        registrar_log_auditoria("WAF / Firewall", "sistema", "BLOQUEIO_PAYLOAD_URL", f"Tentativa bloqueada na URL: {raw_target[:120]}", ip_origem=ip)
        return JSONResponse(status_code=403, content={"detail": "Padrão de requisição bloqueado por política de segurança."})

    # 4. Limite de tamanho de corpo HTTP (Máx 2 MB)
    cl = request.headers.get("Content-Length")
    if cl and cl.isdigit() and int(cl) > 2 * 1024 * 1024:
        return JSONResponse(status_code=413, content={"detail": "Tamanho máximo de requisição excedido (Limite: 2MB)."})

    # 5. Verificação anti-CSRF em rotas da API
    if request.url.path.startswith("/api/"):
        erro_csrf = verificar_protecao_csrf(request)
        if erro_csrf:
            registrar_log_auditoria("WAF / CSRF", "sistema", "BLOQUEIO_CSRF", erro_csrf, ip_origem=ip)
            return JSONResponse(status_code=403, content={"detail": erro_csrf})

    return None


# =====================================================================
# 5. SANITIZAÇÃO CONTRA STORED XSS, HTML INJECTION E CSV INJECTION
# =====================================================================
PADRAO_TAGS_PERIGOSAS = re.compile(
    r"(<\s*/?\s*(script|iframe|object|embed|svg|math|link|meta|style|form|input|button)[^>]*>|on[a-z]+\s*=|javascript\s*:|vbscript\s*:|data\s*:\s*text/html)",
    re.IGNORECASE,
)


def sanitizar_texto_seguro(valor: Any) -> str:
    """Remove null-bytes, tags executáveis (XSS) e caracteres de controle perigosos."""
    if valor is None:
        return ""
    texto = str(valor).replace("\x00", "").strip()
    texto = PADRAO_TAGS_PERIGOSAS.sub("", texto)
    # Remove colchetes angulares de abertura/fechamento de tags HTML brutas mantendo acentuação e símbolos matemáticos
    texto = texto.replace("<", "‹").replace(">", "›")
    return texto


def sanitizar_dto_entrada(dto_obj: Any, campos_ignorar: Tuple[str, ...] = ("senha", "senha_atual", "nova_senha")) -> Any:
    """Percorre todos os atributos string de um DTO Pydantic e aplica sanitização contra Stored XSS."""
    for campo in getattr(dto_obj, "__fields__", {}):
        if campo in campos_ignorar:
            continue
        val = getattr(dto_obj, campo, None)
        if isinstance(val, str):
            setattr(dto_obj, campo, sanitizar_texto_seguro(val))
    return dto_obj


def sanitizar_celula_csv(valor: Any) -> str:
    """Previne ataques de CSV Injection / Formula Injection em planilhas Excel/LibreOffice."""
    texto = str(valor if valor is not None else "").strip()
    texto = texto.replace(";", ",")
    if texto and texto[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{texto}"
    return texto
