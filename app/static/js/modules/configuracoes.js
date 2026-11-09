// --- 3. CONTROLE DA ABA CONFIGURAÇÕES (Média Geral & Níveis | Seguranças | Funcionalidades) ---
function trocarSubAbaConfig(subId) {
  subAbaConfigAtual = subId;
  const contents = document.querySelectorAll('.sub-config-content');
  contents.forEach(c => c.style.display = 'none');

  const target = document.getElementById(`sub-config-${subId}`);
  if (target) target.style.display = 'block';

  document.getElementById('btn-subcfg-media-niveis')?.classList.toggle('active', subId === 'media-niveis');
  document.getElementById('btn-subcfg-seguranca')?.classList.toggle('active', subId === 'seguranca');
  document.getElementById('btn-subcfg-funcionalidades')?.classList.toggle('active', subId === 'funcionalidades');
  document.getElementById('btn-subcfg-sincronizacao')?.classList.toggle('active', subId === 'sincronizacao');
}

async function carregarConfiguracoes() {
  try {
    const [resMedia, resSec, resFunc] = await Promise.all([
      fetch('/api/v1/configuracoes/parametrizacao-media-nivel'),
      fetch('/api/v1/configuracoes/seguranca'),
      fetch('/api/v1/configuracoes/funcionalidades')
    ]);

    if (resMedia.ok) {
      const m = await resMedia.json();
      const elMedia = document.getElementById('cfg-media-geral');
      const elMinAv = document.getElementById('cfg-min-avancado');
      const elMaxAv = document.getElementById('cfg-max-avancado');
      const elMinAd = document.getElementById('cfg-min-adequado');
      const elMaxAd = document.getElementById('cfg-max-adequado');
      const elMinBa = document.getElementById('cfg-min-basico');
      const elMaxBa = document.getElementById('cfg-max-basico');
      const elMinAb = document.getElementById('cfg-min-abaixo');
      const elMaxAb = document.getElementById('cfg-max-abaixo');

      if (elMedia) elMedia.value = m.media_geral_aprovacao ?? 6.0;
      if (elMinAv) elMinAv.value = m.nota_min_avancado ?? 8.0;
      if (elMaxAv) elMaxAv.value = m.nota_max_avancado ?? 10.0;
      if (elMinAd) elMinAd.value = m.nota_min_adequado ?? 7.0;
      if (elMaxAd) elMaxAd.value = m.nota_max_adequado ?? 7.9;
      if (elMinBa) elMinBa.value = m.nota_min_basico ?? 6.0;
      if (elMaxBa) elMaxBa.value = m.nota_max_basico ?? 6.9;
      if (elMinAb) elMinAb.value = m.nota_min_abaixo ?? 0.0;
      if (elMaxAb) elMaxAb.value = m.nota_max_abaixo ?? 5.9;
    }

    if (resSec.ok) {
      const sec = await resSec.json();
      const el2fa = document.getElementById('sec-2fa');
      const elSenhas = document.getElementById('sec-senhas');
      const elBloq = document.getElementById('sec-bloqueio');
      const elAudit = document.getElementById('sec-auditoria');
      const elMasc = document.getElementById('sec-mascaramento');
      const elBkp = document.getElementById('sec-backup');

      if (el2fa) el2fa.checked = sec.autenticacao_2fa;
      if (elSenhas) elSenhas.checked = sec.politica_senhas_fortes;
      if (elBloq) elBloq.checked = sec.bloqueio_tentativas_incorretas;
      if (elAudit) elAudit.checked = sec.trilha_auditoria_ativa;
      if (elMasc) elMasc.checked = sec.mascaramento_cpf_lgpd;
      if (elBkp) elBkp.checked = sec.backup_automatico_diario;
    }

    if (resFunc.ok) {
      const func = await resFunc.json();
      const elDash = document.getElementById('func-dashboard');
      const elAva = document.getElementById('func-avaliacoes');
      const elCad = document.getElementById('func-cadastros');
      const elBol = document.getElementById('func-boletins');
      const elExp = document.getElementById('func-exportacao');
      const elSed = document.getElementById('func-seduc');

      if (elDash) elDash.checked = func.modulo_dashboard;
      if (elAva) elAva.checked = func.modulo_avaliacoes;
      if (elCad) elCad.checked = func.modulo_cadastros_gerais;
      if (elBol) elBol.checked = func.modulo_boletins_online;
      if (elExp) elExp.checked = func.modulo_exportacao_csv;
      if (elSed) elSed.checked = func.modulo_integracao_seduc;
    }

    await carregarLogsAuditoriaLGPD();
  } catch (err) { console.error(err); }
}

async function salvarParametrizacaoMediaNivel() {
  const dados = {
    media_geral_aprovacao: parseFloat(document.getElementById('cfg-media-geral')?.value || 6.0),
    nota_min_avancado: parseFloat(document.getElementById('cfg-min-avancado')?.value || 8.0),
    nota_max_avancado: parseFloat(document.getElementById('cfg-max-avancado')?.value || 10.0),
    nota_min_adequado: parseFloat(document.getElementById('cfg-min-adequado')?.value || 7.0),
    nota_max_adequado: parseFloat(document.getElementById('cfg-max-adequado')?.value || 7.9),
    nota_min_basico: parseFloat(document.getElementById('cfg-min-basico')?.value || 6.0),
    nota_max_basico: parseFloat(document.getElementById('cfg-max-basico')?.value || 6.9),
    nota_min_abaixo: parseFloat(document.getElementById('cfg-min-abaixo')?.value || 0.0),
    nota_max_abaixo: parseFloat(document.getElementById('cfg-max-abaixo')?.value || 5.9)
  };

  try {
    const res = await fetch('/api/v1/configuracoes/parametrizacao-media-nivel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (!res.ok) throw new Error("Erro na API");
    mostrarToast("Parametrização de Médias e Níveis salva com sucesso!");
    // Recarrega alunos e métricas caso estejam abertos
    carregarDadosCadastros();
    carregarTodasMetricas();
  } catch (err) {
    console.error(err);
    mostrarToast("Erro ao salvar parametrização de médias.", "erro");
  }
}

async function salvarTodasConfiguracoes() {
  try {
    await salvarParametrizacaoMediaNivel();

    const secData = {
      autenticacao_2fa: document.getElementById('sec-2fa')?.checked ?? true,
      politica_senhas_fortes: document.getElementById('sec-senhas')?.checked ?? true,
      bloqueio_tentativas_incorretas: document.getElementById('sec-bloqueio')?.checked ?? true,
      trilha_auditoria_ativa: document.getElementById('sec-auditoria')?.checked ?? true,
      mascaramento_cpf_lgpd: document.getElementById('sec-mascaramento')?.checked ?? true,
      backup_automatico_diario: document.getElementById('sec-backup')?.checked ?? true,
      tempo_sessao_minutos: 60,
      max_tentativas_login: 5,
      criptografia_dados_sensíveis: true
    };

    const funcData = {
      modulo_dashboard: document.getElementById('func-dashboard')?.checked ?? true,
      modulo_avaliacoes: document.getElementById('func-avaliacoes')?.checked ?? true,
      modulo_cadastros_gerais: document.getElementById('func-cadastros')?.checked ?? true,
      modulo_boletins_online: document.getElementById('func-boletins')?.checked ?? true,
      modulo_exportacao_csv: document.getElementById('func-exportacao')?.checked ?? true,
      modulo_integracao_seduc: document.getElementById('func-seduc')?.checked ?? true,
      modulo_escolas: true,
      modulo_alunos: true,
      modulo_bi_relatorios: true,
      modulo_simulados_saeb: true
    };

    await Promise.all([
      fetch('/api/v1/configuracoes/seguranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(secData)
      }),
      fetch('/api/v1/configuracoes/funcionalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(funcData)
      })
    ]);

    mostrarToast("Todas as configurações foram salvas com sucesso!");
    await carregarLogsAuditoriaLGPD();
  } catch (err) {
    mostrarToast("Erro ao salvar configurações", "erro");
  }
}

// Carrega os registros reais de auditoria da base SQLite
async function carregarLogsAuditoriaLGPD() {
  const tbody = document.getElementById('tabela-logs-auditoria-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/v1/auditoria/logs?limite=30');
    if (!res.ok) throw new Error("Erro na API de auditoria");
    const logs = await res.json();

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">
            Nenhum evento registrado ainda na trilha de auditoria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    logs.forEach(l => {
      const dataFmt = typeof formatarDataHoraBrasilia === 'function' ? formatarDataHoraBrasilia(l.timestamp) : new Date(l.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size: 0.8rem; font-family: monospace;">${dataFmt}</td>
        <td><strong>${l.usuario}</strong></td>
        <td><span class="badge-tag primary">${l.perfil.toUpperCase()}</span></td>
        <td><span class="badge-tag" style="background: rgba(0, 45, 98, 0.08); color: var(--gov-primary); font-weight: 700;">${l.acao}</span></td>
        <td style="font-size: 0.83rem;">${l.detalhes}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${l.ip_origem || '127.0.0.1'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar logs LGPD:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--color-danger); padding: 16px;">
          Falha ao recuperar registros de auditoria.
        </td>
      </tr>
    `;
  }
}

