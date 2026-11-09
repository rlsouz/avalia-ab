// --- 5. AVALIAÇÕES ---
async function carregarAvaliacoes() {
  try {
    const res = await fetch('/api/v1/avaliacoes');
    if (!res.ok) throw new Error("Erro ao buscar avaliações");
    listaAvaliacoesGlobal = await res.json();
    filtrarAvaliacoes();
  } catch (err) { console.error(err); }
}

function alternarModoExibicaoAvaliacoes(modo) {
  modoExibicaoAvaliacoes = modo;
  document.getElementById('btn-view-ava-lista')?.classList.toggle('active', modo === 'lista');
  document.getElementById('btn-view-ava-cards')?.classList.toggle('active', modo === 'cartoes');

  const listaEl = document.getElementById('view-avaliacoes-lista');
  const cardsEl = document.getElementById('view-avaliacoes-cartoes');
  if (listaEl && cardsEl) {
    if (modo === 'lista') {
      listaEl.style.display = 'block';
      cardsEl.style.display = 'none';
    } else {
      listaEl.style.display = 'none';
      cardsEl.style.display = 'grid';
    }
  }
}

function filtrarAvaliacoes() {
  const busca = (document.getElementById('busca-avaliacoes')?.value || '').toLowerCase().trim();
  const comp = document.getElementById('filtro-comp-avaliacoes')?.value || 'todos';
  const stat = document.getElementById('filtro-status-avaliacoes')?.value || 'todos';
  const ordem = document.getElementById('ordem-avaliacoes')?.value || 'padrao';

  let filtrados = listaAvaliacoesGlobal.filter(a => {
    const matchBusca = !busca || a.titulo.toLowerCase().includes(busca) || a.codigo.toLowerCase().includes(busca) || a.ano_escolar.toLowerCase().includes(busca);
    const matchComp = comp === 'todos' || a.componente === comp;
    const matchStat = stat === 'todos' || a.status === stat;
    return matchBusca && matchComp && matchStat;
  });

  if (ordem === 'titulo-asc') {
    filtrados.sort((a, b) => a.titulo.localeCompare(b.titulo));
  } else if (ordem === 'participacao-desc') {
    filtrados.sort((a, b) => parseFloat(b.taxa_participacao) - parseFloat(a.taxa_participacao));
  } else if (ordem === 'media-desc') {
    filtrados.sort((a, b) => b.proficiencia_media - a.proficiencia_media);
  }

  renderizarTabelaAvaliacoes(filtrados);
}

function ordenarAvaliacoes(ordem) {
  filtrarAvaliacoes();
}

function renderizarTabelaAvaliacoes(items) {
  const tbody = document.getElementById('tabela-avaliacoes-body');
  const cardsContainer = document.getElementById('view-avaliacoes-cartoes');

  if (tbody) {
    tbody.innerHTML = '';
    items.forEach(a => {
      const tr = document.createElement('tr');
      const statusClass = a.status === 'Concluída' ? 'concluida' : a.status === 'Em Aplicação' ? 'em-aplicacao' : 'agendada';
      tr.innerHTML = `
        <td><code>${a.codigo}</code></td>
        <td><strong>${a.titulo}</strong><br><small style="color: var(--text-dim);">Itens BNCC: ${a.total_itens}</small></td>
        <td><span class="badge-tag primary">${a.componente}</span></td>
        <td>${a.ano_escolar}</td>
        <td><span class="badge-tag">${a.tipo}</span></td>
        <td>${a.periodo_inicio} a ${a.periodo_fim}</td>
        <td><strong>${a.total_avaliados}</strong> / ${a.total_inscritos}</td>
        <td><strong style="color: var(--color-success);">${a.taxa_participacao}</strong></td>
        <td><strong style="color: var(--gov-primary);">${a.proficiencia_media > 0 ? a.proficiencia_media + ' pts' : '—'}</strong></td>
        <td><span class="badge-status ${statusClass}">${a.status}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="detalharAvaliacao(${a.id})">
              Detalhes
            </button>
            <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="excluirAvaliacao(${a.id})">
              Excluir
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    items.forEach(a => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      const statusClass = a.status === 'Concluída' ? 'concluida' : a.status === 'Em Aplicação' ? 'em-aplicacao' : 'agendada';
      card.innerHTML = `
        <div>
          <div class="entity-card-header">
            <div>
              <div class="entity-card-title">${a.titulo}</div>
              <div class="entity-card-subtitle">Cód: <code>${a.codigo}</code> • ${a.ano_escolar}</div>
            </div>
            <span class="badge-status ${statusClass}">${a.status}</span>
          </div>
          <div class="entity-card-body" style="margin-top: 12px;">
            <div class="entity-card-row"><span class="label">Componente:</span><span class="value">${a.componente}</span></div>
            <div class="entity-card-row"><span class="label">Tipo:</span><span class="value">${a.tipo}</span></div>
            <div class="entity-card-row"><span class="label">Período:</span><span class="value">${a.periodo_inicio} a ${a.periodo_fim}</span></div>
            <div class="entity-card-row"><span class="label">Participação:</span><span class="value">${a.taxa_participacao} (${a.total_avaliados}/${a.total_inscritos})</span></div>
            <div class="entity-card-row"><span class="label">Proficiência:</span><span class="value">${a.proficiencia_media > 0 ? a.proficiencia_media + ' pts' : '—'}</span></div>
          </div>
        </div>
        <div class="entity-card-actions">
          <button class="btn btn-secondary" onclick="detalharAvaliacao(${a.id})">Ver Detalhes</button>
          <button class="btn btn-danger" onclick="excluirAvaliacao(${a.id})">Excluir</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }
}

function abrirModalNovaAvaliacao() {
  document.getElementById('modal-nova-avaliacao').classList.add('active');
}

async function salvarNovaAvaliacao(e) {
  e.preventDefault();
  const codigo = document.getElementById('nova-ava-codigo').value;
  const componente = document.getElementById('nova-ava-componente').value;
  const titulo = document.getElementById('nova-ava-titulo').value;
  const ano_escolar = document.getElementById('nova-ava-ano').value;
  const tipo = document.getElementById('nova-ava-tipo').value;
  const periodo_inicio = document.getElementById('nova-ava-inicio').value;
  const periodo_fim = document.getElementById('nova-ava-fim').value;
  const total_itens = parseInt(document.getElementById('nova-ava-itens').value);

  try {
    const res = await fetch('/api/v1/avaliacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, componente, titulo, ano_escolar, tipo, periodo_inicio, periodo_fim, total_itens })
    });
    if (res.ok) {
      fecharModal('modal-nova-avaliacao');
      document.getElementById('form-nova-avaliacao').reset();
      mostrarToast(`Avaliação ${codigo} agendada com sucesso!`);
      await carregarAvaliacoes();
      trocarTela('avaliacoes');
    }
  } catch (err) { mostrarToast("Erro ao agendar avaliação", "erro"); }
}

function detalharAvaliacao(id) {
  const item = listaAvaliacoesGlobal.find(a => a.id === id);
  if (!item) return;
  alert(`Instrumento: ${item.titulo}\nCódigo: ${item.codigo}\nComponente: ${item.componente}\nPúblico-alvo: ${item.ano_escolar}\nTotal de Estudantes Avaliados: ${item.total_avaliados}\nProficiência Média Apurada: ${item.proficiencia_media} pts\nStatus: ${item.status}`);
}

async function excluirAvaliacao(id) {
  const item = listaAvaliacoesGlobal.find(a => a.id === id);
  const titulo = item ? item.titulo : 'esta avaliação';
  if (!confirm(`Deseja realmente excluir a avaliação "${titulo}"?`)) return;

  try {
    const res = await fetch(`/api/v1/avaliacoes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      mostrarToast(`Avaliação excluída com sucesso!`);
      await carregarAvaliacoes();
    } else {
      mostrarToast("Erro ao excluir avaliação.", "erro");
    }
  } catch (err) {
    console.error("Erro ao excluir avaliação:", err);
    mostrarToast("Erro ao excluir avaliação.", "erro");
  }
}

