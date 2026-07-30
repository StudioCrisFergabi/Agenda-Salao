# Studio Cris Fergabi — Site de Agendamentos

Site completo, já conectado ao seu projeto Firebase (`salao-agatha`):

- **`index.html`** — site da cliente: home, sobre, serviços, galeria, agendamento
  em 5 passos, contato (endereço e WhatsApp já preenchidos), mapa.
- **`admin.html`** — área administrativa: login com e-mail/senha (Firebase
  Authentication), gestão de serviços, horário de funcionamento, datas
  bloqueadas, agenda e marcação manual de horários.
- Os dados (serviços, horários, agendamentos) ficam no **Firestore**, então
  funcionam em tempo real e são os mesmos em qualquer celular ou computador —
  diferente da primeira versão, que usava só o navegador.

## O que fazer com esses arquivos

Só existem duas coisas que você precisa fazer com eles: **1) publicar no
GitHub Pages** e **2) terminar de configurar o Firebase** (algumas coisas
disso talvez você já tenha feito). Segue o passo a passo.

## 1. Publicar o site no GitHub Pages

1. Crie um repositório no GitHub (pode ser público).
2. Envie **todos os arquivos desta pasta, mantendo a estrutura de pastas**
   (`css/`, `js/`, `assets/` continuam sendo pastas dentro do repositório —
   não solte os arquivos soltos fora delas).
3. No repositório, vá em **Settings → Pages**, escolha a branch principal e a
   pasta raiz (`/`), e salve.
4. Em alguns minutos o site estará em
   `https://seu-usuario.github.io/nome-do-repositorio/`.

## 2. Terminar de configurar o Firebase

No [console.firebase.google.com](https://console.firebase.google.com), dentro
do projeto **salao-agatha**:

1. **Firestore Database** → se ainda não criou, crie o banco (modo produção,
   região `southamerica-east1`).
2. **Authentication → Sign-in method** → ative **E-mail/senha**.
3. **Authentication → Users** → cadastre o e-mail e a senha que você (a
   proprietária) vai usar para entrar em `admin.html`. É esse e-mail/senha
   que o formulário de login do painel vai pedir — não existe mais uma
   "senha do site" separada.
4. **Firestore Database → Regras** → cole o conteúdo do arquivo
   `firestore.rules` (está nesta mesma pasta) e clique em **Publicar**.
5. **Storage** → clique em **Começar**, aceite o modo produção. Depois vá em
   **Storage → Regras** e cole o conteúdo do arquivo `storage.rules` (também
   nesta pasta) e publique. Isso é necessário para a galeria de fotos
   funcionar (passo novo — se você já tinha configurado tudo antes, só
   faltava esse).

Depois disso, abra `admin.html`, faça login, e cadastre/confira os serviços
— o site público (`index.html`) vai puxar tudo automaticamente do Firestore.

## Não consigo fazer login no painel — o que checar

1. **O mais comum: você está testando com duplo clique no `index.html`
   (abrindo como `file://...`).** Isso nunca vai funcionar — o navegador
   bloqueia por segurança esse tipo de conexão quando o site não está
   publicado. Teste sempre pelo link do GitHub Pages (`https://seu-usuario.
   github.io/...`), não pelo arquivo local.
2. Confirme em **Firebase Console → Authentication → Sign-in method** que
   **E-mail/senha** está com status "Ativado".
3. Confirme em **Firebase Console → Authentication → Users** que o e-mail
   aparece na lista (é ali que a senha de verdade fica, e só lá pode ser
   trocada).
4. Confira se não sobrou espaço em branco antes/depois do e-mail ou da senha
   ao digitar.
5. Se nada disso resolver, abra o site publicado, pressione F12 (ferramentas
   do desenvolvedor) → aba **Console**, tente logar de novo, e me manda a
   mensagem de erro que aparecer lá — ela diz exatamon que está errado.

## Como cadastrar serviços, preços e horários

Tudo isso é feito dentro do próprio painel (`admin.html`), depois de logar —
não precisa mexer em nenhum arquivo:
- **Serviços** (nome, preço e duração por comprimento curto/médio/longo).
- **Horário de funcionamento** e **Datas bloqueadas**.
- **Agenda** (ver, cancelar ou marcar agendamentos manualmente).

No site da cliente, o agendamento agora pede primeiro o **comprimento do
cabelo** e só depois mostra os **serviços já com o preço e a duração exatos**
para aquele comprimento — sem "a partir de".

## Como trocar as fotos da galeria

Também é feito direto no painel, na aba **Galeria**:
1. Clique em escolher arquivo(s), selecione uma ou várias fotos do
   computador/celular.
2. Clique em **Enviar fotos**.
3. Elas aparecem na hora na galeria do site (mais recentes primeiro).
4. Para remover uma foto, clique no ✕ que aparece sobre ela na aba Galeria.

Não existe mais necessidade de mexer em código para trocar fotos — é só
enviar/remover pelo painel sempre que quiser atualizar o mural.

## Por que a versão anterior "não funcionava"

Pelo visto, ao tentar recriar os arquivos, algumas coisas saíram
misturadas — por exemplo, um arquivo chamado `style.css` continha na verdade
uma imagem, e o conteúdo que deveria estar em um arquivo `js/firebase-config.js`
acabou dentro de `admin.html`. O navegador não consegue rodar isso, por isso
ficou "básico" (sem estilo, sem conexão com o Firebase). **Esta pasta que
estou te enviando agora é uma versão única e já revisada — não precisa
misturar com os arquivos que você tinha gerado antes.** Se possível, comece
o repositório do zero com só estes arquivos, pra evitar confusão.

## Se precisar mexer em algo depois

- **Trocar textos/preços/horários**: não precisa editar nenhum arquivo — tudo
  isso é feito dentro do próprio `admin.html`, logado.
- **Trocar endereço, telefone ou WhatsApp exibidos no site**: esses ficam
  escritos em `index.html` (seção de contato) e no topo de `js/booking.js`
  (variável `WHATSAPP_NUMBER`). Se quiser, posso deixar isso editável pelo
  painel administrativo também — é só pedir.
- **Trocar a senha de acesso ao painel**: Firebase Console → Authentication →
  Users → editar o usuário.
- **Fotos da galeria**: hoje são blocos rosa de espaço reservado. Troque os
  `<div class="gallery-ph">` em `index.html` por `<img src="assets/sua-foto.jpg">`.

## Estrutura de arquivos

```
studio-cris-fergabi/
├── index.html          site da cliente
├── admin.html           painel administrativo
├── firestore.rules       regras de segurança para colar no Firestore
├── storage.rules          regras de segurança para colar no Storage (galeria)
├── css/
│   ├── style.css         estilos do site
│   └── admin.css         estilos do painel
├── js/
│   ├── firebase-init.js  conecta o site ao seu projeto Firebase
│   ├── data.js            leitura/escrita de dados no Firestore
│   ├── booking.js         lógica do site da cliente e do agendamento
│   └── admin.js           lógica do painel administrativo
├── assets/
│   └── logo.jpg
└── README.md
```
