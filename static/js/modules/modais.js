// --- 9. MODAIS & TOAST ---
function fecharModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// Fechar modal ao clicar no fundo escuro (overlay) ou ao pressionar ESC (exceto modais bloqueados de login)
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
    if (e.target.getAttribute('data-bloqueado') === 'true') return;
    e.target.classList.remove('active');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      if (m.getAttribute('data-bloqueado') === 'true') return;
      m.classList.remove('active');
    });
  }
});

function mostrarToast(mensagem, tipo = 'sucesso') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = mensagem;
  if (tipo === 'erro') toast.style.borderLeftColor = 'var(--color-danger)';
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
