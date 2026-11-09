// ==========================================
// AVALIA AB - Loader de Componentes SPA
// Carrega telas e modais de forma modular e performática com cache em memória
// ==========================================

const ComponentLoader = {
  cache: new Map(),

  async loadComponent(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Falha ao carregar componente: ${url} (${response.status})`);
      }
      const html = await response.text();
      this.cache.set(url, html);
      return html;
    } catch (err) {
      console.error("Erro no ComponentLoader:", err);
      return "";
    }
  },

  async initAll() {
    const mainContainer = document.querySelector('.main-container');
    const modalsContainer = document.getElementById('modals-container');

    const vParam = '?v=' + Date.now();
    const views = [
      '/static/views/dashboard.html' + vParam,
      '/static/views/cadastros.html' + vParam,
      '/static/views/avaliacoes.html' + vParam,
      '/static/views/escolas.html' + vParam,
      '/static/views/alunos.html' + vParam,
      '/static/views/relatorios.html' + vParam,
      '/static/views/configuracoes.html' + vParam,
      '/static/views/notas.html' + vParam
    ];

    const modals = [
      '/static/modals/modal-cad-usuario.html' + vParam,
      '/static/modals/modal-cad-escola.html' + vParam,
      '/static/modals/modal-cad-aluno.html' + vParam,
      '/static/modals/modal-cad-turma.html' + vParam,
      '/static/modals/modal-cad-matriz.html' + vParam,
      '/static/modals/modal-nova-avaliacao.html' + vParam,
      '/static/modals/modal-boletim-aluno.html' + vParam,
      '/static/modals/modal-editar-nota-aluno.html' + vParam
    ];

    // Carregamento paralelo em lote de altíssima velocidade
    const [viewsHtml, modalsHtml] = await Promise.all([
      Promise.all(views.map(url => this.loadComponent(url))),
      Promise.all(modals.map(url => this.loadComponent(url)))
    ]);

    if (mainContainer) {
      mainContainer.innerHTML = viewsHtml.join('\n');
    }

    if (modalsContainer) {
      modalsContainer.innerHTML = modalsHtml.join('\n');
    }
  }
};
