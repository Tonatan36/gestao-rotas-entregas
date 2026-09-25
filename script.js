// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
const SUPABASE_URL = "https://hzgrulwdktmkgnxggsum.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zPhD9y1Kvhf06Ju95ExLZA_vk2rpZbp";

let supabaseClient = null;

if (window.supabase && typeof window.supabase.createClient === "function") {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
} else {
  console.error(
    "Erro: a biblioteca do Supabase não foi carregada antes do script.js."
  );
}

// ==========================================
// ELEMENTOS DA TELA
// ==========================================
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

// ==========================================
// MENSAGENS DE FEEDBACK
// ==========================================
function mostrarToast(mensagem, tipo) {
  const tipoToast = tipo || "sucesso";
  const container = document.querySelector("#toastContainer");

  if (!container) {
    console.log(mensagem);
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast " + tipoToast;
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
// LOGIN E SESSÃO
// ==========================================
async function verificarSessao() {
  if (!supabaseClient) {
    if (authContainer) authContainer.style.display = "block";
    if (appContainer) appContainer.style.display = "none";
    return;
  }

  try {
    const resposta = await supabaseClient.auth.getSession();
    const session = resposta.data ? resposta.data.session : null;

    if (session) {
      if (authContainer) authContainer.style.display = "none";
      if (appContainer) appContainer.style.display = "block";

      await carregarEntregasDoSupabase();
    } else {
      if (authContainer) authContainer.style.display = "block";
      if (appContainer) appContainer.style.display = "none";
    }
  } catch (erro) {
    console.error("Erro ao verificar sessão:", erro);

    if (authContainer) authContainer.style.display = "block";
    if (appContainer) appContainer.style.display = "none";
  }
}

if (formLogin) {
  formLogin.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!supabaseClient) {
      mostrarToast("O Supabase não foi carregado.", "erro");
      return;
    }

    const campoLoginNome = document.querySelector("#loginNome");
    const campoLoginSenha = document.querySelector("#loginSenha");

    if (!campoLoginNome || !campoLoginSenha) {
      mostrarToast("Não encontrei os campos do login no HTML.", "erro");
      return;
    }

    if (msgErroLogin) {
      msgErroLogin.style.display = "none";
    }

    const nomeDigitado = campoLoginNome.value.trim().toLowerCase();
    const senha = campoLoginSenha.value;

    if (!nomeDigitado || !senha) {
      if (msgErroLogin) {
        msgErroLogin.textContent = "Digite seu nome de usuário e senha.";
        msgErroLogin.style.display = "block";
      }
      return;
    }

    const emailLogin =
      nomeDigitado.replace(/\s+/g, "") + "@rotas.local";

    const resposta = await supabaseClient.auth.signInWithPassword({
      email: emailLogin,
      password: senha
    });

    if (resposta.error) {
      console.error("Erro de login:", resposta.error);

      if (msgErroLogin) {
        msgErroLogin.textContent = "Nome de usuário ou senha incorretos.";
        msgErroLogin.style.display = "block";
      }
      return;
    }

    mostrarToast("Login efetuado com sucesso!", "sucesso");
    await verificarSessao();
  });
}

if (botaoSair) {
  botaoSair.addEventListener("click", async function () {
    if (!supabaseClient) return;

    const resposta = await supabaseClient.auth.signOut();

    if (resposta.error) {
      console.error("Erro ao sair:", resposta.error);
      mostrarToast("Não foi possível sair da conta.", "erro");
      return;
    }

    entregas = [];
    atualizarTela();
    await verificarSessao();
  });
}

// ==========================================
// CARREGAR ENTREGAS DO SUPABASE
// ==========================================
async function carregarEntregasDoSupabase() {
  if (!supabaseClient) return;

  try {
    const resposta = await supabaseClient
      .from("rotas")
      .select("*")
      .order("data_rota", { ascending: true })
      .order("ordem", { ascending: true });

    if (resposta.error) {
      console.error("Erro ao carregar entregas:", resposta.error);
      mostrarToast(
        "Não foi possível carregar as entregas. Confira a tabela e as permissões.",
        "erro"
      );
      return;
    }

    entregas = (resposta.data || []).map(function (item) {
      return {
        id: String(item.id),
        data: item.data_rota || "",
        cliente: item.cliente || "",
        telefone: item.telefone || "",
        rua: item.rua || "",
        numero: item.numero || "",
        bairro: item.bairro || "",
        cidadeUf: item.cidade_uf || "",
        observacao: item.observacao || "",
        concluida: item.status === "concluida",
        ordem: Number(item.ordem) || 0,
        criadaEm: item.criada_em
          ? new Date(item.criada_em).getTime()
          : Date.now(),
        concluidaEm: item.concluida_em
          ? new Date(item.concluida_em).getTime()
          : null
      };
    });

    atualizarTela();
  } catch (erro) {
    console.error("Erro inesperado ao carregar entregas:", erro);
    mostrarToast("Erro de conexão ao carregar as entregas.", "erro");
  }
}

// ==========================================
// FUNÇÕES AUXILIARES
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
  const dataUsada =
    data || (campoData ? campoData.value : "") || hojeLocal();

  return entregas
    .filter(function (entrega) {
      return entrega.data === dataUsada;
    })
    .sort(function (a, b) {
      return (Number(a.ordem) || 0) - (Number(b.ordem) || 0);
    });
}

// ==========================================
// MONTAR OS CARDS E SEUS BOTÕES
// ==========================================
function montarCartao(entrega, indice, totalPendentes, concluida) {
  const endereco = enderecoDa(entrega);
  const telefoneLimpo = (entrega.telefone || "").replace(/[^\d+]/g, "");
  const idSeguro = escaparHTML(entrega.id);

  const urlGoogle = new URL("https://www.google.com/maps/dir/");
  urlGoogle.searchParams.set("api", "1");
  urlGoogle.searchParams.set("destination", endereco);
  urlGoogle.searchParams.set("travelmode", "driving");

  const urlWaze =
    "https://waze.com/ul?q=" +
    encodeURIComponent(endereco) +
    "&navigate=yes";

  let etiqueta = "";

  if (concluida) {
    etiqueta = '<span class="etiqueta concluida">Concluída</span>';
  } else if (indice === 0) {
    etiqueta = '<span class="etiqueta">Próxima entrega</span>';
  } else {
    etiqueta =
      '<span class="etiqueta">Parada ' + (indice + 1) + "</span>";
  }

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
      '<button type="button" class="botao-pequeno" ' +
      'data-acao="desfazer" data-id="' + idSeguro + '">' +
      "Voltar para pendentes</button>";
  } else {
    botoesHTML =
      '<a class="link-mapa" href="' +
      escaparHTML(urlGoogle.toString()) +
      '" target="_blank" rel="noopener noreferrer">Google Maps</a>' +

      '<a class="link-mapa" href="' +
      escaparHTML(urlWaze) +
      '" target="_blank" rel="noopener noreferrer">Waze</a>' +

      '<button type="button" class="botao-pequeno" ' +
      'data-acao="subir" data-id="' + idSeguro + '" ' +
      (indice === 0 ? "disabled " : "") +
      'aria-label="Mover entrega para cima">↑</button>' +

      '<button type="button" class="botao-pequeno" ' +
      'data-acao="descer" data-id="' + idSeguro + '" ' +
      (indice === totalPendentes - 1 ? "disabled " : "") +
      'aria-label="Mover entrega para baixo">↓</button>' +

      '<button type="button" class="botao-pequeno" ' +
      'data-acao="editar" data-id="' + idSeguro + '">Editar</button>' +

      '<button type="button" class="botao-pequeno botao-marcar" ' +
      'data-acao="concluir" data-id="' + idSeguro + '">Entregue</button>' +

      '<button type="button" class="botao-pequeno" ' +
      'data-acao="excluir" data-id="' + idSeguro + '">Excluir</button>';
  }

  const classes =
    "entrega " +
    (!concluida && indice === 0 ? "proxima " : "") +
    (concluida ? "entrega-finalizada" : "");

  return (
    '<article class="' + classes + '">' +
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

// ==========================================
// ATUALIZAR A TELA
// ==========================================
function atualizarTela() {
  const dataSelecionada =
    (campoData ? campoData.value : "") || hojeLocal();

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
    elTitulo.textContent = eHoje
      ? "Rota do dia"
      : "Rota de " + formatarDataCurta(dataSelecionada);
  }

  if (elDataHoje && dataPorExtenso) {
    elDataHoje.textContent =
      dataPorExtenso.charAt(0).toUpperCase() +
      dataPorExtenso.slice(1);
  }

  const totalEntregas = document.querySelector("#totalEntregas");
  const totalPendentes = document.querySelector("#totalPendentes");
  const totalConcluidas = document.querySelector("#totalConcluidas");
  const contadorConcluidas = document.querySelector("#contadorConcluidas");

  if (totalEntregas) totalEntregas.textContent = entregasDoDia.length;
  if (totalPendentes) totalPendentes.textContent = pendentes.length;
  if (totalConcluidas) totalConcluidas.textContent = concluidas.length;
  if (contadorConcluidas) {
    contadorConcluidas.textContent = concluidas.length;
  }

  const avisoData = document.querySelector("#avisoDataCadastro");

  if (avisoData) {
    avisoData.textContent =
      "Novas entregas serão registradas em " +
      formatarDataCurta(dataSelecionada) +
      ".";
  }

  if (listaPendentes) {
    if (pendentes.length === 0) {
      if (entregasDoDia.length > 0) {
        listaPendentes.innerHTML =
          '<div class="vazio">Rota concluída! 🎉</div>';
      } else {
        listaPendentes.innerHTML =
          '<div class="vazio">Nenhuma entrega em ' +
          escaparHTML(formatarDataCurta(dataSelecionada)) +
          ".</div>";
      }
    } else {
      listaPendentes.innerHTML = pendentes
        .map(function (entrega, indice) {
          return montarCartao(
            entrega,
            indice,
            pendentes.length,
            false
          );
        })
        .join("");
    }
  }

  const textoProgresso = document.querySelector("#textoProgresso");

  if (textoProgresso) {
    if (entregasDoDia.length === 0) {
      textoProgresso.textContent = "Adicione entregas para começar.";
    } else {
      textoProgresso.textContent =
        concluidas.length +
        " de " +
        entregasDoDia.length +
        " entregas concluídas.";
    }
  }

  if (listaConcluidas) {
    if (concluidas.length === 0) {
      listaConcluidas.innerHTML =
        '<div class="vazio">Não há entregas concluídas nesta data.</div>';
    } else {
      listaConcluidas.innerHTML = concluidas
        .map(function (entrega, indice) {
          return montarCartao(
            entrega,
            indice,
            concluidas.length,
            true
          );
        })
        .join("");
    }
  }
}

// ==========================================
// FORMULÁRIO DE CADASTRO E EDIÇÃO
// ==========================================
function limparFormulario() {
  if (form) form.reset();
  if (campoId) campoId.value = "";

  const botaoSalvar = document.querySelector("#botaoSalvar");
  const botaoCancelar = document.querySelector("#botaoCancelar");

  if (botaoSalvar) {
    botaoSalvar.textContent = "Adicionar à rota";
  }

  if (botaoCancelar) {
    botaoCancelar.classList.add("escondido");
  }
}

function preencherFormulario(entrega) {
  if (!entrega) return;

  campoId.value = String(entrega.id);

  document.querySelector("#cliente").value = entrega.cliente || "";
  document.querySelector("#telefone").value = entrega.telefone || "";
  document.querySelector("#rua").value = entrega.rua || "";
  document.querySelector("#numero").value = entrega.numero || "";
  document.querySelector("#bairro").value = entrega.bairro || "";
  document.querySelector("#cidadeUf").value = entrega.cidadeUf || "";
  document.querySelector("#observacao").value = entrega.observacao || "";

  const botaoSalvar = document.querySelector("#botaoSalvar");
  const botaoCancelar = document.querySelector("#botaoCancelar");

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar alterações";
  }

  if (botaoCancelar) {
    botaoCancelar.classList.remove("escondido");
  }

  document.querySelector("#cliente").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

if (form) {
  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!supabaseClient) {
      mostrarToast("O Supabase não está conectado.", "erro");
      return;
    }

    const dados = {
      cliente: document.querySelector("#cliente").value.trim(),
      telefone: document.querySelector("#telefone").value.trim(),
      rua: document.querySelector("#rua").value.trim(),
      numero: document.querySelector("#numero").value.trim(),
      bairro: document.querySelector("#bairro").value.trim(),
      cidade_uf: document.querySelector("#cidadeUf").value.trim(),
      observacao: document.querySelector("#observacao").value.trim()
    };

    const idEdicao = campoId ? campoId.value.trim() : "";

    if (idEdicao) {
      const resposta = await supabaseClient
        .from("rotas")
        .update(dados)
        .eq("id", idEdicao);

      if (resposta.error) {
        console.error("Erro ao editar entrega:", resposta.error);
        mostrarToast("Erro ao editar. Confira as permissões do Supabase.", "erro");
        return;
      }

      mostrarToast("Entrega atualizada.", "sucesso");
    } else {
      const dataDaRota =
        (campoData ? campoData.value : "") || hojeLocal();

      const entregasDaRota = entregasDaData(dataDaRota);

      const maiorOrdem = entregasDaRota.length
        ? Math.max.apply(
            null,
            entregasDaRota.map(function (entrega) {
              return Number(entrega.ordem) || 0;
            })
          )
        : 0;

      const novaEntrega = {
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

      const resposta = await supabaseClient
        .from("rotas")
        .insert([novaEntrega]);

      if (resposta.error) {
        console.error("Erro ao cadastrar entrega:", resposta.error);
        mostrarToast("Erro ao cadastrar entrega. Confira as permissões.", "erro");
        return;
      }

      mostrarToast("Entrega adicionada à rota.", "sucesso");
    }

    limparFormulario();
    await carregarEntregasDoSupabase();
  });
}

const botaoCancelar = document.querySelector("#botaoCancelar");

if (botaoCancelar) {
  botaoCancelar.addEventListener("click", limparFormulario);
}

// ==========================================
// ALTERAR STATUS DA ENTREGA
// ==========================================
async function alterarStatusEntrega(id, concluida) {
  const novoStatus = concluida ? "concluida" : "pendente";
  const dataConclusao = concluida ? new Date().toISOString() : null;

  const resposta = await supabaseClient
    .from("rotas")
    .update({
      status: novoStatus,
      concluida_em: dataConclusao
    })
    .eq("id", id);

  if (resposta.error) {
    console.error("Erro ao alterar status:", resposta.error);
    mostrarToast("Não foi possível atualizar a entrega.", "erro");
    return;
  }

  mostrarToast(
    concluida
      ? "Entrega concluída! A próxima parada foi atualizada."
      : "Entrega voltou para pendentes.",
    "sucesso"
  );

  await carregarEntregasDoSupabase();
}

// ==========================================
// EXCLUIR ENTREGA
// ==========================================
async function excluirEntrega(id) {
  if (!confirm("Deseja realmente excluir esta entrega?")) {
    return;
  }

  const resposta = await supabaseClient
    .from("rotas")
    .delete()
    .eq("id", id);

  if (resposta.error) {
    console.error("Erro ao excluir entrega:", resposta.error);
    mostrarToast("Não foi possível excluir. Confira as permissões.", "erro");
    return;
  }

  mostrarToast("Entrega excluída.", "sucesso");
  await carregarEntregasDoSupabase();
}

// ==========================================
// SUBIR E DESCER NA ORDEM DA ROTA
// ==========================================
async function moverEntrega(id, direcao) {
  const dataSelecionada =
    (campoData ? campoData.value : "") || hojeLocal();

  const pendentes = entregasDaData(dataSelecionada).filter(function (entrega) {
    return !entrega.concluida;
  });

  const indiceAtual = pendentes.findIndex(function (entrega) {
    return String(entrega.id) === String(id);
  });

  if (indiceAtual < 0) {
    mostrarToast("Não encontrei essa entrega na rota selecionada.", "erro");
    return;
  }

  const indiceDestino = indiceAtual + direcao;

  if (indiceDestino < 0 || indiceDestino >= pendentes.length) {
    return;
  }

  const entregaAtual = pendentes[indiceAtual];
  const entregaVizinha = pendentes[indiceDestino];

  const ordemAtual = Number(entregaAtual.ordem) || 0;
  const ordemVizinha = Number(entregaVizinha.ordem) || 0;

  const maiorOrdemGeral = entregas.length
    ? Math.max.apply(
        null,
        entregas.map(function (entrega) {
          return Number(entrega.ordem) || 0;
        })
      )
    : 0;

  const ordemTemporaria = maiorOrdemGeral + 1;

  // Primeiro libera a posição atual, para evitar conflito de ordem única.
  const passoUm = await supabaseClient
    .from("rotas")
    .update({ ordem: ordemTemporaria })
    .eq("id", entregaAtual.id);

  if (passoUm.error) {
    console.error("Erro ao iniciar troca de posição:", passoUm.error);
    mostrarToast("Não foi possível mover a entrega.", "erro");
    return;
  }

  // A entrega vizinha assume a posição da entrega selecionada.
  const passoDois = await supabaseClient
    .from("rotas")
    .update({ ordem: ordemAtual })
    .eq("id", entregaVizinha.id);

  if (passoDois.error) {
    console.error("Erro ao atualizar posição vizinha:", passoDois.error);

    await supabaseClient
      .from("rotas")
      .update({ ordem: ordemAtual })
      .eq("id", entregaAtual.id);

    mostrarToast("Não foi possível reorganizar a rota.", "erro");
    await carregarEntregasDoSupabase();
    return;
  }

  // A entrega selecionada ocupa a posição da vizinha.
  const passoTres = await supabaseClient
    .from("rotas")
    .update({ ordem: ordemVizinha })
    .eq("id", entregaAtual.id);

  if (passoTres.error) {
    console.error("Erro ao finalizar troca de posição:", passoTres.error);

    // Tenta restaurar as posições originais se a última atualização falhar.
    await supabaseClient
      .from("rotas")
      .update({ ordem: ordemAtual })
      .eq("id", entregaAtual.id);

    await supabaseClient
      .from("rotas")
      .update({ ordem: ordemVizinha })
      .eq("id", entregaVizinha.id);

    mostrarToast("Não foi possível concluir a reorganização.", "erro");
    await carregarEntregasDoSupabase();
    return;
  }

  await carregarEntregasDoSupabase();
}

// ==========================================
// AÇÕES DOS BOTÕES DOS CARDS
// ==========================================
document.addEventListener("click", async function (evento) {
  const alvo = evento.target;

  if (!alvo || typeof alvo.closest !== "function") {
    return;
  }

  const botao = alvo.closest("button[data-acao]");

  if (!botao) {
    return;
  }

  if (!supabaseClient) {
    mostrarToast("O Supabase não está conectado.", "erro");
    return;
  }

  const acao = botao.getAttribute("data-acao");
  const id = botao.getAttribute("data-id");

  if (!id) {
    mostrarToast("O botão não encontrou o ID da entrega.", "erro");
    return;
  }

  if (acao === "subir") {
    await moverEntrega(id, -1);
    return;
  }

  if (acao === "descer") {
    await moverEntrega(id, 1);
    return;
  }

  if (acao === "editar") {
    const entrega = entregas.find(function (item) {
      return String(item.id) === String(id);
    });

    if (!entrega) {
      mostrarToast("Não encontrei a entrega para editar.", "erro");
      return;
    }

    preencherFormulario(entrega);
    return;
  }

  if (acao === "concluir") {
    await alterarStatusEntrega(id, true);
    return;
  }

  if (acao === "desfazer") {
    await alterarStatusEntrega(id, false);
    return;
  }

  if (acao === "excluir") {
    await excluirEntrega(id);
  }
});

// ==========================================
// HISTÓRICO POR DATA
// ==========================================
if (campoData) {
  campoData.addEventListener("change", function () {
    if (!campoData.value) {
      campoData.value = hojeLocal();
    }

    if (campoId && campoId.value) {
      limparFormulario();
    }

    atualizarTela();
  });
}

const botaoHoje = document.querySelector("#botaoHoje");

if (botaoHoje && campoData) {
  botaoHoje.addEventListener("click", function () {
    campoData.value = hojeLocal();

    if (campoId && campoId.value) {
      limparFormulario();
    }

    atualizarTela();
  });
}

// ==========================================
// EXPORTAÇÃO CSV
// ==========================================
function escaparCSV(valor) {
  const texto = String(valor === undefined || valor === null ? "" : valor)
    .replace(/"/g, '""');

  return '"' + texto + '"';
}

function dataHoraCSV(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("pt-BR");
}

function baixarCSV(registros, nomeArquivo, mensagemVazio) {
  if (!registros.length) {
    mostrarToast(mensagemVazio, "erro");
    return;
  }

  const colunas = [
    "Data da rota",
    "Ordem",
    "Cliente",
    "Telefone",
    "Rua",
    "Número",
    "Bairro",
    "Cidade/UF",
    "Observação",
    "Status",
    "Criada em",
    "Concluída em"
  ];

  const linhas = [colunas.map(escaparCSV).join(";")];

  const ordenadas = registros.slice().sort(function (a, b) {
    const comparacaoData = String(a.data).localeCompare(String(b.data));
    return comparacaoData || (Number(a.ordem) || 0) - (Number(b.ordem) || 0);
  });

  ordenadas.forEach(function (entrega) {
    const valores = [
      formatarDataCurta(entrega.data),
      entrega.ordem,
      entrega.cliente,
      entrega.telefone,
      entrega.rua,
      entrega.numero,
      entrega.bairro,
      entrega.cidadeUf,
      entrega.observacao,
      entrega.concluida ? "Concluída" : "Pendente",
      dataHoraCSV(entrega.criadaEm),
      dataHoraCSV(entrega.concluidaEm)
    ];

    linhas.push(valores.map(escaparCSV).join(";"));
  });

  const conteudo = "\uFEFF" + linhas.join("\r\n");
  const arquivo = new Blob([conteudo], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

const botaoCsvDia = document.querySelector("#botaoCsvDia");

if (botaoCsvDia) {
  botaoCsvDia.addEventListener("click", function () {
    const data = (campoData ? campoData.value : "") || hojeLocal();
    const registros = entregasDaData(data);

    baixarCSV(
      registros,
      "entregas-" + data + ".csv",
      "Não há entregas para exportar em " +
        formatarDataCurta(data) +
        "."
    );
  });
}

const botaoBackupCsv = document.querySelector("#botaoBackupCsv");

if (botaoBackupCsv) {
  botaoBackupCsv.addEventListener("click", function () {
    baixarCSV(
      entregas,
      "backup-rotas-entregas-" + hojeLocal() + ".csv",
      "Não há entregas salvas para fazer backup."
    );
  });
}

// ==========================================
// INICIAR A APLICAÇÃO
// ==========================================
atualizarTela();
verificarSessao();
