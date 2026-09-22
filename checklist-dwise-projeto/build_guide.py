# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, KeepTogether, HRFlowable
)

BLUE = colors.HexColor("#1565ff")
DARK = colors.HexColor("#12172b")
MUTED = colors.HexColor("#5b6472")
GREEN = colors.HexColor("#16a34a")
WARN_BG = colors.HexColor("#fff4d6")
WARN_BORDER = colors.HexColor("#f0b429")
NOTE_BG = colors.HexColor("#e8f0ff")
NOTE_BORDER = colors.HexColor("#1565ff")
CODE_BG = colors.HexColor("#f2f4f8")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(name="GuiaTitle", fontName="Helvetica-Bold", fontSize=24, leading=28, textColor=DARK, spaceAfter=4))
styles.add(ParagraphStyle(name="GuiaSubtitle", fontName="Helvetica", fontSize=13, leading=17, textColor=MUTED, spaceAfter=18))
styles.add(ParagraphStyle(name="Parte", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=BLUE, spaceBefore=22, spaceAfter=10))
styles.add(ParagraphStyle(name="PassoTitulo", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=DARK, spaceBefore=10, spaceAfter=3))
styles.add(ParagraphStyle(name="Corpo", fontName="Helvetica", fontSize=10.5, leading=15, textColor=DARK, spaceAfter=6, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="CorpoLista", fontName="Helvetica", fontSize=10.5, leading=15, textColor=DARK, spaceAfter=4, leftIndent=12))
styles.add(ParagraphStyle(name="Codigo", fontName="Courier", fontSize=9.5, leading=13, textColor=DARK, backColor=CODE_BG, borderPadding=6))
styles.add(ParagraphStyle(name="NotaTitulo", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=DARK))
styles.add(ParagraphStyle(name="NotaCorpo", fontName="Helvetica", fontSize=10, leading=14, textColor=DARK))
styles.add(ParagraphStyle(name="Rodape", fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED))


def callout(title, body, bg, border):
    t = Table(
        [[Paragraph(f"{title}", styles["NotaTitulo"])], [Paragraph(body, styles["NotaCorpo"])]],
        colWidths=[160 * mm],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 1, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (0, 0), (0, 0), 2),
        ("TOPPADDING", (0, 1), (0, 1), 2),
        ("BOTTOMPADDING", (0, 1), (0, 1), 10),
    ]))
    return t


def passo(numero, titulo, corpo_paragrafos):
    flow = [Paragraph(f"Passo {numero} — {titulo}", styles["PassoTitulo"])]
    for p in corpo_paragrafos:
        flow.append(Paragraph(p, styles["Corpo"]))
    return KeepTogether(flow)


story = []

# ---------- Capa ----------
logo = Image("/tmp/wise-logo.png", width=33 * mm, height=16.4 * mm)
story.append(logo)
story.append(Spacer(1, 10))
story.append(Paragraph("Guia de Publicação", styles["GuiaTitle"]))
story.append(Paragraph("Checklist Digital D WISE — como colocar o sistema no ar, do zero, sem precisar saber programar", styles["GuiaSubtitle"]))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e4e7f0"), spaceAfter=14))

story.append(Paragraph(
    "Este guia te leva do arquivo <b>checklist-dwise.zip</b> até um link único que todos os supervisores, "
    "o painel da TV e o relatório de produção vão usar. São 4 partes, nesta ordem:",
    styles["Corpo"],
))

resumo_data = [
    ["1", "GitHub", "Guardar os arquivos do sistema (é gratuito)"],
    ["2", "Gmail", "Criar uma senha especial para o sistema poder enviar e-mail"],
    ["3", "Render", "Publicar o sistema de verdade, com um link único"],
    ["4", "Testar", "Conferir se está tudo funcionando"],
]
resumo_tbl = Table(resumo_data, colWidths=[10 * mm, 28 * mm, 122 * mm])
resumo_tbl.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ("FONTNAME", (0, 0), (1, -1), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10.5),
    ("TEXTCOLOR", (0, 0), (0, -1), BLUE),
    ("TEXTCOLOR", (1, 0), (1, -1), DARK),
    ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e4e7f0")),
]))
story.append(Spacer(1, 6))
story.append(resumo_tbl)
story.append(Spacer(1, 10))

story.append(callout(
    "Não precisa saber programar",
    "Todos os passos abaixo são feitos clicando em botões no navegador — como preencher qualquer formulário na internet. "
    "Sempre que um passo pedir para digitar algo técnico, o texto exato vem escrito neste guia, prontinho para copiar.",
    NOTE_BG, NOTE_BORDER,
))

story.append(PageBreak())

# ---------- Parte 1: GitHub ----------
story.append(Paragraph("Parte 1 de 4 — Guardar os arquivos no GitHub", styles["Parte"]))
story.append(Paragraph(
    "O GitHub é onde o código do sistema vai ficar guardado. O Render (Parte 3) vai ler os arquivos direto "
    "de lá para publicar o sistema. É gratuito e leva menos de 5 minutos.",
    styles["Corpo"],
))

story.append(passo(1, "Criar uma conta no GitHub", [
    "Acesse <b>github.com</b> e clique em <b>Sign up</b> (Criar conta).",
    "Preencha e-mail, senha e um nome de usuário. Confirme seu e-mail quando o GitHub pedir (ele manda um código).",
]))

story.append(passo(2, "Criar um repositório (uma pasta para o projeto)", [
    "Depois de entrar, clique no <b>+</b> no canto superior direito da tela → <b>New repository</b>.",
    "Em <b>Repository name</b>, digite: <font face='Courier'>checklist-dwise</font>",
    "Pode deixar marcado como <b>Private</b> (privado) — só você vai poder ver o código.",
    "Clique no botão verde <b>Create repository</b>.",
]))

story.append(passo(3, "Descompactar o arquivo no seu computador", [
    "Ache o arquivo <b>checklist-dwise.zip</b> que te enviei (provavelmente na pasta Downloads).",
    "Clique com o botão direito nele e escolha <b>Extrair tudo</b> / <b>Extract All</b> (Windows) ou dê dois cliques (Mac). "
    "Isso vai criar uma pasta <b>checklist-dwise</b> com todos os arquivos dentro.",
]))

story.append(passo(4, "Enviar os arquivos para o GitHub", [
    "Na página do repositório que você acabou de criar, clique em <b>uploading an existing file</b> "
    "(ou no menu <b>Add file</b> → <b>Upload files</b>).",
    "Abra a pasta <b>checklist-dwise</b> que você extraiu e arraste <u>todo o conteúdo de dentro dela</u> "
    "(as pastas <font face='Courier'>server</font>, os arquivos <font face='Courier'>package.json</font>, "
    "<font face='Courier'>render.yaml</font>, etc.) para dentro da janela do navegador.",
    "Espere a lista de arquivos carregar (pode levar um minuto), depois role até o final da página e clique em "
    "<b>Commit changes</b> (o botão verde).",
]))

story.append(callout(
    "Use o Google Chrome ou o Edge para este passo",
    "Arrastar uma pasta inteira (com subpastas) só funciona bem em navegadores modernos como Chrome ou Edge. "
    "Se algum arquivo não aparecer na lista depois de arrastar, tente enviar a pasta <font face='Courier'>server</font> "
    "separadamente, do mesmo jeito (Add file → Upload files → arrastar).",
    WARN_BG, WARN_BORDER,
))

story.append(PageBreak())

# ---------- Parte 2: Gmail ----------
story.append(Paragraph("Parte 2 de 4 — Preparar o e-mail que vai enviar os checklists", styles["Parte"]))
story.append(Paragraph(
    "O sistema precisa de um e-mail \"remetente\" configurado para conseguir enviar automaticamente o resumo "
    "de cada checklist (com o PDF em anexo) para o e-mail do gerente. Se você usa Gmail, o Google exige uma "
    "\"senha de app\" especial — sua senha normal do Gmail não funciona aqui, por segurança.",
    styles["Corpo"],
))

story.append(passo(1, "Ativar a verificação em duas etapas (se ainda não tiver)", [
    "Acesse <b>myaccount.google.com/security</b> com a conta de e-mail que vai enviar os checklists.",
    "Em <b>Como você faz login no Google</b>, ative a <b>Verificação em duas etapas</b>, caso ainda esteja desativada "
    "(o Gmail só libera a senha de app depois disso).",
]))

story.append(passo(2, "Gerar a senha de app", [
    "Ainda em <b>myaccount.google.com/security</b>, procure por <b>Senhas de app</b> "
    "(ou acesse direto: <b>myaccount.google.com/apppasswords</b>).",
    "Dê um nome, por exemplo <font face='Courier'>Checklist D WISE</font>, e clique em <b>Criar</b>.",
    "O Google vai mostrar uma senha de 16 letras (tipo <font face='Courier'>abcd efgh ijkl mnop</font>). "
    "<b>Copie essa senha e guarde</b> — você vai usar ela daqui a pouco, na Parte 3.",
]))

story.append(callout(
    "Anote antes de continuar",
    "Guarde estas 4 informações num bloco de notas — você vai precisar delas na Parte 3:<br/>"
    "1) O e-mail que vai enviar (ex: checklist.dwise@gmail.com)<br/>"
    "2) A senha de app de 16 letras que você acabou de gerar<br/>"
    "3) O e-mail do gerente, que vai <u>receber</u> os checklists preenchidos<br/>"
    "4) Se usa outro provedor (não-Gmail), o nome do servidor SMTP dele (pergunte ao seu provedor de e-mail).",
    NOTE_BG, NOTE_BORDER,
))

story.append(PageBreak())

# ---------- Parte 3: Render ----------
story.append(Paragraph("Parte 3 de 4 — Publicar no Render", styles["Parte"]))
story.append(Paragraph(
    "O Render é o serviço que vai deixar o sistema \"ligado\" na internet, 24 horas por dia, com um link único. "
    "Ele lê os arquivos direto do GitHub — por isso a Parte 1 vem antes desta.",
    styles["Corpo"],
))

story.append(passo(1, "Criar conta no Render", [
    "Acesse <b>render.com</b> e clique em <b>Get Started</b> / <b>Sign Up</b>.",
    "Escolha <b>Continue with GitHub</b> — assim o Render já fica conectado à conta do GitHub da Parte 1, "
    "sem precisar configurar nada a mais. Autorize quando o GitHub pedir.",
]))

story.append(passo(2, "Publicar o \"Blueprint\" do projeto", [
    "No painel do Render, clique em <b>New +</b> (canto superior direito) → <b>Blueprint</b>.",
    "Selecione o repositório <font face='Courier'>checklist-dwise</font> que você criou na Parte 1 → clique em <b>Connect</b>.",
    "O Render vai ler o arquivo <font face='Courier'>render.yaml</font> que já vem dentro do projeto e mostrar "
    "o serviço que vai criar, chamado <font face='Courier'>checklist-dwise</font>.",
]))

story.append(passo(3, "Preencher as variáveis de e-mail", [
    "Antes de publicar, o Render pede para preencher alguns campos em branco (as variáveis marcadas como "
    "\"secret\" no arquivo). Preencha exatamente com as informações que você anotou na Parte 2:",
]))

env_data = [
    ["Campo no Render", "O que colocar"],
    ["MANAGER_EMAIL", "O e-mail do gerente, que vai RECEBER os checklists"],
    ["SMTP_HOST", "smtp.gmail.com (se estiver usando Gmail)"],
    ["SMTP_USER", "O e-mail que vai ENVIAR (ex: checklist.dwise@gmail.com)"],
    ["SMTP_PASS", "A senha de app de 16 letras gerada na Parte 2"],
    ["SMTP_FROM", "O mesmo e-mail do SMTP_USER"],
]
env_tbl = Table(env_data, colWidths=[40 * mm, 120 * mm])
env_tbl.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTNAME", (0, 1), (0, -1), "Courier"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0e1530")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("TEXTCOLOR", (0, 1), (-1, -1), DARK),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f6fa")]),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e4e7f0")),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]))
story.append(env_tbl)
story.append(Spacer(1, 8))
story.append(Paragraph(
    "O campo <font face='Courier'>SMTP_PORT</font> já vem preenchido com <font face='Courier'>587</font> — não precisa mexer. "
    "O campo <font face='Courier'>CORS_ORIGIN</font> também já vem certo, com <font face='Courier'>*</font>.",
    styles["Corpo"],
))

story.append(passo(4, "Publicar", [
    "Clique no botão <b>Deploy Blueprint</b>.",
    "O Render vai instalar e ligar o sistema — isso leva de 2 a 5 minutos. Você pode acompanhar o progresso "
    "numa tela de \"logs\" (texto passando na tela). Quando aparecer <b>Live</b> em verde no topo, está pronto.",
]))

story.append(passo(5, "Copiar o link do sistema", [
    "No painel do serviço <font face='Courier'>checklist-dwise</font>, o link fica embaixo do nome do serviço, "
    "algo parecido com: <font face='Courier'>https://checklist-dwise.onrender.com</font>",
    "Esse é o link que você vai compartilhar com os supervisores para preencherem o checklist. "
    "O painel da TV fica em <font face='Courier'>/painel</font> depois desse link, e o relatório de produção em "
    "<font face='Courier'>/relatorio</font>.",
]))

story.append(PageBreak())

# ---------- Parte 4: Testar ----------
story.append(Paragraph("Parte 4 de 4 — Testar tudo", styles["Parte"]))

story.append(passo(1, "Testar o checklist", [
    "Abra o link do Render num celular ou computador. Preencha um checklist de teste (pode usar seu próprio nome) "
    "e envie. Confira se o e-mail chegou na caixa de entrada do gerente (às vezes cai no Spam na primeira vez).",
]))

story.append(passo(2, "Testar o painel da TV", [
    "Abra <font face='Courier'>[seu link]/painel</font> — o checklist de teste que você acabou de enviar já deve "
    "aparecer na grade, com o percentual do turno atualizado.",
]))

story.append(passo(3, "Testar o relatório de produção", [
    "Abra <font face='Courier'>[seu link]/relatorio</font>, escolha \"Este mês\" e confira se a produção que você "
    "informou no checklist de teste aparece somada na máquina certa.",
]))

story.append(Spacer(1, 10))
story.append(callout(
    "Sobre o plano gratuito do Render",
    "Duas coisas para saber, sem se preocupar — é assim que o plano gratuito funciona:<br/><br/>"
    "<b>1. O sistema \"dorme\" sozinho.</b> Se ninguém acessa por 15 minutos, o Render desliga o sistema para "
    "economizar. Na próxima vez que alguém abrir o link, pode demorar cerca de 1 minuto para carregar — é normal, "
    "não é erro. Depois disso ele funciona normal.<br/><br/>"
    "<b>2. O histórico pode se perder em uma atualização futura.</b> Os checklists ficam salvos normalmente no "
    "dia a dia. Mas se um dia você (ou eu) precisar atualizar o código do sistema e reenviar para o Render, o "
    "histórico do painel e do relatório pode zerar. Para o histórico durar para sempre, mesmo depois de "
    "atualizações, existe uma opção chamada <b>Disco Persistente</b> no Render — é paga (bem barata, cerca de "
    "R$1,50 por mês), e posso te ajudar a ativar quando você quiser.",
    WARN_BG, WARN_BORDER,
))

story.append(Spacer(1, 14))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e4e7f0"), spaceAfter=8))
story.append(Paragraph(
    "Ficou travado em algum passo, ou alguma tela apareceu diferente do que está aqui? Me manda um print da tela "
    "que eu te ajudo a continuar dali.",
    styles["Corpo"],
))

doc = SimpleDocTemplate(
    "/home/claude/checklist-dwise/guia-publicacao-D-WISE.pdf",
    pagesize=A4,
    topMargin=20 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
    title="Guia de Publicação - Checklist Digital D WISE",
)
doc.build(story)
print("PDF gerado com sucesso")
