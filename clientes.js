const SUPABASE_URL = "https://hzgrulwdktmkgnxggsum.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zPhD9y1Kvhf06Ju95ExLZA_vk2rpZbp";
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function mostrarToast(mensagem, tipo = "sucesso") {
  const container = document.querySelector("#toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast " + tipo;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
}

async function carregarCRMKanban() {
  if (!supabaseClient) return;

  const { data: clientes, error } = await supabaseClient.from("clientes").select("*");
  
  if (error) {
    console.error("Erro ao carregar clientes do CRM:", error);
    return;
  }

  // Limpar colunas
  document.getElementById("coluna-leads").innerHTML = "";
  document.getElementById("coluna-sem-contato").innerHTML = "";
  document.getElementById("coluna-negociacao").innerHTML = "";
  document.getElementById("coluna-fechado").innerHTML = "";

  let counts = { leads: 0, sem_contato: 0, negociacao: 0, fechado: 0 };

  (clientes || []).forEach(cliente => {
    const fase = cliente.fase || "leads";
    const cartaoHTML = criarCartaoKanban(cliente);

    if (fase === "sem_contato") {
      document.getElementById("coluna-sem-contato").innerHTML += cartaoHTML;
      counts.sem_contato++;
    } else if (fase === "negociacao") {
      document.getElementById("coluna-negociacao").innerHTML += cartaoHTML;
      counts.negociacao++;
    } else if (fase === "fechado") {
      document.getElementById("coluna-fechado").innerHTML += cartaoHTML;
      counts.fechado++;
    } else {
      document.getElementById("coluna-leads").innerHTML += cartaoHTML;
      counts.leads++;
    }
  });

  document.getElementById("contador-leads").textContent = counts.leads;
  document.getElementById("contador-sem-contato").textContent = counts.sem_contato;
  document.getElementById("contador-negociacao").textContent = counts.negociacao;
  document.getElementById("contador-fechado").textContent = counts.fechado;
}

function criarCartaoKanban(cliente) {
  const telefoneLimpo = (cliente.telefone || "").replace(/[^\d+]/g, "");
  const textoMsg = `Olá ${cliente.nome_empresa}, tudo bem? Entrando em contacto pela AçoForte.`;
  const urlWhatsApp = telefoneLimpo ? `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(textoMsg)}` : "#";

  return `
    <div style="background: #fff; padding: 14px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #2563eb;">
      <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${cliente.nome_empresa}</h4>
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">📍 ${cliente.bairro || "Bairro não informado"} (${cliente.cidade_uf || "PB"})</p>
      
      <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
        <span style="font-size: 10px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600; color: #334155;">${cliente.segmento || 'Geral'}</span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 8px;">
        <select onchange="atualizarFaseCliente(${cliente.id}, this.value)" style="font-size: 11px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc;">
          <option value="leads" ${cliente.fase === 'leads' ? 'selected' : ''}>Leads Novos</option>
          <option value="sem_contato" ${cliente.fase === 'sem_contato' ? 'selected' : ''}>Sem Contato</option>
          <option value="negociacao" ${cliente.fase === 'negociacao' ? 'selected' : ''}>Em Negociação</option>
          <option value="fechado" ${cliente.fase === 'fechado' ? 'selected' : ''}>Fechado</option>
        </select>

        ${telefoneLimpo ? `
          <a href="${urlWhatsApp}" target="_blank" rel="noopener noreferrer" style="background-color: #16a34a; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
            💬 WhatsApp
          </a>
        ` : `
          <span style="font-size: 11px; color: #94a3b8;">Sem tel.</span>
        `}
      </div>
    </div>
  `;
}

async function atualizarFaseCliente(idCliente, novaFase) {
  const { error } = await supabaseClient
    .from("clientes")
    .update({ fase: novaFase })
    .eq("id", idCliente);

  if (error) {
    mostrarToast("Erro ao atualizar fase do cliente.", "erro");
    console.error(error);
  } else {
    mostrarToast("Fase atualizada com sucesso!");
    carregarCRMKanban();
  }
}

window.addEventListener("DOMContentLoaded", carregarCRMKanban);
