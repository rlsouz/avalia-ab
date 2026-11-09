// ==========================================
// AVALIA AB - Plataforma de Avaliação Educacional
// Município de Água Boa - MT • Orquestrador e Inicializador SPA
// ==========================================

async function carregarModulosAutenticados() {
  if (typeof aplicarPermissoesPerfilUI === 'function') {
    aplicarPermissoesPerfilUI(perfilAtivoRBAC);
  }
  if (typeof carregarTodasMetricas === 'function') carregarTodasMetricas();
  if (typeof carregarAvaliacoes === 'function') carregarAvaliacoes();
  if (typeof carregarDadosCadastros === 'function') carregarDadosCadastros();
  if (typeof carregarConfiguracoes === 'function') carregarConfiguracoes();
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Carrega todas as views e modais sob demanda com cache de memória
  if (typeof ComponentLoader !== 'undefined') {
    await ComponentLoader.initAll();
  }

  // 2. Verifica sessão criptográfica ativa antes de liberar o painel e carregar dados da API
  if (typeof inicializarSessaoUsuario === 'function') {
    const autenticado = await inicializarSessaoUsuario();
    if (autenticado) {
      await carregarModulosAutenticados();
    }
  }

  // 3. Otimização de Performance: Debounce automático para campos de busca rápida
  const inputBuscaCad = document.getElementById('busca-cadastros');
  if (inputBuscaCad && typeof debounce === 'function') {
    inputBuscaCad.removeAttribute('oninput');
    inputBuscaCad.addEventListener('input', debounce((e) => {
      if (typeof filtrarCadastrosGenerico === 'function') filtrarCadastrosGenerico(e.target.value);
    }, 200));
  }

  const inputBuscaEstudante = document.getElementById('busca-estudante');
  if (inputBuscaEstudante && typeof debounce === 'function') {
    inputBuscaEstudante.removeAttribute('onkeyup');
    inputBuscaEstudante.addEventListener('input', debounce((e) => {
      if (typeof filtrarAlunosTabela === 'function') filtrarAlunosTabela(e.target.value);
    }, 200));
  }

  const inputBuscaNotas = document.getElementById('notas-busca-aluno');
  if (inputBuscaNotas && typeof debounce === 'function') {
    inputBuscaNotas.removeAttribute('oninput');
    inputBuscaNotas.addEventListener('input', debounce((e) => {
      if (typeof filtrarTabelaNotasAlunos === 'function') filtrarTabelaNotasAlunos(e.target.value);
    }, 200));
  }
});

// Função Global de Atualização Completa da Plataforma e seus Componentes
async function atualizarTodaPlataforma() {
  try {
    mostrarToast("Atualizando módulos, visualizações e dados da plataforma...");
    
    const activeScreenBtn = document.querySelector('.nav-tab-btn.active');
    const telaAnterior = activeScreenBtn ? activeScreenBtn.getAttribute('data-screen') : 'dashboard';
    const subCfgAnterior = typeof subAbaConfigAtual !== 'undefined' ? subAbaConfigAtual : 'media-niveis';

    // 1. Limpa o cache interno do ComponentLoader e recarrega views e modais
    if (typeof ComponentLoader !== 'undefined') {
      ComponentLoader.cache.clear();
      await ComponentLoader.initAll();
    }

    // 2. Re-aplica perfis e permissões RBAC
    if (typeof aplicarPermissoesPerfilUI === 'function') {
      aplicarPermissoesPerfilUI(perfilAtivoRBAC);
    }

    // 3. Restaura a tela e sub-aba onde o usuário estava
    if (typeof trocarTela === 'function' && telaAnterior) {
      trocarTela(telaAnterior);
      if (telaAnterior === 'configuracoes' && typeof trocarSubAbaConfig === 'function') {
        trocarSubAbaConfig(subCfgAnterior);
      }
    }

    // 4. Recarrega dados de todos os módulos
    await Promise.all([
      typeof carregarTodasMetricas === 'function' ? carregarTodasMetricas() : Promise.resolve(),
      typeof carregarAvaliacoes === 'function' ? carregarAvaliacoes() : Promise.resolve(),
      typeof carregarDadosCadastros === 'function' ? carregarDadosCadastros() : Promise.resolve(),
      typeof carregarConfiguracoes === 'function' ? carregarConfiguracoes() : Promise.resolve()
    ]);

    mostrarToast("Plataforma e componentes atualizados com sucesso!");
  } catch (err) {
    console.error("Erro ao atualizar plataforma:", err);
    mostrarToast("Erro ao sincronizar componentes", "erro");
  }
}
