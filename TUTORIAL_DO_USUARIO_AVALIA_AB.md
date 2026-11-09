# Manual e Tutorial Completo do Usuário — Plataforma AVALIA AB
**Prefeitura Municipal de Água Boa - MT • Secretaria Municipal de Educação • Hub de Inovação**

> **Nota:** Este guia foi elaborado para orientar passo a passo qualquer **novo usuário** (Administrador SEDUC/TI, Coordenador Pedagógico, Diretor/Secretário Escolar ou Professor/Docente) na utilização de todas as telas, botões, filtros e campos da **Plataforma de Avaliação e Monitoramento da Educação (AVALIA AB)**.

---

## 1. Tela Inicial de Apresentação e Portal de Logon

Ao acessar `http://localhost:8050`, caso você ainda não esteja autenticado, a plataforma exibe o **Portal Institucional de Logon**.

### O que você encontra nesta tela:
- **Coluna Institucional (Esquerda):** Apresenta a identidade visual do **AVALIA AB**, o selo **Município de Água Boa - MT • Gestão Educacional**, os 3 pilares da plataforma (*Avaliação Diagnóstica e Formativa*, *Business Intelligence Escolar* e *Segurança & Conformidade LGPD*) e indicadores rápidos da rede.
- **Coluna de Autenticação (Direita):** Formulário seguro de entrada no sistema.

### Campos e Botões da Tela de Logon:
| Campo / Botão | Como preencher / O que faz |
| :--- | :--- |
| **E-mail, CPF ou Código do Usuário (`*`)** | Digite o seu e-mail institucional (ex.: `usuario@aguaboa.mt.gov.br`), seu CPF ou seu código sequencial de 4 dígitos (ex.: `0001`). |
| **Senha de Acesso (`*`)** | Digite sua senha pessoal cadastrada. |
| **Botão `👁️` (Mostrar/Ocultar Senha)** | Permite visualizar os caracteres digitados no campo de senha para evitar erros de digitação. |
| **Link `Esqueceu ou deseja criar/alterar senha?`** | Abre um quadro expansível para redefinição de senha diretamente na tela de login. |
| ↳ **Senha Atual** *(no quadro de redefinição)* | Informe sua senha atual para validação de segurança. |
| ↳ **Nova Senha** *(no quadro de redefinição)* | Informe a nova senha desejada. |
| ↳ **Botão `Salvar`** | Confirma e grava imediatamente a nova senha criptografada. |
| **Botão `Entrar na Plataforma AVALIA AB ➔`** | Valida suas credenciais, gera seu token criptográfico de sessão e libera os módulos de acordo com o seu perfil. |
| **Botão `+ Cadastrar Novo Usuário`** | Para usuários já autenticados como Administrador/Gestor, leva diretamente ao formulário de criação de novo usuário. |

---

## 2. Cabeçalho Institucional, Barra de Navegação e Rodapé

### 2.1. Faixa Superior Azul Escura (Cabeçalho)
- **Logo Esquerda (`AVALIA AB`):** Ao clicar sobre a logomarca, você pode reabrir a janela institucional de logon/apresentação a qualquer momento.
- **Painel Central:**
  - **Título Institucional:** *"Plataforma de Avaliação e Monitoramento da Educação"*.
  - **Indicador `Usuário:`** Mostra o nome completo e o código do usuário autenticado (ex.: `Pablo Souza (0001)`).
  - **Botão `Trocar Usuário`:** Abre a tela de login para alternar de conta sem precisar fechar o navegador.
  - **Botão `Sair`:** Encerra imediatamente a sessão ativa com segurança (revogando o token no servidor) e retorna à tela de logon.
  - **Indicador `Brasília:`** Relógio digital em tempo real sincronizado com o **Horário Oficial de Brasília (`America/Sao_Paulo` • UTC-3)**.
- **Logo Direita (`ÁGUA BOA PREFEITURA • Secretaria Municipal de Educação • Gestão 2025/2028`):** Identidade oficial da Secretaria Municipal de Educação.

### 2.2. Barra de Navegação Principal (7 Abas)
Localizada logo abaixo das logomarcas, permite navegar entre os módulos sem recarregar a página:
1. **Painel Geral**
2. **Cadastros** *(visível conforme permissão RBAC)*
3. **Escolas**
4. **Estudantes**
5. **Inserir Notas**
6. **BI & Relatórios**
7. **Configurações** *(exclusivo para perfil Administrador SEDUC / TI)*

### Controle de Acesso por Perfil (RBAC):
- **Administrador (SEDUC / TI):** Acesso total às 7 abas, inclusão, edição e exclusão.
- **Coordenador Pedagógico:** Acesso a Painel Geral, Cadastros, Escolas, Estudantes, Inserir Notas e BI & Relatórios.
- **Diretor / Secretário:** Acesso a Painel Geral, Cadastros, Escolas, Estudantes, Inserir Notas e BI & Relatórios.
- **Professor / Docente:** Acesso focado em Painel Geral, Estudantes e Inserir Notas.

---

## 3. Aba 1: Painel Geral / Dashboard

É a tela inicial após o login, projetada para dar uma visão executiva imediata da rede municipal.

### Elementos e Campos do Painel Geral:
1. **Botão `Atualizar Dados` (canto superior direito):** Recarrega instantaneamente os indicadores, gráficos e alertas.
2. **4 Cartões Executivos (KPIs):**
   - **Estudantes Matriculados (Azul):** Total de alunos cadastrados na rede municipal.
   - **Taxa de Participação (Verde):** Percentual de estudantes avaliados no ciclo.
   - **Nota Média Língua Portuguesa (Roxo):** Média municipal na escala de `0,0` a `10,0` comparada à Meta 2026 (`8,0`).
   - **Nota Média Matemática (Âmbar):** Média municipal na escala de `0,0` a `10,0` comparada à Meta 2026 (`8,2`).
3. **Gráfico `Evolução das Notas Médias Municipais (2023 - 2026)`:** Curva histórica comparando Língua Portuguesa e Matemática.
4. **Gráfico `Padrões de Aprendizagem (Ciclo Atual)`:** Proporção de alunos nos níveis *Avançado*, *Adequado*, *Básico* e *Abaixo do Básico*.
5. **Painel `Alertas Pedagógicos Prioritários da Rede`:** Lista automática de avisos gerenciais com **Título**, **Classificação** (`URGENTE`, `ATENÇÃO`, `SUCESSO`), **Descrição** e **Ação Recomendada** para a SME.
6. **Tabela `Unidades da Rede Municipal`:** Resumo das escolas com coluna de *Escola/Bairro*, *Alunos*, *Média LP/MAT* e botão **`Ver Todas`** (que leva à aba *Escolas*).

---

## 4. Aba 2: Cadastros

Centraliza o gerenciamento estrutural da rede municipal em **5 sub-abas**.

### Barra de Ferramentas Comum (presente em todas as sub-abas de Cadastros):
- **Campo `Buscar registros neste cadastro...`:** Pesquisa rápida por texto em qualquer coluna da sub-aba ativa.
- **Seletor `Ordenar:`** Permite classificar por *Código Sequencial*, *Nome / Descrição (A - Z)* ou *Nome / Descrição (Z - A)*.
- **Alternador de Exibição (`Lista` | `Em Cartão`):** Alterna a visualização dos registros entre tabela tradicional ou grade de cartões visuais.
- **Coluna `Ações` (em cada linha/cartão):**
  - **Botão `Editar`:** Abre o modal preenchido com os dados daquele registro para alteração.
  - **Botão `Excluir`:** Remove o registro (requer confirmação e permissão RBAC).

### 4.1. Sub-aba `Usuários` e Modal `Novo Cadastro de Usuário`
- **Filtros Específicos:** *Código*, *Nome*, *CPF*, *Endereço*, *Telefone*, *E-mail* e *Status* (`Ativo` / `Inativo`).
- **Botão Superior `+ Novo Usuário`:** Abre o formulário com os seguintes campos:

| Campo do Modal de Usuário | Obrigatório | Instrução de Preenchimento |
| :--- | :---: | :--- |
| **Código do Usuário (Sequencial)** | Automático | Gerado automaticamente pelo sistema no formato `XXXX` (ex.: `0009`). Somente leitura. |
| **CPF (`XXX.XXX.XXX - XX`)** | Sim | Digite os 11 dígitos do CPF do servidor/profissional. |
| **Nome Completo** | Sim | Nome completo do usuário (ex.: `Maria Pereira Silva`). |
| **Perfil de Acesso / Permissões (RBAC)** | Sim | Escolha entre: `Administrador (SEDUC / TI)`, `Coordenador Pedagógico`, `Diretor / Secretário` ou `Professor / Docente`. |
| **Telefone** | Sim | Telefone/WhatsApp de contato com DDD (ex.: `66 99 9 9876-5432`). |
| **Endereço Completo** | Sim | Logradouro, número, bairro e cidade. |
| **E-mail Institucional** | Sim | E-mail utilizado para login e notificações (ex.: `usuario@aguaboa.mt.gov.br`). |
| **Senha de Acesso ao Sistema** | Sim *(no cadastro)* | Senha de acesso (mínimo de 8 caracteres com letras maiúsculas, minúsculas e números quando a política de senhas fortes estiver ativa). Na edição, deixe em branco caso não queira alterar. |
| **Confirmar Senha** | Sim *(no cadastro)* | Repita exatamente a mesma senha digitada ao lado. |

### 4.2. Sub-aba `Escolas` e Modal `Novo Cadastro de Escola`
- **Filtros Específicos:** *Código*, *Escola* e *Endereço*.
- **Botão Superior `+ Nova Escola`:** Abre o formulário com os seguintes campos:

| Campo do Modal de Escola | Obrigatório | Instrução de Preenchimento |
| :--- | :---: | :--- |
| **Código da Escola (Sequencial)** | Automático | Gerado automaticamente no formato `XXX` (ex.: `010`). |
| **Telefone da Escola** | Sim | Telefone fixo ou celular institucional da secretaria escolar. |
| **Nome da Escola** | Sim | Nome oficial da unidade (ex.: `EMEB Cristalino`). |
| **Endereço (Rua/Av.)** | Sim | Nome da rua, avenida ou rodovia/assentamento. |
| **Número** | Sim | Número predial ou `S/N`. |
| **Bairro** | Sim | Bairro, setor ou comunidade rural/indígena. |
| **Código INEP** | Opcional | Código oficial de 8 dígitos da escola no Censo Escolar/MEC (ex.: `51001299`). |
| **Tipo de Polo / Zona** | Sim | Selecione: `Urbana`, `Polo do Campo (Rural)` ou `Polo Indígena`. |

### 4.3. Sub-aba `Turmas` e Modal `Cadastro de Turma Escolar`
- **Filtros Específicos:** *Escola*, *Período*, *Modalidade*, *Etapa*, *Turno* (`Matutino`, `Vespertino`, `Integral`) e *Sala*.
- **Botão Superior `+ Nova Turma`:** Abre o formulário com os seguintes campos:

| Campo do Modal de Turma | Obrigatório | Instrução de Preenchimento |
| :--- | :---: | :--- |
| **Código da Escola (`XXX`)** | Sim | Selecione a escola na lista; o campo **Nome da Escola** ao lado será preenchido automaticamente. |
| **Nome da Escola** | Automático | Preenchido automaticamente conforme o código selecionado. |
| **Período Letivo** | Sim | Ano e regime letivo (padrão: `2026 - Anual`). |
| **Modalidade** | Sim | Escolha entre: `Ensino Fundamental Regular`, `Educação Infantil`, `Educação do Campo`, `Educação Escolar Indígena` ou `Educação de Jovens e Adultos (EJA)`. |
| **Etapa** | Sim | Etapa de ensino (ex.: `Anos Iniciais (1º ao 5º)` ou `Anos Finais (6º ao 9º)`). |
| **Identificação da Turma** | Sim | Nome da turma (ex.: `5º Ano A`). |
| **Turno** | Sim | Selecione `Matutino`, `Vespertino` ou `Integral`. |

### 4.4. Sub-aba `Alunos` e Modal `Novo Cadastro de Aluno`
- **Filtros Específicos:** *Escola*, *Turma*, *Sala* e *Turno*.
- **Botão Superior `+ Novo Aluno`:** Abre o formulário com os seguintes campos:

| Campo do Modal de Aluno | Obrigatório | Instrução de Preenchimento |
| :--- | :---: | :--- |
| **Código da Escola** | Sim | Selecione a escola onde o estudante está matriculado. |
| **Nome da Escola** | Automático | Exibido automaticamente ao escolher o Código da Escola. |
| **Código do Aluno (Sequencial)** | Automático | Gerado automaticamente no formato `XXXX` (ex.: `0045`). |
| **Código INEP do Estudante** | Sim | Identificador único do aluno no Censo Escolar/INEP. |
| **Nome Completo do Aluno** | Sim | Nome civil completo do estudante. |
| **Nome do Responsável** | Sim | Nome da mãe, pai ou responsável legal. |
| **Telefone do Responsável** | Sim | Telefone celular/WhatsApp do responsável para contato escolar. |
| **Endereço Residencial do Aluno** | Sim | Rua, número e bairro/comunidade de residência do estudante. |
| **Turma** | Sim | Escolha a turma pertencente à escola selecionada. |
| **Sala** | Sim | Preenchida automaticamente ao escolher a turma (ou editável, ex.: `Sala 04`). |
| **Turno** | Sim | `Matutino`, `Vespertino` ou `Integral`. |

### 4.5. Sub-aba `Matriz Curricular` e Modal `Nova Disciplina / Matriz Curricular`
- **Botão Superior `+ Nova Disciplina`:** Vincula componentes curriculares às turmas de cada escola.

| Campo do Modal de Matriz Curricular | Obrigatório | Instrução de Preenchimento |
| :--- | :---: | :--- |
| **Código da Escola (`XXX`)** | Automático | Preenchido automaticamente ao selecionar o Nome da Escola. |
| **Nome da Escola** | Sim | Selecione a unidade escolar. |
| **Turma** | Sim | Selecione a turma vinculada à escola escolhida. |
| **Sala** | Sim | Sala de aula da turma (ex.: `Sala 04`). |
| **Turno** | Sim | `Matutino`, `Vespertino` ou `Integral`. |
| **Nome da Disciplina** | Sim | Nome do componente curricular (ex.: `Língua Portuguesa`, `Matemática`, `Ciências`). |

---

## 5. Aba 3: Escolas

Diretório visual e gerencial das unidades escolares da rede municipal de Água Boa - MT.

### Controles e Campos da Tela de Escolas:
- **Botão `Cadastrar Escola`:** Abre diretamente o modal de cadastro de nova unidade escolar.
- **Campo `Buscar por nome da escola ou bairro...`:** Filtra em tempo real conforme você digita.
- **Seletor `Todas as Zonas`:** Filtra entre `Zona Urbana`, `Polo do Campo (Rural)` e `Polo Indígena`.
- **Seletor `Ordenar:`** Permite classificar por *Código Sequencial*, *Nome da Escola (A - Z)*, *Maior Nº de Alunos* ou *Maior Nota Média*.
- **Alternador `Lista` | `Em Cartão`:** No modo **Em Cartão**, cada escola exibe seu código, zona, endereço, INEP, quantidade de alunos, taxa de participação, barras de progresso de **Língua Portuguesa** e **Matemática**, além dos botões **`Ver Alunos`**, **`Editar`** e **`Excluir`**.

---

## 6. Aba 4: Estudantes e Boletim Pedagógico Individual

Permite consultar o desempenho individual de cada aluno, filtrar estudantes que precisam de intervenção pedagógica e emitir o **Boletim Diagnóstico Individual**.

### 6.1. Filtros e Controles da Tela de Estudantes:
- **Botão `Novo Aluno`:** Abre o modal para matricular um novo estudante.
- **Busca nominal:** Pesquise por *Nome do Aluno*, *Código do Aluno* ou *Turma*.
- **Seletor `Ordenar:`** *Código*, *Nome do Aluno (A - Z)*, *Maior Média Geral* ou *Menor Média Geral*.
- **5 Filtros Combináveis:** *Escola*, *Turma*, *Sala*, *Turno* e *Nível de Aprendizagem* (*Avançado*, *Adequado*, *Básico*, *Abaixo do Básico*).

### 6.2. Como usar o Modal `Boletim Diagnóstico Individual do Estudante`:
Ao clicar em **`Boletim`** na linha de um estudante:
1. Você visualiza os dados completos do aluno, suas notas de **Língua Portuguesa** e **Matemática**, sua **Média Geral**, seu **Nível de Aprendizagem**, a matriz de **Habilidades BNCC Avaliadas** e o **Parecer Pedagógico**.
2. **Botão `Editar Habilidades BNCC / Parecer`:** Habilita a edição direta das notas, frequência, parecer pedagógico e status de cada habilidade BNCC do estudante, salvando tudo através do botão **`Salvar Alterações do Boletim`**.
3. **Botão `Imprimir Boletim`:** Gera a versão formatada para impressão ou salvamento em PDF para entrega aos pais/responsáveis.

---

## 7. Aba 5: Inserir Notas

Módulo dedicado ao lançamento rápido de notas pelos professores, coordenadores e secretários escolares.

### Passo a Passo para Lançar Notas:
1. **1. Unidade Escolar (`*`):** Selecione primeiro a escola desejada.
2. **2. Turma (`*`):** Escolha a turma pertencente à escola selecionada.
3. **3. Disciplina (`*`):** Escolha **Todas as Disciplinas**, **Língua Portuguesa (LP)** ou **Matemática (MAT)**.
4. **4. Ano Letivo (`*`):** Selecione o ciclo letivo (`2026 (Atual)`, `2025` ou `2024`).
5. **5. Buscar Aluno (Opcional):** Digite parte do nome, código ou INEP para localizar rapidamente um aluno na turma.

### Duas Formas de Digitar e Salvar as Notas (Escala `0,0` a `10,0`):
- **Forma 1 — Digitação Direta na Tabela (Rápida):**
  - Digite a nota diretamente nas caixas das colunas **Português LP (0 a 10)** e **Matemática MAT (0 a 10)** (ex.: `7,5` ou `8.0`).
  - Clique no botão **`Salvar`** na linha do aluno para gravar individualmente, **OU** clique no botão superior **`Salvar Todas as Notas da Turma`** para gravar todas as notas da turma de uma só vez.
- **Forma 2 — Edição Detalhada via Modal (Botão `Editar`):**
  - Clique no botão **`Editar`** na linha do aluno para abrir o modal **Lançamento e Edição de Notas do Estudante**, onde além das notas você também pode preencher o campo **Observação Pedagógica / Parecer (Opcional)** e clicar em **`Salvar Nota`**.

---

## 8. Aba 6: BI & Relatórios

Centro de inteligência analítica (Business Intelligence) para acompanhamento de metas municipais, IDEB e recortes pedagógicos.

### 8.1. Parâmetros e Filtros do Relatório:
Combine qualquer um dos 5 filtros (*1. Unidade Escolar*, *2. Turma / Ano*, *3. Disciplina*, *4. Nível de Aprendizagem* e *5. Buscar Estudante*) para atualizar simultaneamente os cartões, os gráficos e a tabela analítica.

### 8.2. Botões de Exportação e Impressão:
- **`Limpar Filtros`:** Restaura todos os seletores para a visão geral do município.
- **`Exportar Excel (CSV)` / `Exportar Microdados (CSV)`:** Gera uma planilha `.csv` contendo os dados filtrados na tela (ou a base completa da rede) pronta para abrir no Microsoft Excel.
- **`Imprimir Relatório` / `Imprimir Relatório Executivo`:** Abre a visualização de impressão oficial para geração de PDF gerencial.

---

## 9. Aba 7: Configurações

Exclusiva para o perfil **Administrador (SEDUC / TI)**, reúne a governança pedagógica, segurança LGPD, módulos ativos e ferramentas técnicas em **4 sub-abas**:

1. **`Média Geral & Níveis de Aprendizagem`:** Define a **Média Geral de Aprovação da Rede** (padrão `6,0`) e os intervalos de notas de cada nível (*Avançado*: `8,0` a `10,0`; *Adequado*: `7,0` a `7,9`; *Básico*: `6,0` a `6,9`; *Abaixo do Básico*: `0,0` a `5,9`).
2. **`Seguranças & Acessos`:** Controla as 6 políticas de segurança (*2FA*, *Política de Senhas Fortes*, *Bloqueio por Tentativas Incorretas*, *Trilha de Auditoria*, *Mascaramento de CPF / LGPD* e *Backup Automático Diário*) e exibe a tabela da **Trilha de Auditoria e Logs de Acesso LGPD**.
3. **`Habilitar e Desabilitar Funcionalidades`:** Permite ativar ou desativar módulos da plataforma em tempo real.
4. **`Sincronização, Exportação & OpenAPI`:**
   - **1. Status e Sincronização da Rede (`Rede Sincronizada ↻` / `Sincronizar Agora ↻`):** Recarrega todos os módulos e dados sem encerrar a sessão.
   - **2. Exportação Consolidada (`Exportar CSV`):** Baixa a planilha oficial consolidada da rede municipal.
   - **3. Especificação Técnica (`OpenAPI`):** Abre a documentação interativa Swagger (`/docs`).

