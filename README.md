# Gestão de Rotas de Entregas

Aplicação web responsiva para organizar entregas diárias de forma simples. Cadastre os pedidos na ordem da rota, acompanhe o progresso e abra cada endereço no Google Maps ou no Waze.

## Funcionalidades

- Cadastro de cliente, telefone, endereço e observações.
- Organização manual da sequência de entregas com os botões para subir e descer.
- Destaque da próxima entrega.
- Abertura do endereço no Google Maps ou no Waze.
- Marcação de entregas como concluídas, com opção de desfazer.
- Indicadores de entregas totais, pendentes e concluídas.
- Edição e exclusão de entregas.
- Salvamento local dos dados no navegador usando `localStorage`.
- Interface responsiva para computador e celular.
- Data do dia preenchida automaticamente.

## Tecnologias

- HTML5
- CSS3
- JavaScript (Vanilla JS / ES6+)
- `localStorage` para persistência local

## Como executar

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` em um navegador moderno.
3. Cadastre cada entrega, incluindo rua, número, bairro e cidade/UF.
4. Use as setas para ajustar a ordem das paradas.
5. Na entrega atual, escolha Google Maps ou Waze para navegar.
6. Ao finalizar, toque em **Marcar como entregue**. Ela sairá da lista pendente e ficará em **Entregas concluídas**.

Não é necessário instalar dependências ou configurar um servidor. Para desenvolvimento, também é possível abrir a pasta no Visual Studio Code e usar a extensão Live Server.

## Estrutura do projeto

text
.
├── index.html   # Estrutura da aplicação
├── style.css    # Estilos e layout responsivo
├── script.js    # Cadastro, rota, navegação e armazenamento local
└── README.md    # Documentação
