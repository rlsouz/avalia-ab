// --- 8. BI & RELATÓRIOS PARAMETRIZADOS ---
let listaAlunosRelatoriosGlobal = [];
let listaEscolasRelatoriosGlobal = [];

async function inicializarModuloRelatorios() {
  try {
    const [resAlunos, resEscolas] = await Promise.all([
      fetch('/api/v1/alunos'),
      fetch('/api/v1/escolas')
    ]);
    if (resAlunos.ok) listaAlunosRelatoriosGlobal = await resAlunos.json();
    if (resEscolas.ok) listaEscolasRelatoriosGlobal = await resEscolas.json();

    popularFiltrosRelatorios();
    filtrarDadosRelatorios();
  } catch (err) {
    console.error("Erro ao inicializar dados de relatórios:", err);
  }
}

function popularFiltrosRelatorios() {
  const selEscola = document.getElementById('rel-filtro-escola');
  if (selEscola) {
    const atual = selEscola.value;
    const escolas = [...new Set(listaAlunosRelatoriosGlobal.map(a => a.nome_escola).concat(listaEscolasRelatoriosGlobal.map(e => e.nome)))].filter(Boolean);
    let opt = '<option value="todos">Todas as Escolas</option>';
    escolas.forEach(esc => {
      opt += `<option value="${esc}" ${esc === atual ? 'selected' : ''}>${esc}</option>`;
    });
    selEscola.innerHTML = opt;
  }
  atualizarFiltroTurmasRelatorio();
}

function aoMudarFiltroEscolaRelatorio(escola) {
  atualizarFiltroTurmasRelatorio();
  filtrarDadosRelatorios();
}

function atualizarFiltroTurmasRelatorio() {
  const selEscola = document.getElementById('rel-filtro-escola');
  const selTurma = document.getElementById('rel-filtro-turma');
  if (!selTurma) return;

  const escolaSel = selEscola ? selEscola.value : 'todos';
  let base = listaAlunosRelatoriosGlobal;
  if (escolaSel && escolaSel !== 'todos') {
    base = base.filter(a => a.nome_escola.toLowerCase() === escolaSel.toLowerCase());
  }

  const turmaAtual = selTurma.value;
  const turmas = [...new Set(base.map(a => a.turma))].filter(Boolean);
  let opt = '<option value="todos">Todas as Turmas</option>';
  turmas.forEach(t => {
    opt += `<option value="${t}" ${t === turmaAtual ? 'selected' : ''}>${t}</option>`;
  });
  selTurma.innerHTML = opt;
}

function limparFiltrosRelatorios() {
  const selEscola = document.getElementById('rel-filtro-escola');
  const selTurma = document.getElementById('rel-filtro-turma');
  const selDisc = document.getElementById('rel-filtro-disciplina');
  const selNivel = document.getElementById('rel-filtro-nivel');
  const inputBusca = document.getElementById('rel-busca-aluno');

  if (selEscola) selEscola.value = 'todos';
  if (selTurma) selTurma.value = 'todos';
  if (selDisc) selDisc.value = 'todas';
  if (selNivel) selNivel.value = 'todos';
  if (inputBusca) inputBusca.value = '';

  atualizarFiltroTurmasRelatorio();
  filtrarDadosRelatorios();
  mostrarToast("Filtros do relatório redefinidos.");
}

function filtrarDadosRelatorios() {
  const escola = document.getElementById('rel-filtro-escola')?.value || 'todos';
  const turma = document.getElementById('rel-filtro-turma')?.value || 'todos';
  const disciplina = document.getElementById('rel-filtro-disciplina')?.value || 'todas';
  const nivel = document.getElementById('rel-filtro-nivel')?.value || 'todos';
  const busca = (document.getElementById('rel-busca-aluno')?.value || '').toLowerCase().trim();

  let filtrados = listaAlunosRelatoriosGlobal.filter(a => {
    const matchEscola = escola === 'todos' || a.nome_escola.toLowerCase() === escola.toLowerCase();
    const matchTurma = turma === 'todos' || a.turma.toLowerCase() === turma.toLowerCase();
    const matchNivel = nivel === 'todos' || a.nivel_lp === nivel || a.nivel_mat === nivel;
    const matchBusca = !busca || a.nome.toLowerCase().includes(busca) || a.codigo_aluno.includes(busca) || (a.codigo_inep && a.codigo_inep.includes(busca));
    return matchEscola && matchTurma && matchNivel && matchBusca;
  });

  atualizarKPISRecorte(filtrados, escola, turma);
  renderizarTabelaAnaliticaRelatorio(filtrados, disciplina);
  atualizarGraficosParametrizados(filtrados, escola, turma, disciplina);
}

function atualizarKPISRecorte(alunos, escola, turma) {
  const kpiTotal = document.getElementById('rel-kpi-total-alunos');
  const kpiSub = document.getElementById('rel-kpi-sub-escola');
  const kpiLp = document.getElementById('rel-kpi-media-lp');
  const kpiMat = document.getElementById('rel-kpi-media-mat');
  const kpiAbaixo = document.getElementById('rel-kpi-abaixo-basico');

  const total = alunos.length;
  if (kpiTotal) kpiTotal.textContent = total.toLocaleString('pt-BR');
  if (kpiSub) {
    if (escola !== 'todos' && turma !== 'todos') kpiSub.textContent = `${escola} • ${turma}`;
    else if (escola !== 'todos') kpiSub.textContent = escola;
    else kpiSub.textContent = 'Média Geral da Rede';
  }

  if (total === 0) {
    if (kpiLp) kpiLp.textContent = '0,0';
    if (kpiMat) kpiMat.textContent = '0,0';
    if (kpiAbaixo) kpiAbaixo.textContent = '0%';
    return;
  }

  const somaLp = alunos.reduce((acc, a) => acc + (a.nota_lp !== undefined && a.nota_lp !== null ? Number(a.nota_lp) : 0.0), 0);
  const somaMat = alunos.reduce((acc, a) => acc + (a.nota_mat !== undefined && a.nota_mat !== null ? Number(a.nota_mat) : 0.0), 0);
  const mediaLp = somaLp / total;
  const mediaMat = somaMat / total;

  const totalAbaixo = alunos.filter(a => a.nivel_lp === 'Abaixo do Básico' || a.nivel_mat === 'Abaixo do Básico').length;
  const percAbaixo = (totalAbaixo / total) * 100;

  if (kpiLp) kpiLp.textContent = formatarNota(mediaLp);
  if (kpiMat) kpiMat.textContent = formatarNota(mediaMat);
  if (kpiAbaixo) kpiAbaixo.textContent = percAbaixo.toFixed(1).replace('.', ',') + '%';
}

function renderizarTabelaAnaliticaRelatorio(alunos, disciplina) {
  const tbody = document.getElementById('tbody-relatorios-analitica');
  const badge = document.getElementById('rel-total-tabela-badge');
  if (badge) badge.textContent = `${alunos.length} Estudantes`;

  if (!tbody) return;

  if (alunos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Nenhum estudante encontrado para os parâmetros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = alunos.map(a => {
    const notaLp = (a.nota_lp !== undefined && a.nota_lp !== null) ? Number(a.nota_lp) : 0.0;
    const notaMat = (a.nota_mat !== undefined && a.nota_mat !== null) ? Number(a.nota_mat) : 0.0;
    const mediaGeral = (notaLp + notaMat) / 2;

    return `
      <tr>
        <td><code>${a.codigo_aluno}</code></td>
        <td><strong>${a.nome}</strong></td>
        <td>${a.nome_escola}</td>
        <td><span class="badge-tag primary">${a.turma}</span></td>
        <td style="text-align: center;"><strong style="color: var(--gov-primary);">${formatarNota(notaLp)}</strong></td>
        <td style="text-align: center;"><span class="badge-status ${obterClasseNivel(a.nivel_lp)}">${a.nivel_lp}</span></td>
        <td style="text-align: center;"><strong style="color: var(--color-success);">${formatarNota(notaMat)}</strong></td>
        <td style="text-align: center;"><span class="badge-status ${obterClasseNivel(a.nivel_mat)}">${a.nivel_mat}</span></td>
        <td style="text-align: center;"><strong style="color: #d97706;">${formatarNota(mediaGeral)}</strong></td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="abrirBoletimEstudante(${a.id})">
            Boletim
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function atualizarGraficosParametrizados(alunos, escola, turma, disciplina) {
  const ctxEsc = document.getElementById('chartComparativoEscolas');
  const tituloGrafico = document.getElementById('rel-titulo-grafico-escolas');

  if (ctxEsc) {
    let labels = [];
    let dataLp = [];
    let dataMat = [];

    if (escola === 'todos') {
      if (tituloGrafico) tituloGrafico.textContent = 'Comparativo de Notas Médias (0 a 10) por Unidade Escolar';
      // Agrupar por escola
      const escolasUnicas = [...new Set(alunos.map(a => a.nome_escola))];
      labels = escolasUnicas.map(e => e.replace('EMEB ', ''));
      escolasUnicas.forEach(esc => {
        const doEscola = alunos.filter(a => a.nome_escola === esc);
        const medLp = doEscola.reduce((s, a) => s + (a.nota_lp || 8.0), 0) / (doEscola.length || 1);
        const medMat = doEscola.reduce((s, a) => s + (a.nota_mat || 8.0), 0) / (doEscola.length || 1);
        dataLp.push(parseFloat(medLp.toFixed(1)));
        dataMat.push(parseFloat(medMat.toFixed(1)));
      });
    } else {
      if (tituloGrafico) tituloGrafico.textContent = `Desempenho por Turma: ${escola}`;
      // Agrupar por turma da escola
      const turmasUnicas = [...new Set(alunos.map(a => a.turma))];
      labels = turmasUnicas;
      turmasUnicas.forEach(t => {
        const doTurma = alunos.filter(a => a.turma === t);
        const medLp = doTurma.reduce((s, a) => s + (a.nota_lp || 8.0), 0) / (doTurma.length || 1);
        const medMat = doTurma.reduce((s, a) => s + (a.nota_mat || 8.0), 0) / (doTurma.length || 1);
        dataLp.push(parseFloat(medLp.toFixed(1)));
        dataMat.push(parseFloat(medMat.toFixed(1)));
      });
    }

    const datasets = [];
    if (disciplina === 'todas' || disciplina === 'Língua Portuguesa') {
      datasets.push({
        label: 'Nota Língua Portuguesa (0 a 10)',
        data: dataLp,
        backgroundColor: '#0284c7',
        borderRadius: 4
      });
    }
    if (disciplina === 'todas' || disciplina === 'Matemática') {
      datasets.push({
        label: 'Nota Matemática (0 a 10)',
        data: dataMat,
        backgroundColor: '#059669',
        borderRadius: 4
      });
    }

    if (chartEscolas) chartEscolas.destroy();
    chartEscolas = new Chart(ctxEsc, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#475569', font: { family: 'Outfit', size: 12, weight: '600' } } },
          tooltip: {
            callbacks: {
              label: function(context) { return ` ${context.dataset.label}: ${formatarNota(context.parsed.y)}`; }
            }
          }
        },
        scales: {
          x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
          y: { 
            min: 0, 
            max: 10, 
            grid: { color: '#e2e8f0' }, 
            ticks: { color: '#64748b', callback: v => formatarNota(v) } 
          }
        }
      }
    });
  }

  // Atualizar Gráfico de Metas com o recorte filtrado
  const ctxMetas = document.getElementById('chartMetasComparativo');
  if (ctxMetas) {
    const total = alunos.length || 1;
    const nAbaixo = alunos.filter(a => a.nivel_lp === 'Abaixo do Básico' || a.nivel_mat === 'Abaixo do Básico').length;
    const nBasico = alunos.filter(a => a.nivel_lp === 'Básico' || a.nivel_mat === 'Básico').length;
    const nAdequado = alunos.filter(a => a.nivel_lp === 'Adequado' || a.nivel_mat === 'Adequado').length;
    const nAvancado = alunos.filter(a => a.nivel_lp === 'Avançado' || a.nivel_mat === 'Avançado').length;

    const realPercs = [
      parseFloat(((nAbaixo / total) * 100).toFixed(1)),
      parseFloat(((nBasico / total) * 100).toFixed(1)),
      parseFloat(((nAdequado / total) * 100).toFixed(1)),
      parseFloat(((nAvancado / total) * 100).toFixed(1))
    ];

    if (chartMetas) chartMetas.destroy();
    chartMetas = new Chart(ctxMetas, {
      type: 'bar',
      data: {
        labels: ["Abaixo do Básico", "Básico", "Adequado", "Avançado"],
        datasets: [
          {
            label: 'Recorte Selecionado (%)',
            data: realPercs,
            backgroundColor: '#0284c7',
            borderRadius: 4
          },
          {
            label: 'Meta Municipal 2026 (%)',
            data: [8.0, 18.0, 52.0, 22.0],
            backgroundColor: '#d97706',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#475569', font: { family: 'Outfit', size: 12, weight: '600' } } }
        },
        scales: {
          x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
          y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', callback: v => v + '%' } }
        }
      }
    });
  }
}

function exportarRelatorioFiltradoCSV() {
  const escola = encodeURIComponent(document.getElementById('rel-filtro-escola')?.value || 'todos');
  const turma = encodeURIComponent(document.getElementById('rel-filtro-turma')?.value || 'todos');
  const disciplina = encodeURIComponent(document.getElementById('rel-filtro-disciplina')?.value || 'todas');
  const nivel = encodeURIComponent(document.getElementById('rel-filtro-nivel')?.value || 'todos');

  const url = `/api/v1/exportar/csv?escola=${escola}&turma=${turma}&disciplina=${disciplina}&nivel=${nivel}`;
  window.location.href = url;
}

function imprimirRelatorioFiltrado() {
  window.print();
}

function imprimirRelatorioBI() {
  window.print();
}

