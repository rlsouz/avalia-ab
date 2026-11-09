# 🚀 AVALIA AB - Plataforma de Avaliação e Monitoramento da Educação
### Secretaria Municipal de Educação • Município de Água Boa - MT

Plataforma educacional desenvolvida para a gestão, aplicação e análise de proficiência pedagógica das unidades escolares municipais (urbanas, polos rurais e indígenas) de Água Boa - MT.

---

## 🏛️ Arquitetura & Stack Tecnológica
- **Backend**: FastAPI (Python 3.13) assíncrono com validação estrita Pydantic v2.
- **Frontend**: Single Page Application (SPA) reativa com HTML5 Semântico, CSS Vanilla com Glassmorphism e Chart.js.
- **Identidade Visual**: Baseada na marca oficial `AVALIA AB` (Azul Marinho, Ciano Oceânico, Verde Educação e Dourado Solar).
- **Métricas Pedagógicas**: Escala SAEB / Avalia MT (0 a 500 pontos, alinhada à Teoria de Resposta ao Item - TRI) e matrizes de habilidades da BNCC.

---

## 🧭 Módulos da Plataforma

1. **📊 Painel Geral (Dashboard Executivo)**
   - KPIs consolidados da rede: 4.820 alunos, 9 escolas, 95.6% de participação.
   - Proficiência média municipal: Língua Portuguesa (238.4) e Matemática (244.1).
   - Gráfico de evolução temporal de rendimento (2023 - 2026).
   - Distribuição por padrões de desempenho (Abaixo do Básico, Básico, Adequado, Avançado).
   - Alertas pedagógicos com orientações imediatas para a Secretaria de Educação.

2. **📋 Módulo Central de Cadastros (Novo)**
   - **a. Usuários**: Código `XXXX` (número sequencial), Nome, CPF `XXX.XXX.XXX - XX`, Cargo, Endereço, Telefone `XX XX X XXXX-XXXX` e E-mail.
   - **b. Escola**: Código `XXX` (número sequencial), Nome, Endereço completo (Rua, Número, Bairro) e Telefone `XX XX X XXXX-XXXX`.
   - **c. Aluno**: Código da Escola `XXX`, Nome da Escola, Código do Aluno `XXXX`, Código INEP, Nome, Nome do Responsável, Endereço, Telefone do Responsável `XX XX X XXXX-XXXX`, Turma, Sala e Turno.
   - **d. Cargo**: Tela exclusiva para Cargos, associando Código do Cargo ao Nome do Cargo e Lotação.
   - **e. Turma**: Código da Escola `XXX`, Nome da Escola, Período Letivo, Modalidade, Etapa, Turma e Turno.
   - **f. Matriz Curricular (Disciplina)**: Código da Escola, Nome da Escola, Código do Aluno, INEP, Turma, Sala, Turno e Nome da Disciplina.

3. **📝 Avaliações Diagnósticas e Formativas**
   - Gestão de instrumentos avaliativos (Diagnóstica de Entrada, Sondagem de Fluência Leitora, Simulados SAEB).
   - Filtros dinâmicos por componente curricular e status operacional.
   - Cadastro e agendamento de novas provas via modal interativo com validação de itens BNCC.

4. **🏫 Gestão da Rede Escolar**
   - Diretório completo das 9 unidades escolares de Água Boa (urbanas, campo e indígenas).
   - Indicadores por polo: turmas, matrículas, taxa de participação e proficiência média.

5. **📈 Boletins, BI e Relatórios de Proficiência**
   - Relatórios analíticos comparativos entre todas as escolas da rede.
   - Consulta nominal e **Boletim Diagnóstico Individual do Estudante** com matriz de habilidades BNCC.
   - Exportação direta de microdados em formato `.CSV` e impressão formatada.

6. **⚙️ Configurações da Plataforma (Novo)**
   - **a. Seguranças**: Autenticação 2FA, senhas fortes, bloqueio por tentativas, trilhas de auditoria, mascaramento LGPD e backups automáticos.
   - **b. Habilitar e Desabilitar Funcionalidades**: Chaves (switches) para ativar ou desativar módulos e serviços em tempo real.

---

## ⚡ Como Executar a Plataforma

1. Verifique as dependências:
   ```bash
   pip install -r requirements.txt
   ```

2. Inicie o servidor FastAPI:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8050 --reload
   ```

3. Acesse a plataforma no navegador:
   - **Plataforma Web**: [http://localhost:8050](http://localhost:8050)
   - **Documentação da API (OpenAPI/Swagger)**: [http://localhost:8050/docs](http://localhost:8050/docs)