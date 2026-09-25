// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = "https://hzgrulwdktmknxggsum.supabase.co";[cite: 2]
const SUPABASE_ANON_KEY = "sb_publishable_zPhD9y1Kvhf06Ju95ExLZA_vk2rpZbp";[cite: 1]

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
campoData.value = hojeLocal();

// ==========================================
// CONTROLE DE SESSÃO E LOGIN POR NOME
// ==========================================
async function verificarSessao() {
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
    msgErroLogin.style.display = "none";

    const nomeDigitado = document.querySelector("#loginNome").value.trim().toLowerCase();
    const senha = document.querySelector("#loginSenha").value.trim();

    // Transforma o nome digitado em um e-mail fictício compatível com o Supabase
    const emailFicticio = nomeDigitado.replace(/\s+/g, "") + "@rotas.local";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailFicticio,
      password: senha,
    });

    if (error) {
      msgErroLogin.textContent = "Nome ou senha incorretos.";
      msgErroLogin.style.display = "block";
    } else {
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
      const mapa = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return mapa[caractere];
    });
}

function formatarData(dataISO) {
  if (!dataISO) return "";

  const partes = dataISO.split("-");
  const ano = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);

  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatarDataCurta(dataISO) {
  if (!dataISO) return "";

  const partes = dataISO.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function enderecoDa(entrega) {
  return [
    entrega.rua,
    entrega.numero,
    entrega.bairro,
    entrega.cidadeUf,
    "Brasil"
  ]
    .filter(Boolean)
    .join(", ");
}

function entregasDaData(data) {
  const dataUsada = data || campoData.value || hojeLocal();

  return entregas
    .filter(function (entrega) {
      return entrega.data === dataUsada;
    })
    .sort(function (a, b) {
      return (a.ordem || 0) - (b.ordem || 0);
    });
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

  const classeEntrega =
    "entrega " +
    (!concluida && indice === 0 ? "proxima " : "") +
    (concluida ? "entrega-finalizada" : "");

  let telefoneHTML = "";

  if (entrega.telefone) {
    telefoneHTML =
      '<p class="detalhe">Telefone: ' +
      '<a href="tel:' + escaparHTML(telefoneLimpo) + '">' +
      escaparHTML(entrega.telefone) +
      "</a></p>";
  }

  let observacaoHTML = "";

  if (entrega.observacao) {
    observacaoHTML =
      '<p class="detalhe"><strong>Observação:</strong> ' +
      escaparHTML(entrega.observacao) +
      "</p>";
  }

  let botoesHTML = "";

  if (concluida) {
    botoesHTML =
      '<button class="botao-pequeno" data-acao="desfazer" data-id="' +
      escaparHTML(entrega.id) +
      '">Voltar para pendentes</button>';
  } else {
    botoesHTML =
      '<a class="link-mapa" href="' +
      escaparHTML(urlGoogle.toString()) +
      '" target="_blank" rel="noopener noreferrer">Navegar no Google Maps</a>' +

      '<a class="link-mapa" href="' +
      escaparHTML(urlWaze) +
      '" target="_blank" rel="noopener noreferrer">Navegar no Waze</a>' +

      '<button class="botao-pequeno" data-acao="subir" data-id="' +
      escaparHTML(entrega.id) +
      '" ' +
      (indice === 0 ? "disabled" : "") +
      ' aria-label="Mover entrega para cima">↑</button>' +

      '<button class="botao-pequeno" data-acao="descer" data-id="' +
      escaparHTML(entrega.id) +
      '" ' +
      (indice === totalPendentes - 1 ? "disabled" : "") +
      ' aria-label="Mover entrega para baixo">↓</button>' +

      '<button class="botao-pequeno" data-acao="editar" data-id="' +
      escaparHTML(entrega.id) +
      '">Editar</button>' +

      '<button class="botao-pequeno botao-marcar" data-acao="concluir" data-id="' +
      escaparHTML(entrega.id) +
      '">Marcar como entregue</button>' +

      '<button class="botao-pequeno" data-acao="excluir" data-id="' +
      escaparHTML(entrega.id) +
      '">Excluir</button>';
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
  const dataSelecionada = campoData.value || hojeLocal();
  const entregasDoDia = entregasDaData(dataSelecionada);

  const pendentes = entregasDoDia.filter(function (entrega) {
    return !entrega.concluida;
  });

  const concluidas = entregasDoDia.filter(function (entrega) {
    return entrega.concluida;
  });

  const dataPorExtenso = formatarData(dataSelecionada);
  const eHoje = dataSelecionada === hojeLocal();

  const elTitulo = document.querySelector("#tituloRota");
  const elDataHoje = document.querySelector("#dataHoje");
  
  if (elTitulo) {
    elTitulo.textContent = eHoje ? "Rota do dia" : "Rota de " + formatarDataCurta(dataSelecionada);
  }

  if (elDataHoje && dataPorExtenso) {
    elDataHoje.textContent = dataPorExtenso.charAt(0).toUpperCase() + dataPorExtenso.slice(1);
  }

  document.querySelector("#totalEntregas").textContent = entregasDoDia.length;
  document.querySelector("#totalPendentes").textContent = pendentes.length;
  document.querySelector("#totalConcluidas").textContent = concluidas.length;
  document.querySelector("#contadorConcluidas").textContent = concluidas.length;

  document.querySelector("#avisoDataCadastro").textContent =
    "Novas entregas serão registradas em " + formatarDataCurta(dataSelecionada) + ".";

  if (pendentes.length === 0) {
    if (entregasDoDia.length > 0) {
      listaPendentes.innerHTML = '<div class="vazio">Rota concluída! Todas as entregas foram feitas. 🎉</div>';
    } else {
      listaPendentes.innerHTML = '<div class="vazio">Nenhuma entrega cadastrada em ' + escaparHTML(formatarDataCurta(dataSelecionada)) + ".</div>";
    }
  } else {
    listaPendentes.innerHTML = pendentes
      .map(function (entrega, indice) {
        return montarCartao(entrega, indice, pendentes.length, false);
      })
      .join("");
  }

  const textoProgresso = document.querySelector("#textoProgresso");
  if (entregasDoDia.length === 0) {
    textoProgresso.textContent = "Adicione entregas para começar.";
  } else {
    textoProgresso.textContent = concluidas.length + " de " + entregasDoDia.length + " entregas concluídas.";
  }

  if (concluidas.length === 0) {
    listaConcluidas.innerHTML = '<div class="vazio">Não há entregas concluídas nesta data.</div>';
  } else {
    listaConcluidas.innerHTML = concluidas
      .map(function (entrega, indice) {
        return montarCartao(entrega, indice, concluidas.length, true);
      })
      .join("");
  }
}

function limparFormulario() {
  form.reset();
  campoId.value = "";
  document.querySelector("#botaoSalvar").textContent = "Adicionar à rota";
  document.querySelector("#botaoCancelar").classList.add("escondido");
}

// ==========================================
// FORMULÁRIO DE CADASTRO / EDIÇÃO NO SUPABASE
// ==========================================
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

  const idEdicao = campoId.value;

  if (idEdicao) {
    const { error } = await supabaseClient
      .from("rotas")
      .update(dados)
      .eq("id", idEdicao);

    if (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar entrega.");
      return;
    }
  } else {
    const dataDaRota = campoData.value || hojeLocal();
    const entregasDaRota = entregasDaData(dataDaRota);
    const maiorOrdem = entregasDaRota.length
      ? Math.max(...entregasDaRota.map(e => e.ordem || 0))
      : 0;

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

    const { error } = await supabaseClient
      .from("rotas")
      .insert([novaEntregaDb]);

    if (error) {
      console.error("Erro ao inserir:", error);
      alert("Erro ao salvar nova entrega.");
      return;
    }
  }

  limparFormulario();
  await carregarEntregasDoSupabase();
});

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
      if (!error) await carregarEntregasDoSupabase();
    }
  } else if (acao === "concluir" || acao === "desfazer") {
    const novoStatus = acao === "concluir" ? "concluida" : "pendente";
    const concluidaEm = acao === "concluir" ? new Date().toISOString() : null;

    const { error } = await supabaseClient
      .from("rotas")
      .update({ status: novoStatus, concluida_em: concluidaEm })
      .eq("id", id);

    if (!error) await carregarEntregasDoSupabase();
  } else if (acao === "editar") {
    const entrega = entregas.find(e => e.id === id);
    if (entrega) {
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
    await supabaseClient
      .from("rotas")
      .update({ ordem: i + 1 })
      .eq("id", pendentes[i].id);
  }

  await carregarEntregasDoSupabase();
}

const botaoHoje = document.querySelector("#botaoHoje");
if (botaoHoje) {
  botaoHoje.addEventListener("click", function () {
    campoData.value = hojeLocal();
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