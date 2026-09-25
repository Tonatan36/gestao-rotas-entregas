# 📦 Gestão de Rotas de Entregas

Aplicação web responsiva para organizar entregas diárias de forma simples e integrada com a nuvem. Cadastre os pedidos na ordem da rota, acompanhe o progresso e abra cada endereço no Google Maps ou no Waze.

## 🚀 Funcionalidades

* **Autenticação Segura:** Login individual para utilizadores integrado via Supabase.
* **Gestão Completa:** Cadastro de cliente, telefone, endereço, observações e data da rota.
* **Importação em Lote (CSV):** Carregamento rápido de vários endereços de uma só vez através de planilhas.
* **Otimização por GPS:** Ordenação inteligente de paradas baseada na geolocalização do dispositivo.
* **Integração com WhatsApp:** Geração automática e partilha do resumo da rota formatada para o mensageiro.
* **Organização Flexível:** Botões para subir e descer a sequência de entregas manualmente.
* **Destaques e Indicadores:** Indicação da próxima entrega e contadores de totais, pendentes e concluídas.
* **Ações Rápidas:** Edição, exclusão e marcação de entregas como concluídas (com opção de desfazer).
* **Navegação Integrada:** Abertura direta do endereço no Google Maps ou no Waze.
* **Interface Responsiva:** Otimizada para computador e telemóvel.

## 🛠️ Tecnologias Utilizadas

* **HTML5**
* **CSS3**
* **JavaScript (Vanilla JS / ES6+)**
* **Supabase (Backend, Banco de Dados PostgreSQL e Autenticação)**
* **Hospedagem:** Vercel

## 📱 Como Utilizar

1. Faça login com as credenciais autorizadas.
2. Selecione a data desejada ou importe as entregas via ficheiro CSV.
3. Cadastre novas entregas manualmente ou otimize a ordem usando o GPS.
4. Use as setas para ajustar a sequência, se preferir.
5. Na entrega atual, escolha Google Maps ou Waze para navegar.
6. Ao finalizar, clique em "Entregue" para mover para as concluídas.
7. Partilhe o resumo da rota com a equipa diretamente pelo WhatsApp.

## 🗂️ Estrutura do Projeto

```text
.
├── index.html      # Estrutura e layout da aplicação
├── style.css       # Estilos e design responsivo
├── script.js       # Lógica, Supabase, GPS, CSV e WhatsApp
└── README.md       # Documentação do projeto
