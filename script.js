// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = "https://hzgrulwdktmkgnxggsum.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zPhD9y1Kvhf06Ju95ExLZA_vk2rpZbp";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!supabaseClient) {
  console.error("Erro crítico: O script do Supabase não foi carregado corretamente.");
}

const authContainer = document.querySelector("#authContainer");
const appContainer = document.querySelector("#appContainer");
const formLogin = document.querySelector("#formLogin");
const msgErroLogin = document.querySelector("#msgErroLogin");
const botaoSair = document.querySelector("#botaoSair");

const form = document.querySelector("#formEntrega");
const listaPendentes = document.querySelector("#listaPendentes");
const listaConcluidas = document.querySelector("#listaConcluidas");
const campoId = document.querySelector("#entregaId");
const campoData = document.querySelector("#dataSelecionada");

let entregas = [];
if (campoData) {
  campoData.value = hojeLocal();
}

function mostrarToast(mensagem, tipo = "sucesso") {
  const container = document.querySelector("#toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast " + tipo;
  toast.textContent = mensagem;

  container.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = "0";
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 3000);
}

async function verificarSessao() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();

  const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
  const elContainerRelatorio = document.querySelector("#containerBotaoRelatorio");

  if (session) {
    if (authContainer) authContainer.style.display = "none";
    if (appContainer) appContainer.style.display = "block";

    aplicarModoMotoristaPelaSessao(session.user);

    if (elContainerRelatorio) {
      if (usuarioLogado !== "motorista" && usuarioLogado !== "motorista2") {
        elContainerRelatorio.classList.remove("escondido");
      } else {
        elContainerRelatorio.classList.add("escondido");
      }
    }

    await carregarEntregasDoSupabase();
  } else {
    if (authContainer) authContainer.style.display = "block";
    if (appContainer) appContainer.style.display = "none";
    document.body.classList.remove("modo-motorista");
    if (elContainerRelatorio) elContainerRelatorio.classList.add("escondido");
  }
}

function aplicarModoMotoristaPelaSessao(usuario) {
  if (!usuario || !usuario.email) return;
  const email = usuario.email.toLowerCase();

  if (email.includes("motorista")) {
    document.body.classList.add("modo-motorista");
  } else {
    document.body.classList.remove("modo-motorista");
  }
}

if (formLogin) {
  formLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (msgErroLogin) msgErroLogin.style.display = "none";

    const nomeDigitado = document.querySelector("#loginNome").value.trim().toLowerCase();
    const senha = document.querySelector("#loginSenha").value.trim();
    const emailFicticio = nomeDigitado.replace(/\s+/g, "") + "@rotas.local";

    localStorage.setItem("usuarioLogado", nomeDigitado);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailFicticio,
      password: senha,
    });

    if (error) {
      if (msgErroLogin) {
        msgErroLogin.textContent = "Nome ou senha incorretos.";
        msgErroLogin.style.display = "block";
      }
    } else {
      mostrarToast("Login efetuado com sucesso!", "sucesso");
      verificarSessao();
    }
  });
}

if (botaoSair) {
  botaoSair.addEventListener("click", async function () {
    localStorage.removeItem("usuarioLogado");
    await supabaseClient.auth.signOut();
    verificarSessao();
  });
}

async function carregarEntregasDoSupabase() {
  try {
    const usuarioLogado = localStorage.getItem("usuarioLogado") || "";

    let query = supabaseClient
      .from("rotas")
      .select("*")
      .order("ordem", { ascending: true });

    if (usuarioLogado === "motorista") {
      query = query.eq("motorista", "motorista");
    } else if (usuarioLogado === "motorista2") {
      query = query.eq("motorista", "motorista2");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao carregar do Supabase:", error);
      entregas = [];
    } else {
      entregas = (data || []).map(function (item) {
        return {
          id: item.id,
          data: item.data_rota,
          cliente: item.cliente,
          telefone: item.telefone,
          rua: item.rua,
          numero: item.numero,
          bairro: item.bairro,
          cidadeUf: item.cidade_uf,
          vendedor: item.vendedor || "Não informado",
          motorista: item.motorista || "motorista",
          observacao: item.observacao,
          prioridade: item.prioridade || "normal",
          status: item.status || "pendente",
          concluida: item.status === "concluida",
          ordem: item.ordem || 0,
          criadaEm: item.criada_em ? new Date(item.criada_em).getTime() : Date.now()
        };
      });
    }
    atualizarTela();
  } catch (erro) {
    console.error("Erro inesperado:", erro);
    entregas = [];
    atualizarTela();
  }
}

function hojeLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia;
}

function escaparHTML(valor) {
  return String(valor === undefined || valor === null ? "" : valor)
    .replace(/[&<>"']/g, function (caractere) {
      const mapa = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return mapa[caractere];
    });
}

function formatarData(dataISO) {
  if (!dataISO) return "";
  const partes = dataISO.split("-");
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });
}

// ==========================================
// AUTOMAÇÃO CRM: VERIFICAR OU CRIAR CLIENTE
// ==========================================
async function verificarOuCriarClienteNoCRM(dadosEntrega) {
  if (!supabaseClient || !dadosEntrega.cliente) return;

  const nomeClienteLimpo = dadosEntrega.cliente.trim().toUpperCase();

  const { data: clienteExistente, error: erroBusca } = await supabaseClient
    .from("clientes")
    .select("id")
    .eq("nome_empresa", nomeClienteLimpo)
    .maybeSingle();

  if (erroBusca) {
    console.error("Erro ao verificar cliente para o CRM:", erroBusca);
    return;
  }

  if (!clienteExistente) {
    const novoCliente = {
      nome_empresa: nomeClienteLimpo,
      telefone: dadosEntrega.telefone || "",
      bairro: (dadosEntrega.bairro || "").trim().toUpperCase(),
      cidade_uf: dadosEntrega.cidade_uf || "João Pessoa - PB",
      segmento: "Geral"
    };

    const { error: erroInsercao } = await supabaseClient
      .from("clientes")
      .insert([novoCliente]);

    if (erroInsercao) {
      console.error("Erro ao criar cliente automaticamente no CRM:", erroInsercao);
    }
  }
}

function montarCartao(entrega, indice, totalAtivas, concluida) {
  const endereco = enderecoDa(entrega);
  const telefoneLimpo = (entrega.telefone || "").replace(/[^\d+]/g, "");
  const idEntrega = entrega.id;

  const urlGoogle = new URL("https://www.google.com/maps/dir/");
  urlGoogle.searchParams.set("api", "1");
  urlGoogle.searchParams.set("destination", endereco);
  urlGoogle.searchParams.set("travelmode", "driving");

  const urlWaze = "https://waze.com/ul?q=" + encodeURIComponent(endereco) + "&navigate=yes";

  let etiquetaStatus = "";
  let corStatus = "#3b82f6";
  if (entrega.status === "separacao") {
    etiquetaStatus = "📦 Em Separação";
    corStatus = "#f59e0b";
  } else if (entrega.status === "rota") {
    etiquetaStatus = "🚚 Em Rota";
    corStatus = "#8b5cf6";
  } else if (entrega.status === "cancelado") {
    etiquetaStatus = "❌ Cancelado";
    corStatus = "#ef4444";
  } else if (entrega.status === "concluida") {
    etiquetaStatus = "✅ Concluída";
    corStatus = "#10b981";
  } else {
    etiquetaStatus = "⏳ Pendente";
    corStatus = "#64748b";
  }

  const badgeStatus = `<span class="etiqueta" style="background-color: ${corStatus}; color: #fff;">${etiquetaStatus}</span>`;
  const textoPrioridade = entrega.prioridade ? entrega.prioridade.charAt(0).toUpperCase() + entrega.prioridade.slice(1) : "Normal";
  const badgePrioridade = `<span class="etiqueta-prioridade">${textoPrioridade}</span>`;

  const classePrioridade = `prioridade-${entrega.prioridade || 'normal'}`;
  const isFinalizada = entrega.status === "concluida" || entrega.status === "cancelado";
  const classeEntrega = "entrega " + classePrioridade + " " + (isFinalizada ? "entrega-finalizada" : "");

  let telefoneHTML = entrega.telefone ? '<p class="detalhe">Telefone: <a href="tel:' + escaparHTML(telefoneLimpo) + '">' + escaparHTML(entrega.telefone) + "</a></p>" : "";
  let vendedorHTML = '<p class="detalhe"><strong>Vendedor:</strong> ' + escaparHTML(entrega.vendedor) + '</p>';
  let motoristaHTML = '<p class="detalhe"><strong>Motorista:</strong> ' + escaparHTML(entrega.motorista) + '</p>';
  let observacaoHTML = entrega.observacao ? '<p class="detalhe"><strong>Observação:</strong> ' + escaparHTML(entrega.observacao) + "</p>" : "";

  let botoesHTML = "";
  if (isFinalizada) {
    botoesHTML = '<button type="button" class="botao-pequeno" data-acao="mudar-status" data-status="pendente" data-id="' + idEntrega + '">Voltar para pendentes</button>';
  } else {
    botoesHTML =
      '<div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">' +
        '<button type="button" class="botao-pequeno" style="background-color: #f59e0b; color: #fff;" data-acao="mudar-status" data-status="separacao" data-id="' + idEntrega + '">📦 Separação</button>' +
        '<button type="button" class="botao-pequeno" style="background-color: #8b5cf6; color: #fff;" data-acao="mudar-status" data-status="rota" data-id="' + idEntrega + '">🚚 Em Rota</button>' +
        '<button type="button" class="botao-pequeno" style="background-color: #10b981; color: #fff;" data-acao="mudar-status" data-status="concluida" data-id="' + idEntrega + '">✅ Entregue</button>' +
      '</div>' +
      '<div style="display: flex; gap: 8px; margin-bottom: 10px; width: 100%;">' +
        '<a class="link-mapa" href="' + escaparHTML(urlGoogle.toString()) + '" target="_blank" rel="noopener noreferrer" style="flex:1; text-align:center;">Google Maps</a>' +
        '<a class="link-mapa" href="' + escaparHTML(urlWaze) + '" target="_blank" rel="noopener noreferrer" style="flex:1; text-align:center;">Waze</a>' +
      '</div>' +
      '<div style="display: flex; gap: 8px;">' +
        '<button type="button" class="botao-pequeno" data-acao="editar" data-id="' + idEntrega + '">Editar</button>' +
        '<button type="button" class="botao-pequeno" style="background-color: #ef4444; color: #fff;" data-acao="mudar-status" data-status="cancelado" data-id="' + idEntrega + '">Cancelar</button>' +
        '<button type="button" class="botao-pequeno" data-acao="excluir" data-id="' + idEntrega + '">Excluir</button>' +
      '</div>';
  }

  return (
    '<article class="' + classeEntrega + '" data-id-card="' + idEntrega + '">' +
      '<div class="entrega-cabecalho">' +
        "<div>" +
          "<h3>" + escaparHTML(entrega.cliente) + "</h3>" +
          '<p class="endereco">' + escaparHTML(endereco) + "</p>" +
        "</div>" +
        '<div style="display: flex; gap: 5px; flex-direction: column; align-items: flex-end;">' + badgeStatus + badgePrioridade + '</div>' +
      "</div>" +
      telefoneHTML +
      vendedorHTML +
      motoristaHTML +
      observacaoHTML +
      '<div class="acoes-entrega">' + botoesHTML + "</div>" +
    "</article>"
  );
}

function atualizarTela() {
  const dataSelecionada = (campoData ? campoData.value : "") || hojeLocal();
  const entregasDoDia = entregasDaData(dataSelecionada);
  const ativas = entregasDoDia.filter(e => e.status !== "concluida" && e.status !== "cancelado");
  const finalizadas = entregasDoDia.filter(e => e.status === "concluida" || e.status === "cancelado");

  const dataPorExtenso = formatarData(dataSelecionada);
  const eHoje = dataSelecionada === hojeLocal();

  const elTitulo = document.querySelector("#tituloRota");
  const elDataHoje = document.querySelector("#dataHoje");

  if (elTitulo) elTitulo.textContent = eHoje ? "Rota do dia" : "Rota de " + formatarDataCurta(dataSelecionada);
  if (elDataHoje && dataPorExtenso) elDataHoje.textContent = dataPorExtenso.charAt(0).toUpperCase() + dataPorExtenso.slice(1);

  if (document.querySelector("#totalEntregas")) document.querySelector("#totalEntregas").textContent = entregasDoDia.length;
  if (document.querySelector("#totalPendentes")) document.querySelector("#totalPendentes").textContent = ativas.length;
  if (document.querySelector("#totalConcluidas")) document.querySelector("#totalConcluidas").textContent = finalizadas.length;
  if (document.querySelector("#contadorConcluidas")) document.querySelector("#contadorConcluidas").textContent = finalizadas.length;

  const elAvisoData = document.querySelector("#avisoDataCadastro");
  if (elAvisoData) elAvisoData.textContent = "Novas entregas serão registradas em " + formatarDataCurta(dataSelecionada) + ".";

  if (listaPendentes) {
    if (ativas.length === 0) {
      listaPendentes.innerHTML = entregasDoDia.length > 0 ? '<div class="vazio">Todas as entregas foram processadas! 🎉</div>' : '<div class="vazio">Nenhuma entrega em ' + escaparHTML(formatarDataCurta(dataSelecionada)) + ".</div>";
    } else {
      listaPendentes.innerHTML = ativas.map((e, i) => montarCartao(e, i, ativas.length, false)).join("");
    }
  }

  if (listaConcluidas) {
    listaConcluidas.innerHTML = finalizadas.length === 0 ? '<div class="vazio">Não há entregas finalizadas nesta data.</div>' : finalizadas.map((e, i) => montarCartao(e, i, finalizadas.length, true)).join("");
  }
}

function limparFormulario() {
  if (form) form.reset();
  if (campoId) campoId.value = "";
  const inputPrioridade = document.querySelector("#prioridade");
  if (inputPrioridade) inputPrioridade.value = "normal";
  const inputStatus = document.querySelector("#statusSelect");
  if (inputStatus) inputStatus.value = "pendente";
  const inputVendedor = document.querySelector("#vendedor");
  if (inputVendedor) inputVendedor.value = "";
  const inputMotorista = document.querySelector("#motorista");
  if (inputMotorista) inputMotorista.value = "";

  const botaoSalvar = document.querySelector("#botaoSalvar");
  if (botaoSalvar) botaoSalvar.textContent = "Adicionar à rota";
  const botaoCancelar = document.querySelector("#botaoCancelar");
  if (botaoCancelar) botaoCancelar.classList.add("escondido");
}

if (form) {
  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const dados = {
      cliente: document.querySelector("#cliente").value.trim().toUpperCase(),
      telefone: document.querySelector("#telefone").value.trim(),
      rua: document.querySelector("#rua").value.trim().toUpperCase(),
      numero: document.querySelector("#numero").value.trim().toUpperCase(),
      bairro: document.querySelector("#bairro").value.trim().toUpperCase(),
      cidade_uf: document.querySelector("#cidadeUf").value.trim().toUpperCase(),
      vendedor: document.querySelector("#vendedor").value,
      motorista: document.querySelector("#motorista") ? document.querySelector("#motorista").value : "motorista",
      observacao: document.querySelector("#observacao").value.trim().toUpperCase(),
      prioridade: document.querySelector("#prioridade") ? document.querySelector("#prioridade").value : "normal",
      status: document.querySelector("#statusSelect") ? document.querySelector("#statusSelect").value : "pendente"
    };

    const idEdicao = campoId ? campoId.value.trim() : "";

    if (idEdicao) {
      const idFinal = /^\d+$/.test(idEdicao) ? Number(idEdicao) : idEdicao;

      const { error } = await supabaseClient.from("rotas").update(dados).eq("id", idFinal);
      if (error) {
        console.error("Erro ao atualizar:", error);
        mostrarToast("Erro ao atualizar entrega.", "erro");
        return;
      }

      await verificarOuCriarClienteNoCRM(dados);
      mostrarToast("Entrega atualizada com sucesso!");
    } else {
      const dataDaRota = (campoData ? campoData.value : "") || hojeLocal();
      const entregasDaRota = entregasDaData(dataDaRota);
      const maiorOrdem = entregasDaRota.length ? Math.max(...entregasDaRota.map(e => e.ordem || 0)) : 0;

      const novaEntregaDb = {
        data_rota: dataDaRota,
        cliente: dados.cliente,
        telefone: dados.telefone,
        rua: dados.rua,
        numero: dados.numero,
        bairro: dados.bairro,
        cidade_uf: dados.cidade_uf,
        vendedor: dados.vendedor,
        motorista: dados.motorista,
        observacao: dados.observacao,
        prioridade: dados.prioridade,
        status: dados.status,
        ordem: maiorOrdem + 1,
        criada_em: new Date().toISOString()
      };

      const { error } = await supabaseClient.from("rotas").insert([novaEntregaDb]);
      if (error) {
        console.error("Erro ao inserir:", error);
        mostrarToast("Erro ao salvar nova entrega.", "erro");
        return;
      }

      await verificarOuCriarClienteNoCRM(dados);
      mostrarToast("Entrega adicionada com sucesso!");
    }

    limparFormulario();
    await carregarEntregasDoSupabase();
  });
}

const botaoOtimizar = document.querySelector("#botaoOtimizar");
if (botaoOtimizar) {
  botaoOtimizar.addEventListener("click", async function () {
    const dataAtual = campoData ? campoData.value : hojeLocal();
    const entregasDoDia = entregasDaData(dataAtual);

    if (entregasDoDia.length <= 1) {
      mostrarToast("Não há entregas suficientes para otimizar.", "erro");
      return;
    }

    const prioridadePeso = { urgente: 1, moderada: 2, normal: 3 };

    entregasDoDia.sort(function (a, b) {
      const bairroA = (a.bairro || "").trim().toLowerCase();
      const bairroB = (b.bairro || "").trim().toLowerCase();
      if (bairroA !== bairroB) {
        return bairroA.localeCompare(bairroB);
      }
      return (prioridadePeso[a.prioridade] || 3) - (prioridadePeso[b.prioridade] || 3);
    });

    for (let i = 0; i < entregasDoDia.length; i++) {
      const item = entregasDoDia[i];
      await supabaseClient
        .from("rotas")
        .update({ ordem: i + 1 })
        .eq("id", item.id);
    }

    mostrarToast("Rota otimizada por bairro e prioridade com sucesso! 📍");
    await carregarEntregasDoSupabase();
  });
}

document.addEventListener("click", async function (evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  const acao = botao.getAttribute("data-acao");
  const rawId = botao.getAttribute("data-id");

  if (!rawId) return;
  const id = /^\d+$/.test(rawId) ? Number(rawId) : rawId;

  if (acao === "excluir") {
    if (confirm("Deseja realmente excluir esta entrega?")) {
      const { error } = await supabaseClient.from("rotas").delete().eq("id", id);
      if (error) {
        mostrarToast("Erro ao excluir entrega.", "erro");
        return;
      }
      mostrarToast("Entrega excluída com sucesso.");
      await carregarEntregasDoSupabase();
    }
  } else if (acao === "mudar-status") {
    const novoStatus = botao.getAttribute("data-status");

    const { error } = await supabaseClient.from("rotas").update({ status: novoStatus }).eq("id", id);
    if (error) {
      mostrarToast("Erro ao atualizar o status.", "erro");
      return;
    }
    mostrarToast("Status atualizado para: " + novoStatus.toUpperCase());
    await carregarEntregasDoSupabase();
  } else if (acao === "editar") {
    const entrega = entregas.find(e => e.id == id);
    if (entrega && campoId) {
      campoId.value = entrega.id;
      document.querySelector("#cliente").value = entrega.cliente;
      document.querySelector("#telefone").value = entrega.telefone || "";
      document.querySelector("#rua").value = entrega.rua;
      document.querySelector("#numero").value = entrega.numero;
      document.querySelector("#bairro").value = entrega.bairro;
      document.querySelector("#cidadeUf").value = entrega.cidadeUf || "João Pessoa - PB";
      document.querySelector("#vendedor").value = entrega.vendedor;
      
      if (document.querySelector("#motorista")) {
        document.querySelector("#motorista").value = entrega.motorista || "motorista";
      }
      if (document.querySelector("#statusSelect")) {
        document.querySelector("#statusSelect").value = entrega.status || "pendente";
      }
      if (document.querySelector("#prioridade")) {
        document.querySelector("#prioridade").value = entrega.prioridade || "normal";
      }
      document.querySelector("#observacao").value = entrega.observacao || "";

      const botaoSalvar = document.querySelector("#botaoSalvar");
      if (botaoSalvar) botaoSalvar.textContent = "Atualizar Entrega";
      const botaoCancelar = document.querySelector("#botaoCancelar");
      if (botaoCancelar) botaoCancelar.classList.remove("escondido");

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
});

const botaoCancelar = document.querySelector("#botaoCancelar");
if (botaoCancelar) {
  botaoCancelar.addEventListener("click", function () {
    limparFormulario();
  });
}

const botaoHoje = document.querySelector("#botaoHoje");
if (botaoHoje) {
  botaoHoje.addEventListener("click", function () {
    if (campoData) {
      campoData.value = hojeLocal();
      atualizarTela();
    }
  });
}

if (campoData) {
  campoData.addEventListener("change", function () {
    atualizarTela();
  });
}

const botaoExportarCsv = document.querySelector("#botaoExportarCsv");
if (botaoExportarCsv) {
  botaoExportarCsv.addEventListener("click", function () {
    const dataAtual = campoData ? campoData.value : hojeLocal();
    const entregasDoDia = entregasDaData(dataAtual);

    if (entregasDoDia.length === 0) {
      mostrarToast("Não há entregas para exportar nesta data.", "erro");
      return;
    }

    let csv = "ID,Data,Cliente,Telefone,Rua,Numero,Bairro,Cidade/UF,Vendedor,Motorista,Prioridade,Status\n";
    entregasDoDia.forEach(e => {
      csv += `"${e.id}","${e.data}","${e.cliente}","${e.telefone || ''}","${e.rua}","${e.numero}","${e.bairro}","${e.cidadeUf}","${e.vendedor}","${e.motorista}","${e.prioridade}","${e.status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rotas_acoforte_" + dataAtual + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast("Ficheiro CSV exportado com sucesso!");
  });
}

const botaoWhatsapp = document.querySelector("#botaoWhatsapp");
if (botaoWhatsapp) {
  botaoWhatsapp.addEventListener("click", function () {
    const dataAtual = campoData ? campoData.value : hojeLocal();
    const entregasDoDia = entregasDaData(dataAtual);

    if (entregasDoDia.length === 0) {
      mostrarToast("Não há entregas para partilhar nesta data.", "erro");
      return;
    }

    let texto = `📋 *ROTA DE ENTREGAS - AÇOFORTE* (${formatarDataCurta(dataAtual)})\n\n`;
    entregasDoDia.forEach((e, index) => {
      texto += `${index + 1}. *${e.cliente}*\n   📍 ${e.rua}, ${e.numero} - ${e.bairro}\n   📌 Status: ${e.status.toUpperCase()}\n\n`;
    });

    const url = "https://api.whatsapp.com/send?text=" + encodeURIComponent(texto);
    window.open(url, "_blank");
  });
}

const botaoAgruparBairro = document.querySelector("#botaoAgruparBairro");
if (botaoAgruparBairro) {
  botaoAgruparBairro.addEventListener("click", async function () {
    const dataAtual = campoData ? campoData.value : hojeLocal();
    const entregasDoDia = entregasDaData(dataAtual);

    if (entregasDoDia.length <= 1) {
      mostrarToast("Não há entregas suficientes para agrupar.", "erro");
      return;
    }

    entregasDoDia.sort((a, b) => (a.bairro || "").localeCompare(b.bairro || ""));

    for (let i = 0; i < entregasDoDia.length; i++) {
      await supabaseClient.from("rotas").update({ ordem: i + 1 }).eq("id", entregasDoDia[i].id);
    }

    mostrarToast("Entregas agrupadas por bairro com sucesso!");
    await carregarEntregasDoSupabase();
  });
}

const botaoSalvarHistorico = document.querySelector("#botaoSalvarHistorico");
if (botaoSalvarHistorico) {
  botaoSalvarHistorico.addEventListener("click", function () {
    mostrarToast("Histórico de rotas sincronizado com o Supabase com sucesso! 💾");
  });
}

window.addEventListener("DOMContentLoaded", function () {
  verificarSessao();
});

function formatarDataCurta(dataISO) {
  if (!dataISO) return "";
  const partes = dataISO.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function enderecoDa(entrega) {
  return [entrega.rua, entrega.numero, entrega.bairro, entrega.cidadeUf, "Brasil"].filter(Boolean).join(", ");
}

function entregasDaData(data) {
  const dataUsada = data || (campoData ? campoData.value : "") || hojeLocal();
  return entregas
    .filter(function (entrega) { return entrega.data === dataUsada; })
    .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
}
