# Guia de Restauração e Execução em Outra Máquina — Plataforma AVALIA AB

Este pacote contém o **Backup Total da Plataforma AVALIA AB** (Município de Água Boa - MT), incluindo **100% do código-fonte**, **ativos visuais (logomarcas em alta definição)**, **documentação** e **banco de dados completo**.

---

## O que está incluído neste pacote de Backup Total

1. **Código-Fonte Completo (`app/`):**
   - Backend FastAPI ([`app/main.py`](app/main.py), [`app/database.py`](app/database.py), [`app/security.py`](app/security.py), [`app/models.py`](app/models.py), [`app/services.py`](app/services.py))
   - Frontend SPA Modular (`app/static/index.html`, `app/static/style.css`, `app/static/app.js`, `app/static/js/`, `app/static/views/`, `app/static/modals/`)
   - Logomarcas Oficiais em Alta Definição (`app/static/logo_avalia_ab_sharp.png` e `app/static/logo_prefeitura_seduc.png`)
2. **Banco de Dados Completo (em 3 formatos para máxima segurança):**
   - `avalia_ab.db`: Base de dados ativa pronta para uso imediato (com usuários, senhas criptografadas PBKDF2-SHA256, escolas, turmas, alunos, notas, habilidades BNCC, parametrizações e trilha de auditoria LGPD no Horário Oficial de Brasília).
   - `database_dumps/avalia_ab_backup_integro.db`: Cópia binária íntegra gerada via API oficial de backup transacional.
   - `database_dumps/backup_banco_completo.sql`: Script SQL completo (`CREATE TABLE` + `INSERT INTO`) de todas as tabelas.
   - `database_dumps/backup_banco_completo.json`: Exportação completa estruturada em formato JSON (UTF-8).
3. **Scripts de Inicialização e Infraestrutura:**
   - `instalar_e_iniciar_nova_maquina.bat`: Instalador e inicializador automático de 1 clique para Windows.
   - `iniciar_plataforma.bat`: Inicializador rápido diário.
   - `Dockerfile`, `docker-compose.yml` e `render.yaml`: Arquivos para execução em containers Docker / PostgreSQL ou nuvem.
   - `TUTORIAL_DO_USUARIO_AVALIA_AB.md`: Manual completo de uso de todas as telas e campos da plataforma.

---

## Como rodar em outra máquina (Passo a Passo)

### Opção 1: Execução Direta no Windows (1 Clique — Recomendado)
1. Extraia o arquivo `BACKUP_TOTAL_PLATAFORMA_AVALIA_AB_2026.zip` em uma pasta na nova máquina.
2. Certifique-se de que o **Python 3.11+** esteja instalado na máquina (com a opção *"Add Python to PATH"* marcada).
3. Dê um duplo clique no arquivo **`instalar_e_iniciar_nova_maquina.bat`**.
   - Ele criará automaticamente o ambiente virtual `.venv`, instalará todas as bibliotecas do `requirements.txt`, carregará o banco de dados `avalia_ab.db` e abrirá automaticamente o navegador em `http://localhost:8050`.

### Opção 2: Execução via Terminal (Windows / Linux / macOS)
```bash
# 1. Entre na pasta extraída
cd PlataformaAvaliaAB

# 2. Crie e ative o ambiente virtual
python -m venv .venv
# No Windows:
.venv\Scripts\activate
# No Linux/macOS:
# source .venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt

# 4. Inicie a plataforma na porta 8050
python -m uvicorn app.main:app --host 0.0.0.0 --port 8050
```

### Opção 3: Execução com Docker + PostgreSQL
```bash
docker compose up -d --build
```
*(Ao iniciar com PostgreSQL configurado no `.env`, a plataforma cria automaticamente o banco `avalia_ab` e migra todos os registros do `avalia_ab.db` para o PostgreSQL sem perda de dados).*

