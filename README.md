# Jogo do Gargalo

Aplicação web para demonstrar, de forma prática, conceitos de fluxo de trabalho, gargalos, WIP (Work in Progress) e acúmulo de tarefas em um processo de desenvolvimento de software.

## Sobre

O jogo simula um fluxo dividido em três etapas:

1. **Produção** — criação das tarefas.
2. **Processamento** — processamento das tarefas durante um determinado período.
3. **Conclusão** — finalização das tarefas processadas.

Todas as telas compartilham o mesmo quadro em tempo real, permitindo que grupos diferentes trabalhem simultaneamente.

## Tecnologias

- HTML
- CSS
- JavaScript
- Firebase Realtime Database
- GitHub Pages
- GitHub Actions

## Funcionamento

As tarefas são criadas no Grupo 1 e podem ser movimentadas entre as etapas por meio de arrastar e soltar.

Ao chegar ao Grupo 2, a tarefa recebe um tempo de processamento. Após o término do contador, ela pode ser enviada ao Grupo 3.

No Grupo 3, a tarefa pode ser concluída. As tarefas concluídas deixam o quadro e são contabilizadas no total de tarefas concluídas.

O estado das tarefas é armazenado no Firebase Realtime Database, permitindo a sincronização entre diferentes computadores.

## Execução local

O projeto não possui processo de build ou dependências instaláveis.

Para executar localmente, utilize um servidor HTTP, como o **Live Server** do Visual Studio Code.

Depois, abra a aplicação pelo endereço fornecido pelo servidor.

Para testar a sincronização, abra o mesmo endereço em duas ou mais janelas do navegador.

## Deploy

O projeto utiliza GitHub Actions para realizar o deploy automático no GitHub Pages.

Cada push para a branch `main` inicia automaticamente o workflow de publicação.

## Estrutura

```text
jogo-gargalo/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── firebase-config.js
├── index.html
└── README.md
```
