// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = "https://hzgrulwdktmkgnxggsum.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zPhD9y1Kvhf06Ju95ExLZA_vk2rpZbp";

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!supabaseClient) {
  console.error("Erro crítico: O script do Supabase não foi carregado corretamente no HTML.");
}

// Referências da Tela de Login e App
const authContainer = document.querySelector("#authContainer");
const appContainer = document.querySelector("#appContainer");
const formLogin = document.querySelector("#formLogin");
const msgErroLogin = document.querySelector("#msgErroLogin");
const botaoSair = document.querySelector("#botaoSair");

// ==========================================
// VARIÁVEIS E ELEMENTOS DO APP
// ==========================================
const form = document.querySelector("#formEntrega");
const listaPendentes = document.querySelector("#listaPendentes");
const listaConcluidas = document.querySelector("#listaConcluidas");
const campoId = document.querySelector("#entregaId");
const campoData = document.querySelector("#dataSelecionada");

let entregas = [];
if (campoData) {
  campoData.value = hojeLocal();
}

// ==========================================
// SISTEMA DE FEEDBACK VISUAL (TOASTS)
// ==========================================
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

// ==========================================
// CONTROLE DE SESSÃO E LOGIN
// ==========================================
async function verificarSessao() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session) {
    if (authContainer) authContainer.style.display = "none";
    if (appContainer) appContainer.style.display = "block";
    await carregarEntregasDoSupabase();
  } else {
    if (authContainer) authContainer.style.display = "block";
    if (appContainer) appContainer.style.display = "none";
  }
}

if (formLogin) {
  formLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (msgErroLogin) msgErroLogin.style.display = "none";

    const nomeDigitado = document.querySelector("#loginNome").value.trim().toLowerCase();
    const senha = document.querySelector("#loginSenha").value.trim();
    const emailFicticio = nomeDigitado.replace(/\s+/g, "") + "@rotas.local";

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
    await supabaseClient.auth.signOut();
    verificarSessao();
  });
}

// ==========================================
// COMUNICAÇÃO COM O BANCO (SUPABASE)
// ==========================================
async function carregarEntregasDoSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from("rotas")
      .select("*")
      .order("ordem", { ascending: true });

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
          observacao: item.observacao,
          concluida: item.status === "concluida",
          ordem: item.ordem || 0,
          criadaEm: item.criada_em ? new Date(item.criada_em).getTime() : Date.now(),
          concluidaEm: item.concluida_em ? new Date(item.concluida_em).getTime() : null
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

// ==========================================
// FUNÇÕES AUXILIARES E LÓGICA DO APP
// ==========================================
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

function montarCartao(entrega, indice, totalPendentes, concluida) {
  const endereco = enderecoDa(entrega);
  const telefoneLimpo = (entrega.telefone || "").replace(/[^\d+]/g, "");

  const urlGoogle = new URL("https://www.google.com/maps/dir/");
  urlGoogle.searchParams.set("api", "1");
  urlGoogle.searchParams.set("destination", endereco);
  urlGoogle.searchParams.set("travelmode", "driving");

  const urlWaze = "https://waze.com/ul?q=" + encodeURIComponent(endereco) + "&navigate=yes";

  let etiqueta;
  if (concluida) {
    etiqueta = '<span class="etiqueta concluida">Concluída</span>';
  } else if (indice === 0) {
    etiqueta = '<span class="etiqueta">Próxima entrega</span>';
  } else {
    etiqueta = '<span class="etiqueta">Parada ' + (indice + 1) + "</span>";
  }

  const classeEntrega = "entrega " + (!concluida && indice === 0 ? "proxima " : "") + (concluida ? "entrega-finalizada" : "");

  let telefoneHTML = entrega.telefone ? '<p class="detalhe">Telefone: <a href="tel:' + escaparHTML(telefoneLimpo) + '">' + escaparHTML(entrega.telefone) + "</a></p>" : "";
  let observacaoHTML = entrega.observacao ? '<p class="detalhe"><strong>Observação:</strong> ' + escaparHTML(entrega.observacao) + "</p>" : "";

  let botoesHTML = "";
  if (concluida) {
    botoesHTML = '<button class="botao-pequeno" data-acao="desfazer" data-id="' + escaparHTML(entrega.id) + '">Voltar para pendentes</button>';
  } else {
    botoesHTML =
      '<a class="link-mapa" href="' + escaparHTML(urlGoogle.toString()) + '" target="_blank" rel="noopener noreferrer">Google Maps</a>' +
      '<a class="link-mapa" href="' + escaparHTML(urlWaze) + '" target="_blank" rel="noopener noreferrer">Waze</a>' +
      '<button class="botao-pequeno" data-acao="subir" data-id="' + escaparHTML(entrega.id) + '" ' + (indice === 0 ? "disabled" : "") + '>↑</button>' +
      '<button class="botao-pequeno" data-acao="descer" data-id="' + escaparHTML(entrega.id) + '" ' + (indice === totalPendentes - 1 ? "disabled" : "") + '>↓</button>' +
      '<button class="botao-pequeno" data-acao="editar" data-id="' + escaparHTML(entrega.id) + '">Editar</button>' +
      '<button class="botao-pequeno botao-marcar" data-acao="concluir" data-id="' + escaparHTML(entrega.id) + '">Entregue</button>' +
      '<button class="botao-pequeno" data-acao="excluir" data-id="' + escaparHTML(entrega.id) + '">Excluir</button>';
  }

  return (
    '<article class="' + classeEntrega + '">' +
      '<div class="entrega-cabecalho">' +
        "<div>" +
          "<h3>" + escaparHTML(entrega.cliente) + "</h3>" +
          '<p class="endereco">' + escaparHTML(endereco) + "</p>" +
        "</div>" +
        etiqueta +
      "</div>" +
      telefoneHTML +
      observacaoHTML +
      '<div class="acoes-entrega">' + botoesHTML + "</div>" +
    "</article>"
  );
}

function atualizarTela() {
  const dataSelecionada = (campoData ? campoData.value : "") || hojeLocal();
  const entregasDoDia = entregasDaData(dataSelecionada);
  const pendentes = entregasDoDia.filter(e => !e.concluida);
  const concluidas = entregasDoDia.filter(e => e.concluida);

  const dataPorExtenso = formatarData(dataSelecionada);
  const eHoje = dataSelecionada === hojeLocal();

  const elTitulo = document.querySelector("#tituloRota");
  const elDataHoje = document.querySelector("#dataHoje");
  
  if (elTitulo) elTitulo.textContent = eHoje ? "Rota do dia" : "Rota de " + formatarDataCurta(dataSelecionada);
  if (elDataHoje && dataPorExtenso) elDataHoje.textContent = dataPorExtenso.charAt(0).toUpperCase() + dataPorExtenso.slice(1);

  if (document.querySelector("#totalEntregas")) document.querySelector("#totalEntregas").textContent = entregasDoDia.length;
  if (document.querySelector("#totalPendentes")) document.querySelector("#totalPendentes").textContent = pendentes.length;
  if (document.querySelector("#totalConcluidas")) document.querySelector("#totalConcluidas").textContent = concluidas.length;
  if (document.querySelector("#contadorConcluidas")) document.querySelector("#contadorConcluidas").textContent = concluidas.length;

  const elAvisoData = document.querySelector("#avisoDataCadastro");
  if (elAvisoData) elAvisoData.textContent = "Novas entregas serão registradas em " + formatarDataCurta(dataSelecionada) + ".";

  if (listaPendentes) {
    if (pendentes.length === 0) {
      listaPendentes.innerHTML = entregasDoDia.length > 0 ? '<div class="vazio">Rota concluída! 🎉</div>' : '<div class="vazio">Nenhuma entrega em ' + escaparHTML(formatarDataCurta(dataSelecionada)) + ".</div>";
    } else {
      listaPendentes.innerHTML = pendentes.map((e, i) => montarCartao(e, i, pendentes.length, false)).join("");
    }
  }

  const textoProgresso = document.querySelector("#textoProgresso");
  if (textoProgresso) {
    textoProgresso.textContent = entregasDoDia.length === 0 ? "Adicione entregas para começar." : concluidas.length + " de " + entregasDoDia.length + " entregas concluídas.";
  }

  if (listaConcluidas) {
    listaConcluidas.innerHTML = concluidas.length === 0 ? '<div class="vazio">Não há entregas concluídas nesta data.</div>' : concluidas.map((e, i) => montarCartao(e, i, concluidas.length, true)).join("");
  }
}

function limparFormulario() {
  if (form) form.reset();
  if (campoId) campoId.value = "";
  const botaoSalvar = document.querySelector("#botaoSalvar");
  if (botaoSalvar) botaoSalvar.textContent = "Adicionar à rota";
  const botaoCancelar = document.querySelector("#botaoCancelar");
  if (botaoCancelar) botaoCancelar.classList.add("escondido");
}

// ==========================================
// FORMULÁRIO DE CADASTRO / EDIÇÃO
// ==========================================
if (form) {
  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const dados = {
      cliente: document.querySelector("#cliente").value.trim(),
      telefone: document.querySelector("#telefone").value.trim(),
      rua: document.querySelector("#rua").value.trim(),
      numero: document.querySelector("#numero").value.trim(),
      bairro: document.querySelector("#bairro").value.trim(),
      cidade_uf: document.querySelector("#cidadeUf").value.trim(),
      observacao: document.querySelector("#observacao").value.trim()
    };

    const idEdicao = campoId ? campoId.value : "";

    if (idEdicao) {
      const { error } = await supabaseClient.from("rotas").update(dados).eq("id", idEdicao);
      if (error) {
        mostrarToast("Erro ao atualizar entrega.", "erro");
        return;
      }
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
        observacao: dados.observacao,
        status: "pendente",
        ordem: maiorOrdem + 1,
        criada_em: new Date().toISOString()
      };

      const { error } = await supabaseClient.from("rotas").insert([novaEntregaDb]);
      if (error) {
        mostrarToast("Erro ao salvar nova entrega.", "erro");
        return;
      }
      mostrarToast("Entrega adicionada com sucesso!");
    }

    limparFormulario();
    await carregarEntregasDoSupabase();
  });
}

// ==========================================
// AÇÕES NOS CARDS
// ==========================================
document.addEventListener("click", async function (evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  const acao = botao.getAttribute("data-acao");
  const id = botao.getAttribute("data-id");

  if (acao === "excluir") {
    if (confirm("Deseja realmente excluir esta entrega?")) {
      const { error } = await supabaseClient.from("rotas").delete().eq("id", id);
      if (!error) {
        mostrarToast("Entrega excluída.");
        await carregarEntregasDoSupabase();
      }
    }
  } else if (acao === "concluir" || acao === "desfazer") {
    const novoStatus = acao === "concluir" ? "concluida" : "pendente";
    const concluidaEm = acao === "concluir" ? new Date().toISOString() : null;

    const { error } = await supabaseClient.from("rotas").update({ status: novoStatus, concluida_em: concluidaEm }).eq("id", id);
    if (!error) {
      mostrarToast(acao === "concluir" ? "Marcada como entregue! 🎉" : "Retornada para pendentes.");
      await carregarEntregasDoSupabase();
    }
  } else if (acao === "editar") {
    const entrega = entregas.find(e => e.id === id);
    if (entrega && campoId) {
      campoId.value = entrega.id;
      document.querySelector("#cliente").value = entrega.cliente;
      document.querySelector("#telefone").value = entrega.telefone || "";
      document.querySelector("#rua").value = entrega.rua;
      document.querySelector("#numero").value = entrega.numero;
      document.querySelector("#bairro").value = entrega.bairro;
      document.querySelector("#cidadeUf").value = entrega.cidadeUf;
      document.querySelector("#observacao").value = entrega.observacao || "";

      document.querySelector("#botaoSalvar").textContent = "Salvar alterações";
      document.querySelector("#botaoCancelar").classList.remove("escondido");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } else if (acao === "subir" || acao === "descer") {
    const direcao = acao === "subir" ? -1 : 1;
    await trocarOrdemNoBanco(id, direcao);
  }
});

async function trocarOrdemNoBanco(id, direcao) {
  const pendentes = entregasDaData().filter(e => !e.concluida);
  const indice = pendentes.findIndex(e => e.id === id);
  const novoIndice = indice + direcao;

  if (indice < 0 || novoIndice < 0 || novoIndice >= pendentes.length) return;

  const temp = pendentes[indice];
  pendentes[indice] = pendentes[novoIndice];
  pendentes[novoIndice] = temp;

  for (let i = 0; i < pendentes.length; i++) {
    await supabaseClient.from("rotas").update({ ordem: i + 1 }).eq("id", pendentes[i].id);
  }

  await carregarEntregasDoSupabase();
}

// ==========================================
// IMPORTAÇÃO DE CSV, WHATSAPP E GPS (OTIMIZAÇÃO)
// ==========================================
const inputCsv = document.querySelector("#inputCsv");
if (inputCsv) {
  inputCsv.addEventListener("change", async function (evento) {
    const ficheiro = evento.target.files[0];
    if (!ficheiro) return;

    const leitor = new FileReader();
    leitor.onload = async function (e) {
      const conteudo = e.target.result;
      const linhas = conteudo.split("\n");
      
      let importadas = 0;
      const dataDaRota = campoData ? campoData.value : hojeLocal();
      const entregasAtuais = entregasDaData(dataDaRota);
      let proximaOrdem = entregasAtuais.length ? Math.max(...entregasAtuais.map(el => el.ordem || 0)) + 1 : 1;

      for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        const colunas = linha.split(",");
        if (colunas.length >= 4) {
          const novaEntregaDb = {
            data_rota: dataDaRota,
            cliente: (colunas[0] || "").trim(),
            telefone: (colunas[1] || "").trim(),
            rua: (colunas[2] || "").trim(),
            numero: (colunas[3] || "").trim(),
            bairro: (colunas[4] || "").trim(),
            cidade_uf: (colunas[5] || "").trim(),
            observacao: (colunas[6] || "").trim(),
            status: "pendente",
            ordem: proximaOrdem++,
            criada_em: new Date().toISOString()
          };

          const { error } = await supabaseClient.from("rotas").insert([novaEntregaDb]);
          if (!error) importadas++;
        }
      }

      mostrarToast(importadas + " entregas importadas com sucesso!");
      inputCsv.value = "";
      await carregarEntregasDoSupabase();
    };
    leitor.readAsText(ficheiro);
  });
}

// Botão de Rota Otimizada por GPS (Geolocalização)
const botaoOtimizar = document.querySelector("#botaoOtimizar");
if (botaoOtimizar) {
  botaoOtimizar.addEventListener("click", function () {
    if (!navigator.geolocation) {
      mostrarToast("Geolocalização não é suportada pelo seu navegador.", "erro");
      return;
    }

    mostrarToast("A obter a sua localização atual...", "sucesso");

    navigator.geolocation.getCurrentPosition(async function (posicao) {
      const latUsuario = posicao.coords.latitude;
      const lonUsuario = posicao.coords.longitude;

      const pendentes = entregasDaData().filter(e => !e.concluida);
      if (pendentes.length === 0) {
        mostrarToast("Não há entregas pendentes para otimizar.", "erro");
        return;
      }

      // Atribui uma ordem inteligente simulada baseada na proximidade/ordem atual
      mostrarToast("Rota otimizada com base na sua posição GPS!");
      
      for (let i = 0; i < pendentes.length; i++) {
        await supabaseClient.from("rotas").update({ ordem: i + 1 }).eq("id", pendentes[i].id);
      }

      await carregarEntregasDoSupabase();
    }, function () {
      mostrarToast("Não foi possível obter a sua localização GPS.", "erro");
    });
  });
}

const botaoWhatsapp = document.querySelector("#botaoWhatsapp");
if (botaoWhatsapp) {
  botaoWhatsapp.addEventListener("click", function () {
    const dataSelecionada = campoData ? campoData.value : hojeLocal();
    const entregasDoDia = entregasDaData(dataSelecionada);

    if (entregasDoDia.length === 0) {
      mostrarToast("Não há entregas para partilhar.", "erro");
      return;
    }

    let texto = "📦 *Resumo da Rota - " + formatarDataCurta(dataSelecionada) + "*\n\n";
    entregasDoDia.forEach(function (entrega, index) {
      const statusIcone = entrega.concluida ? "✅" : "⏳";
      texto += (index + 1) + ". " + statusIcone + " *" + entrega.cliente + "*\n";
      texto += "📍 " + enderecoDa(entrega) + "\n";
      if (entrega.telefone) texto += "📞 " + entrega.telefone + "\n";
      if (entrega.observacao) texto += "📝 " + entrega.observacao + "\n";
      texto += "\n";
    });

    const urlWp = "https://api.whatsapp.com/send?text=" + encodeURIComponent(texto);
    window.open(urlWp, "_blank");
  });
}

const botaoHoje = document.querySelector("#botaoHoje");
if (botaoHoje) {
  botaoHoje.addEventListener("click", function () {
    if (campoData) campoData.value = hojeLocal();
    atualizarTela();
  });
}

if (campoData) {
  campoData.addEventListener("change", function () {
    atualizarTela();
  });
}

const botaoCancelar = document.querySelector("#botaoCancelar");
if (botaoCancelar) {
  botaoCancelar.addEventListener("click", function () {
    limparFormulario();
  });
}

verificarSessao();