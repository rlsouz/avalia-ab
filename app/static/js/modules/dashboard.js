// --- 4. PAINEL GERAL (DASHBOARD) ---
async function carregarTodasMetricas() {
  try {
    const res = await fetch('/api/v1/dashboard/resumo');
    if (!res.ok) throw new Error("Falha ao consultar API de telemetria");
    const data = await res.json();

    const kpiAlunos = document.getElementById('kpi-alunos');
    const kpiPart = document.getElementById('kpi-participacao');
    const kpiPartSub = document.getElementById('kpi-participacao-sub');
    const kpiLp = document.getElementById('kpi-lp');
    const kpiMat = document.getElementById('kpi-mat');

    const totalEstudantes = Number(data.kpis.total_estudantes) || 0;
    if (kpiAlunos) kpiAlunos.textContent = totalEstudantes.toLocaleString('pt-BR');
    
    if (kpiPart) {
      if (totalEstudantes === 0) {
        kpiPart.textContent = "0.0%";
        if (kpiPartSub) kpiPartSub.innerHTML = '<span class="trend-up">●</span> Sem alunos avaliados no ciclo';
      } else {
        kpiPart.textContent = data.kpis.taxa_participacao || "0.0%";
        const valNum = parseFloat(data.kpis.taxa_participacao) || 0;
        if (valNum >= 90) {
          kpiPartSub.innerHTML = '<span class="trend-up">+2.4%</span> Acima da meta do Compromisso Criança Alfabetizada';
        } else {
          kpiPartSub.innerHTML = '<span class="trend-up">●</span> Meta municipal: 90.0%';
        }
      }
    }
    if (kpiLp) kpiLp.textContent = formatarNota(data.kpis.nota_media_lp ?? data.kpis.proficiencia_media_lp);
    if (kpiMat) kpiMat.textContent = formatarNota(data.kpis.nota_media_mat ?? data.kpis.proficiencia_media_mat);

    const containerAlertas = document.getElementById('lista-alertas-pedagogicos');
    if (containerAlertas && data.alertas_pedagogicos) {
      containerAlertas.innerHTML = '';
      data.alertas_pedagogicos.forEach(a => {
        const item = document.createElement('div');
        item.className = `alert-item ${a.tipo}`;
        item.innerHTML = `
          <div class="alert-item-header">
            <span>${a.titulo}</span>
            <span class="badge-status ${a.tipo === 'urgente' ? 'intervencao' : a.tipo === 'sucesso' ? 'concluida' : 'agendada'}">${a.tipo.toUpperCase()}</span>
          </div>
          <div class="alert-item-desc">${a.descricao}</div>
          <div class="alert-item-action">Ação Recomendada: ${a.acao}</div>
        `;
        containerAlertas.appendChild(item);
      });
    }

    const tbodyEscolas = document.getElementById('tabela-resumo-escolas');
    if (tbodyEscolas && data.top_escolas) {
      tbodyEscolas.innerHTML = '';
      data.top_escolas.forEach(esc => {
        const tr = document.createElement('tr');
        const notaLp = (esc.nota_media_lp !== undefined) ? esc.nota_media_lp : esc.proficiencia_lp;
        const notaMat = (esc.nota_media_mat !== undefined) ? esc.nota_media_mat : esc.proficiencia_mat;
        const media = (notaLp + notaMat) / 2;
        tr.innerHTML = `
          <td><strong>${esc.nome}</strong><br><small style="color: var(--text-dim);">${esc.bairro}</small></td>
          <td>${esc.total_alunos}</td>
          <td><strong style="color: var(--gov-primary);">${formatarNota(media)}</strong></td>
        `;
        tbodyEscolas.appendChild(tr);
      });
    }

    await renderizarGraficosDashboard();
    mostrarToast("Dados de Água Boa atualizados com sucesso!");
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}

async function renderizarGraficosDashboard() {
  const resEvolucao = await fetch('/api/v1/relatorios/evolucao-historica');
  if (resEvolucao.ok) {
    const histData = await resEvolucao.json();
    const ctxHist = document.getElementById('chartEvolucaoHistorica');
    if (ctxHist) {
      if (chartHistorico) chartHistorico.destroy();
      chartHistorico = new Chart(ctxHist, {
        type: 'line',
        data: {
          labels: histData.ciclos,
          datasets: [
            {
              label: 'Língua Portuguesa',
              data: histData.lingua_portuguesa,
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.08)',
              tension: 0.3,
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#0284c7',
              pointRadius: 4
            },
            {
              label: 'Matemática',
              data: histData.matematica,
              borderColor: '#059669',
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              tension: 0.3,
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: '#059669',
              pointRadius: 4
            },
            {
              label: 'Meta Municipal Água Boa',
              data: histData.meta_agua_boa,
              borderColor: '#d97706',
              borderDash: [6, 6],
              tension: 0.2,
              borderWidth: 2,
              pointRadius: 0,
              fill: false
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
            y: { min: 0, max: 10, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } }
          }
        }
      });
    }
  }

  const resNiveis = await fetch('/api/v1/relatorios/distribuicao-niveis');
  if (resNiveis.ok) {
    const nivData = await resNiveis.json();
    const ctxNiv = document.getElementById('chartDistribuicaoNiveis');
    if (ctxNiv) {
      if (chartNiveis) chartNiveis.destroy();
      chartNiveis = new Chart(ctxNiv, {
        type: 'doughnut',
        data: {
          labels: nivData.rotulos,
          datasets: [{
            data: nivData.lingua_portuguesa,
            backgroundColor: ['#e11d48', '#d97706', '#059669', '#0284c7'],
            borderColor: '#ffffff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#475569', font: { family: 'Outfit', size: 12, weight: '600' } } }
          },
          cutout: '68%'
        }
      });
    }
  }
}

