const CHAVE_DADOS = "rota-entregas-v1";

const form = document.querySelector("#formEntrega");
const listaPendentes = document.querySelector("#listaPendentes");
const listaConcluidas = document.querySelector("#listaConcluidas");
const campoId = document.querySelector("#entregaId");

let entregas = carregarEntregas();

function carregarEntregas() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_DADOS));
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvarEntregas() {
  try {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify(entregas));
    return true;
  } catch {
    alert("Não foi possível salvar. Verifique o espaço disponível no navegador.");
    return false;
  }
}

function criarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `\({Date.now()}-\){Math.random().toString(16).slice(2)}`;
}

function hojeLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `\({ano}-\){mes}-${dia}`;
}

function escaparHTML(valor = "") {
  return String(valor).replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[caractere]);
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

function entregasDeHoje() {
  return entregas
    .filter(entrega => entrega.data === hojeLocal())
    .sort((a, b) => a.ordem - b.ordem);
}

function montarCartao(entrega, indice, totalPendentes, concluida = false) {
  const endereco = enderecoDa(entrega);
  const telefoneLimpo = (entrega.telefone || "").replace(/[^\d+]/g, "");

  const urlGoogle = new URL("https://www.google.com/maps/dir/");
  urlGoogle.searchParams.set("api", "1");
  urlGoogle.searchParams.set("destination", endereco);
  urlGoogle.searchParams.set("travelmode", "driving");

  const urlWaze =
    `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`;

  let etiqueta;

  if (concluida) {
    etiqueta = '<span class="etiqueta concluida">Concluída</span>';
  } else if (indice === 0) {
    etiqueta = '<span class="etiqueta">Próxima entrega</span>';
  } else {
    etiqueta = `<span class="etiqueta">Parada ${indice + 1}</span>`;
  }

  return `
    <article class="entrega \({indice === 0 && !concluida ? "proxima" : ""} \){concluida ? "entrega-finalizada" : ""}">
      <div class="entrega-cabecalho">
        <div>
          <h3>${escaparHTML(entrega.cliente)}</h3>
          <p class="endereco">${escaparHTML(endereco)}</p>
        </div>
        ${etiqueta}
      </div>

      ${entrega.telefone ? `
        <p class="detalhe">
          Telefone:
          <a href="tel:${escaparHTML(telefoneLimpo)}">
            ${escaparHTML(entrega.telefone)}
          </a>
        </p>` : ""}

      ${entrega.observacao ? `
        <p class="detalhe">
          <strong>Observação:</strong>
          ${escaparHTML(entrega.observacao)}
        </p>` : ""}

      <div class="acoes-entrega">
        ${!concluida ? `
          <a class="link-mapa"
             href="${urlGoogle.toString()}"
             target="_blank"
             rel="noopener noreferrer">
            Navegar no Google Maps
          </a>

          <a class="link-mapa"
             href="${urlWaze}"
             target="_blank"
             rel="noopener noreferrer">
            Navegar no Waze
          </a>

          <button class="botao-pequeno"
                  data-acao="subir"
                  data-id="${escaparHTML(entrega.id)}"
                  ${indice === 0 ? "disabled" : ""}
                  aria-label="Mover entrega para cima">
            ↑
          </button>

          <button class="botao-pequeno"
                  data-acao="descer"
                  data-id="${escaparHTML(entrega.id)}"
                  ${indice === totalPendentes - 1 ? "disabled" : ""}
                  aria-label="Mover entrega para baixo">
            ↓
          </button>

          <button class="botao-pequeno"
                  data-acao="editar"
                  data-id="${escaparHTML(entrega.id)}">
            Editar
          </button>

          <button class="botao-pequeno botao-marcar"
                  data-acao="concluir"
                  data-id="${escaparHTML(entrega.id)}">
            Marcar como entregue
          </button>

          <button class="botao-pequeno"
                  data-acao="excluir"
                  data-id="${escaparHTML(entrega.id)}">
            Excluir
          </button>
        ` : `
          <button class="botao-pequeno"
                  data-acao="desfazer"
                  data-id="${escaparHTML(entrega.id)}">
            Voltar para pendentes
          </button>
        `}
      </div>
    </article>
  `;
}

function atualizarTela() {
  const doDia = entregasDeHoje();
  const pendentes = doDia.filter(entrega => !entrega.concluida);
  const concluidas = doDia.filter(entrega => entrega.concluida);

  document.querySelector("#totalEntregas").textContent = doDia.length;
  document.querySelector("#totalPendentes").textContent = pendentes.length;
  document.querySelector("#totalConcluidas").textContent = concluidas.length;
  document.querySelector("#contadorConcluidas").textContent = concluidas.length;

  const data = new Date(`${hojeLocal()}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  document.querySelector("#dataHoje").textContent =
    data.charAt(0).toUpperCase() + data.slice(1);

  if (pendentes.length === 0) {
    listaPendentes.innerHTML = doDia.length
      ? '<div class="vazio">Rota concluída! Todas as entregas foram feitas. 🎉</div>'
      : '<div class="vazio">Nenhuma entrega cadastrada hoje. Adicione a primeira acima.</div>';
  } else {
    listaPendentes.innerHTML = pendentes
      .map((entrega, indice) =>
        montarCartao(entrega, indice, pendentes.length)
      )
      .join("");
  }

  const textoProgresso = document.querySelector("#textoProgresso");

  if (doDia.length === 0) {
    textoProgresso.textContent = "Adicione entregas para começar.";
  } else {
    textoProgresso.textContent =
      concluidas.length +
      " de " +
      doDia.length +
      " entregas concluídas.";
  }

  if (concluidas.length === 0) {
    listaConcluidas.innerHTML =
      '<div class="vazio">As entregas concluídas aparecerão aqui.</div>';
  } else {
    listaConcluidas.innerHTML = concluidas
      .map((entrega, indice) =>
        montarCartao(entrega, indice, concluidas.length, true)
      )
      .join("");
  }
}

function limparFormulario() {
  form.reset();
  campoId.value = "";

  document.querySelector("#botaoSalvar").textContent = "Adicionar à rota";
  document.querySelector("#botaoCancelar").classList.add("escondido");
}

form.addEventListener("submit", evento => {
  evento.preventDefault();

  const dados = {
    cliente: document.querySelector("#cliente").value.trim(),
    telefone: document.querySelector("#telefone").value.trim(),
    rua: document.querySelector("#rua").value.trim(),
    numero: document.querySelector("#numero").value.trim(),
    bairro: document.querySelector("#bairro").value.trim(),
    cidadeUf: document.querySelector("#cidadeUf").value.trim(),
    observacao: document.querySelector("#observacao").value.trim()
  };

  if (campoId.value) {
    const existente = entregas.find(
      entrega => entrega.id === campoId.value
    );

    if (existente) {
      Object.assign(existente, dados);
    }
  } else {
    const daRota = entregasDeHoje();

    const maiorOrdem = daRota.length
      ? Math.max(...daRota.map(entrega => entrega.ordem))
      : 0;

    entregas.push({
      id: criarId(),
      ...dados,
      data: hojeLocal(),
      ordem: maiorOrdem + 1,
      concluida: false,
      criadaEm: Date.now()
    });
  }

  if (salvarEntregas()) {
    limparFormulario();
    atualizarTela();
  }
});

function trocarOrdem(id, direcao) {
  const pendentes = entregasDeHoje()
    .filter(entrega => !entrega.concluida);

  const indice = pendentes.findIndex(entrega => entrega.id === id);
  const novoIndice = indice + direcao;

  if (indice < 0 || novoIndice < 0 || novoIndice >= pendentes.length) {
    return;
  }

  [pendentes[indice], pendentes[novoIndice]] =
    [pendentes[novoIndice], pendentes[indice]];

  pendentes.forEach((entrega, posicao) => {
    entrega.ordem = posicao + 1;
  });

  const concluidas = entregasDeHoje()
    .filter(entrega => entrega.concluida);

  concluidas.forEach((entrega, posicao) => {
    entrega.ordem = pendentes.length + posicao + 1;
  });

  if (salvarEntregas()) {
    atualizarTela();
  }
}

document.addEventListener("click", evento => {
  const botao = evento.target.closest("button[data-acao]");

  if (!botao) {
    return;
  }

  const entrega = entregas.find(
    item => item.id === botao.dataset.id
  );

  if (!entrega) {
    return;
  }

  const acao = botao.dataset.acao;

  if (acao === "subir") {
    trocarOrdem(entrega.id, -1);
    return;
  }

  if (acao === "descer") {
    trocarOrdem(entrega.id, 1);
    return;
  }

  if (acao === "editar") {
    campoId.value = entrega.id;

    document.querySelector("#cliente").value = entrega.cliente;
    document.querySelector("#telefone").value = entrega.telefone || "";
    document.querySelector("#rua").value = entrega.rua;
    document.querySelector("#numero").value = entrega.numero;
    document.querySelector("#bairro").value = entrega.bairro;
    document.querySelector("#cidadeUf").value = entrega.cidadeUf || "";
    document.querySelector("#observacao").value = entrega.observacao || "";

    document.querySelector("#botaoSalvar").textContent = "Salvar alterações";
    document.querySelector("#botaoCancelar").classList.remove("escondido");
    document.querySelector("#cliente").focus();

    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (acao === "concluir") {
    entrega.concluida = true;
    entrega.concluidaEm = Date.now();
  }

  if (acao === "desfazer") {
    entrega.concluida = false;
    delete entrega.concluidaEm;
  }

  if (acao === "excluir") {
    if (!confirm(`Excluir a entrega de ${entrega.cliente}?`)) {
      return;
    }

    entregas = entregas.filter(item => item.id !== entrega.id);
  }

  if (salvarEntregas()) {
    atualizarTela();
  }
});

document.querySelector("#botaoCancelar").addEventListener("click", limparFormulario);

atualizarTela();
