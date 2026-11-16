
const listaDeProdutos = [];

let indiceEdicao = null;
let termoBusca = "";

const CHAVE_STORAGE = "estoque_stavni";

class Produto {

    #preco;
    #quantidade;

    constructor(nome, preco, quantidade) {

        if (!nome || nome.trim() === "") {
            throw new Error("O nome do produto não pode estar vazio.");
        }

        if (!Number.isFinite(preco) || preco <= 0) {
            throw new Error("O preço deve ser maior que zero.");
        }

        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            throw new Error("A quantidade deve ser um número inteiro maior que zero.");
        }

        this.nome = nome;
        this.#preco = preco;
        this.#quantidade = quantidade;
    }

    get preco() {
        return this.#preco;
    }

    get quantidade() {
        return this.#quantidade;
    }

    get subtotal() {
        return this.#preco * this.#quantidade;
    }
}


const form = document.getElementById("produto-form");

const tabelaCorpo = document.querySelector(
    "#tabela-produtos tbody"
);

const botaoSubmit = form.querySelector(
    'button[type="submit"]'
);

const campoBusca = document.getElementById("campo-busca");

const campoNome = document.getElementById("nome");

const campoPreco = document.getElementById("preco");

const campoQuantidade = document.getElementById("quantidade");

const listaSugestoes = document.getElementById(
    "sugestoes-produtos"
);

const containerToast = document.getElementById(
    "toast-container"
);



const seletorOrdenacao = document.getElementById(
    "ordenar-produtos"
);

const botaoCSV = document.getElementById("exportar-csv");

const botaoJSON = document.getElementById("exportar-json");

const campoImportarJSON = document.getElementById(
    "importar-json"
);

const TEXTO_BOTAO_INCLUIR = "Adicionar Produto";

const TEXTO_BOTAO_EDITAR = "Salvar Alterações";

const DURACAO_TOAST = 3500;


const formatarMoeda = (valor) =>
    valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

const normalizarTexto = (texto) =>
    texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");



function mostrarToast(mensagem, tipo = "erro") {

    const toast = document.createElement("div");

    toast.className = `toast toast-${tipo}`;

    toast.textContent = mensagem;

    containerToast.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("visivel");
    });

    setTimeout(() => {

        toast.classList.remove("visivel");

        toast.addEventListener(
            "transitionend",
            () => toast.remove(),
            { once: true }
        );

    }, DURACAO_TOAST);
}



function obterDadosProdutos() {

    return listaDeProdutos.map((p) => ({
        nome: p.nome,
        preco: p.preco,
        quantidade: p.quantidade
    }));
}

function salvarNoStorage() {

    const dados = obterDadosProdutos();

    localStorage.setItem(
        CHAVE_STORAGE,
        JSON.stringify(dados)
    );
}

function carregarDoStorage() {

    try {

        const dados = JSON.parse(
            localStorage.getItem(CHAVE_STORAGE)
        ) || [];

        if (!Array.isArray(dados)) {
            throw new Error("Formato de armazenamento inválido.");
        }

        const produtosCarregados = dados.map((d) => {

            return new Produto(
                d.nome,
                Number(d.preco),
                Number(d.quantidade)
            );

        });

        listaDeProdutos.push(...produtosCarregados);

    } catch (error) {

        console.error("Erro ao carregar os dados:", error);

        listaDeProdutos.length = 0;

        localStorage.removeItem(CHAVE_STORAGE);
    }
}


function obterProdutosFiltrados() {

    const itensVisiveis = listaDeProdutos

        .map((produto, indiceOriginal) => ({
            produto,
            indiceOriginal
        }))

        .filter(({ produto }) => {

            return normalizarTexto(produto.nome)
                .includes(termoBusca);

        });


    const itensOrdenados = [...itensVisiveis];


    switch (seletorOrdenacao.value) {

        case "quantidade":

            itensOrdenados.sort((a, b) =>
                a.produto.quantidade - b.produto.quantidade
            );

            break;

        case "maior-preco":

            itensOrdenados.sort((a, b) =>
                b.produto.preco - a.produto.preco
            );

            break;

        case "menor-preco":

            itensOrdenados.sort((a, b) =>
                a.produto.preco - b.produto.preco
            );

            break;

        case "alfabetica":

            itensOrdenados.sort((a, b) =>
                a.produto.nome.localeCompare(
                    b.produto.nome,
                    "pt-BR",
                    { sensitivity: "base" }
                )
            );

            break;

        case "padrao":

        default:

            itensOrdenados.sort((a, b) =>
                a.indiceOriginal - b.indiceOriginal
            );

            break;
    }

    return itensOrdenados;
}


function atualizarSugestoes() {

    listaSugestoes.innerHTML = "";

    const nomesUnicos = [...new Map(

        listaDeProdutos.map((p) => [
            p.nome.toLowerCase(),
            p.nome
        ])

    ).values()];

    nomesUnicos.forEach((nome) => {

        const opcao = document.createElement("option");

        opcao.value = nome;

        listaSugestoes.appendChild(opcao);

    });
}


function atualizarTotalEstoque(itensVisiveis) {

    const valorTotal = itensVisiveis.reduce(
        (acumulador, { produto }) => {

            return acumulador + produto.subtotal;

        },
        0
    );

    document.getElementById("total-estoque").innerText =

        `Total em Estoque: ${formatarMoeda(valorTotal)}`;
}


function renderizarTabela() {

    tabelaCorpo.innerHTML = "";

    atualizarSugestoes();

    const itensVisiveis = obterProdutosFiltrados();

    if (itensVisiveis.length === 0) {

        const mensagem = listaDeProdutos.length === 0

            ? "Nenhum produto cadastrado ainda."

            : "Produto não localizado.";

        tabelaCorpo.innerHTML = `

            <tr>
                <td colspan="5" class="sem-resultados">
                    ${mensagem}
                </td>
            </tr>

        `;

        atualizarTotalEstoque(itensVisiveis);

        return;
    }

    itensVisiveis.forEach(({ produto, indiceOriginal }) => {

        const linha = document.createElement("tr");


        if (produto.quantidade <= 3) {

            linha.classList.add("estoque-critico");

        }

        linha.innerHTML = `

            <td class="celula-nome"></td>

            <td>
                ${formatarMoeda(produto.preco)}
            </td>

            <td>

                ${produto.quantidade}

                ${
                    produto.quantidade <= 3

                        ? '<br><span class="aviso-repor">⚠ Repor estoque</span>'

                        : ""
                }

            </td>

            <td>
                ${formatarMoeda(produto.subtotal)}
            </td>

            <td>

                <button
                    class="btn-editar"
                    onclick="prepararEdicao(${indiceOriginal})">

                    Editar

                </button>

                <button
                    class="btn-remover"
                    onclick="removerProduto(${indiceOriginal})">

                    Remover

                </button>

            </td>

        `;

        linha.querySelector(".celula-nome").textContent =
            produto.nome;

        tabelaCorpo.appendChild(linha);

    });

    atualizarTotalEstoque(itensVisiveis);
}



function resetarModoInclusao() {

    indiceEdicao = null;

    botaoSubmit.innerText = TEXTO_BOTAO_INCLUIR;

    form.reset();
}


function prepararEdicao(index) {

    const produto = listaDeProdutos[index];

    if (!produto) return;

    campoNome.value = produto.nome;

    campoPreco.value = produto.preco;

    campoQuantidade.value = produto.quantidade;

    indiceEdicao = index;

    botaoSubmit.innerText = TEXTO_BOTAO_EDITAR;

    campoNome.focus();
}


function removerProduto(index) {

    if (!listaDeProdutos[index]) return;

    listaDeProdutos.splice(index, 1);

    if (indiceEdicao === index) {

        resetarModoInclusao();

    } else if (
        indiceEdicao !== null &&
        index < indiceEdicao
    ) {

        indiceEdicao--;

    }

    salvarNoStorage();

    renderizarTabela();

    mostrarToast(
        "Produto removido com sucesso.",
        "sucesso"
    );
}


document.getElementById("limpar-tabela").addEventListener(
    "click",
    () => {

        if (listaDeProdutos.length === 0) {

            mostrarToast("O estoque já está vazio.");

            return;
        }

        listaDeProdutos.length = 0;

        campoBusca.value = "";

        termoBusca = "";

        seletorOrdenacao.value = "padrao";

        resetarModoInclusao();

        salvarNoStorage();

        renderizarTabela();

        mostrarToast(
            "Estoque limpo com sucesso.",
            "sucesso"
        );

    }
);



campoBusca.addEventListener("input", () => {

    termoBusca = normalizarTexto(
        campoBusca.value.trim()
    );

    renderizarTabela();

});


seletorOrdenacao.addEventListener("change", () => {

    renderizarTabela();

});


campoNome.addEventListener("change", () => {

    if (indiceEdicao !== null) return;

    const existente = listaDeProdutos.find(
        (p) =>
            p.nome.toLowerCase() ===
            campoNome.value.trim().toLowerCase()
    );

    if (existente) {

        campoPreco.value = existente.preco;

        campoQuantidade.value = existente.quantidade;

    }

});


form.addEventListener("submit", (event) => {

    event.preventDefault();

    const nome = campoNome.value.trim();

    const preco = parseFloat(campoPreco.value);

    const quantidade = Number(campoQuantidade.value);

    if (nome === "") {

        mostrarToast(
            "O nome do produto não pode estar vazio."
        );

        return;
    }

    if (!Number.isFinite(preco) || preco <= 0) {

        mostrarToast(
            "O preço deve ser maior que zero."
        );

        return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {

        mostrarToast(
            "A quantidade deve ser um número inteiro maior que zero."
        );

        return;
    }

    try {

        const novoProduto = new Produto(
            nome,
            preco,
            quantidade
        );

        const estavaEditando = indiceEdicao !== null;

        if (estavaEditando) {

            listaDeProdutos[indiceEdicao] = novoProduto;

        } else {

            listaDeProdutos.push(novoProduto);

        }

        salvarNoStorage();

        renderizarTabela();

        resetarModoInclusao();

        mostrarToast(

            estavaEditando

                ? "Produto atualizado com sucesso."

                : "Produto cadastrado com sucesso.",

            "sucesso"

        );

    } catch (error) {

        mostrarToast(error.message);

    }

});

function baixarArquivo(nomeArquivo, conteudo, tipo) {

    const arquivo = new Blob(
        [conteudo],
        { type: tipo }
    );

    const endereco = URL.createObjectURL(arquivo);

    const link = document.createElement("a");

    link.href = endereco;

    link.download = nomeArquivo;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setTimeout(() => {

        URL.revokeObjectURL(endereco);

    }, 1000);

}


function exportarCSV() {

    const cabecalho = [
        "Nome",
        "Preco",
        "Quantidade",
        "Subtotal"
    ];

    const linhas = listaDeProdutos.map((produto) => [

        produto.nome,

        produto.preco.toFixed(2).replace(".", ","),

        produto.quantidade,

        produto.subtotal.toFixed(2).replace(".", ",")

    ]);

    function escaparCSV(valor) {

        return `"${String(valor).replace(/"/g, '""')}"`;

    }

    const conteudoCSV = [

        cabecalho,

        ...linhas

    ]

        .map((linha) =>

            linha.map(escaparCSV).join(";")

        )

        .join("\r\n");

    baixarArquivo(

        "estoque.csv",

        "\uFEFF" + conteudoCSV,

        "text/csv;charset=utf-8;"

    );

    mostrarToast(
        "Arquivo estoque.csv exportado com sucesso!",
        "sucesso"
    );

}

botaoCSV.addEventListener("click", exportarCSV);



function exportarJSON() {

    const dados = obterDadosProdutos();

    const conteudoJSON = JSON.stringify(
        dados,
        null,
        4
    );

    baixarArquivo(

        "backup_estoque.json",

        conteudoJSON,

        "application/json"

    );

    mostrarToast(
        "Backup JSON criado com sucesso!",
        "sucesso"
    );

}

botaoJSON.addEventListener("click", exportarJSON);


campoImportarJSON.addEventListener("change", (event) => {

    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = (e) => {

        try {

            const dados = JSON.parse(e.target.result);

            if (!Array.isArray(dados)) {

                throw new Error(
                    "O arquivo JSON possui formato inválido."
                );

            }


            const produtosRestaurados = dados.map((d) => {

                if (
                    !d ||
                    typeof d.nome !== "string" ||
                    typeof d.preco !== "number" ||
                    typeof d.quantidade !== "number"
                ) {

                    throw new Error(
                        "Existem dados inválidos no arquivo."
                    );

                }

                return new Produto(
                    d.nome,
                    d.preco,
                    d.quantidade
                );

            });


            localStorage.setItem(
                CHAVE_STORAGE,
                JSON.stringify(dados)
            );

            

            listaDeProdutos.length = 0;

            listaDeProdutos.push(...produtosRestaurados);


            campoBusca.value = "";

            termoBusca = "";


            seletorOrdenacao.value = "padrao";


            resetarModoInclusao();

            renderizarTabela();

            mostrarToast(
                "Backup restaurado com sucesso!",
                "sucesso"
            );

        } catch (error) {

            mostrarToast(
                "Erro ao restaurar backup: " + error.message
            );

        } finally {

            campoImportarJSON.value = "";

        }

    };

    leitor.onerror = () => {

        mostrarToast(
            "Não foi possível ler o arquivo selecionado."
        );

        campoImportarJSON.value = "";

    };

    leitor.readAsText(arquivo);

});



carregarDoStorage();

renderizarTabela();
