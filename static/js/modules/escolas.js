// --- 6. REDE & ESCOLAS ---
async function carregarEscolas() {
  try {
    const res = await fetch('/api/v1/escolas');
    if (!res.ok) throw new Error("Erro ao consultar escolas");
    listaEscolasGlobal = await res.json();
    filtrarEscolasCards();
    alternarModoExibicaoEscolas(modoExibicaoEscolas || 'cartoes');
  } catch (err) { console.error(err); }
}

function alternarModoExibicaoEscolas(modo) {
  modoExibicaoEscolas = modo;
  document.getElementById('btn-view-esc-lista')?.classList.toggle('active', modo === 'lista');
  document.getElementById('btn-view-esc-cards')?.classList.toggle('active', modo === 'cartoes');

  const listaEl = document.getElementById('view-rede-escolas-lista') || document.querySelector('#screen-escolas #view-escolas-lista');
  const cardsEl = document.getElementById('grid-escolas-cards');
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

function filtrarEscolasCards(termo) {
  const t = (termo !== undefined ? termo : (document.getElementById('busca-escola')?.value || '')).toLowerCase().trim();
  const zona = document.getElementById('filtro-zona-escolas')?.value || 'todos';
  const ordem = document.getElementById('ordem-escolas')?.value || 'padrao';

  let filtrados = listaEscolasGlobal.filter(e => {
    const matchTermo = !t || e.nome.toLowerCase().includes(t) || e.bairro.toLowerCase().includes(t) || e.codigo.includes(t);
    const matchZona = zona === 'todos' || e.tipo_unidade.toLowerCase() === zona.toLowerCase();
    return matchTermo && matchZona;
  });

  if (ordem === 'nome-asc') {
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (ordem === 'alunos-desc') {
    filtrados.sort((a, b) => b.total_alunos - a.total_alunos);
  } else if (ordem === 'nota-desc') {
    filtrados.sort((a, b) => {
      const mA = ((a.nota_media_lp || a.proficiencia_lp) + (a.nota_media_mat || a.proficiencia_mat)) / 2;
      const mB = ((b.nota_media_lp || b.proficiencia_lp) + (b.nota_media_mat || b.proficiencia_mat)) / 2;
      return mB - mA;
    });
  }

  renderizarEscolasGeral(filtrados);
}

function filtrarEscolasPorZona(zona) {
  filtrarEscolasCards();
}

function ordenarEscolas(ordem) {
  filtrarEscolasCards();
}

function renderizarEscolasGeral(escolas) {
  const container = document.getElementById('grid-escolas-cards');
  const tbody = document.getElementById('tabela-escolas-body');

  if (container) {
    container.innerHTML = '';
    escolas.forEach(e => {
      const card = document.createElement('div');
      card.className = 'school-card';
      const notaLp = (e.nota_media_lp !== undefined) ? e.nota_media_lp : e.proficiencia_lp;
      const notaMat = (e.nota_media_mat !== undefined) ? e.nota_media_mat : e.proficiencia_mat;
      const media = (notaLp + notaMat) / 2;
      const tagTipoClass = e.tipo_unidade === 'Urbana' ? 'primary' : e.tipo_unidade === 'Campo' ? 'success' : 'warning';

      card.innerHTML = `
        <div class="school-card-top">
          <div>
            <h4>${e.nome}</h4>
            <span class="badge-tag ${tagTipoClass}">${e.tipo_unidade} • Cód: ${e.codigo}</span>
          </div>
          <span class="badge-status ativo">${e.status}</span>
        </div>
        <div class="school-meta">
          <div><strong>Endereço:</strong> ${e.endereco}, nº ${e.numero} - ${e.bairro}</div>
          <div><strong>Telefone:</strong> ${e.telefone}</div>
          <div><strong>INEP:</strong> ${e.codigo_inep || '—'}</div>
        </div>
        <div class="school-metrics-pill">
          <div class="school-stat-col">
            <span>Turmas</span>
            <strong>${e.total_turmas}</strong>
          </div>
          <div class="school-stat-col">
            <span>Alunos</span>
            <strong>${e.total_alunos}</strong>
          </div>
          <div class="school-stat-col">
            <span>Participação</span>
            <strong style="color: var(--color-success);">${e.taxa_participacao}</strong>
          </div>
          <div class="school-stat-col">
            <span>Nota Média</span>
            <strong style="color: var(--gov-primary);">${formatarNota(media)}</strong>
          </div>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
          <button class="btn btn-edit" onclick="abrirModalEditarEscola(${e.id})">Editar</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  if (tbody) {
    tbody.innerHTML = '';
    escolas.forEach(e => {
      const tr = document.createElement('tr');
      const notaLp = (e.nota_media_lp !== undefined) ? e.nota_media_lp : e.proficiencia_lp;
      const notaMat = (e.nota_media_mat !== undefined) ? e.nota_media_mat : e.proficiencia_mat;
      const media = (notaLp + notaMat) / 2;

      tr.innerHTML = `
        <td><code>${e.codigo}</code></td>
        <td><strong>${e.nome}</strong></td>
        <td><span class="badge-tag primary">${e.tipo_unidade}</span></td>
        <td>${e.endereco}, nº ${e.numero} - ${e.bairro}</td>
        <td>${e.telefone}</td>
        <td><code>${e.codigo_inep || '—'}</code></td>
        <td>${e.total_turmas}</td>
        <td><strong>${e.total_alunos}</strong></td>
        <td><strong style="color: var(--color-success);">${e.taxa_participacao}</strong></td>
        <td><strong style="color: var(--gov-primary);">${formatarNota(media)}</strong></td>
        <td style="text-align: center;">
          <button class="btn btn-edit" style="padding: 4px 10px; font-size: 0.76rem;" onclick="abrirModalEditarEscola(${e.id})">Editar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

