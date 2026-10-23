/* ============================================
   JOHN MOTOS PEÇAS
   js/app.js
============================================ */

/*
   CONFIGURAÇÃO DO SUPABASE

   Preencha com os dados do seu projeto.
   Use somente a chave pública (publishable/anon).
   Nunca coloque a service_role neste arquivo.
*/

const SUPABASE_URL = "COLE_AQUI_A_URL_DO_SEU_PROJETO";
const SUPABASE_ANON_KEY = "COLE_AQUI_SUA_CHAVE_PUBLICA";

/*
   ATENÇÃO:
   As consultas abaixo pressupõem as tabelas:
   - produtos
   - saldos_estoque
   - contas_pagar

   Os nomes das tabelas e colunas devem corresponder
   ao SQL real do projeto John Motos.
*/

"use strict";

const $ = (id) => document.getElementById(id);

let supabaseClient = null;
let refreshTimer = null;
let isRefreshing = false;

/* ============================================
   UTILITÁRIOS
============================================ */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatDate(value) {
    if (!value) return "Não informado";

    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? new Date(`${value}T12:00:00`)
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Não informado";
    }

    return date.toLocaleDateString("pt-BR");
}

function todayISO() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

function updateClock() {
    const element = $("currentDate");
    if (!element) return;

    element.textContent = new Date().toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function setConnection(status, message) {
    const element = $("connectionStatus");
    const text = $("connectionText");

    if (element) {
        element.classList.remove("online", "error");

        if (status === "online") {
            element.classList.add("online");
        } else if (status === "error") {
            element.classList.add("error");
        }
    }

    if (text) {
        text.textContent = message;
    }
}

function updateLastRefresh(message = null) {
    const element = $("lastUpdate");
    if (!element) return;

    element.textContent = message ||
        `Atualizado às ${new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        })}`;
}

function setEmpty(elementId, icon, message) {
    const element = $(elementId);
    if (!element) return;

    element.innerHTML = `
        <div class="empty">
            <span class="empty-icon">${icon}</span>
            ${escapeHTML(message)}
        </div>
    `;
}

/* ============================================
   VERIFICAÇÃO DA CONFIGURAÇÃO
============================================ */

function isSupabaseConfigured() {
    return (
        typeof SUPABASE_URL === "string" &&
        SUPABASE_URL.startsWith("https://") &&
        !SUPABASE_URL.includes("COLE_AQUI") &&
        typeof SUPABASE_ANON_KEY === "string" &&
        SUPABASE_ANON_KEY.length > 20 &&
        !SUPABASE_ANON_KEY.includes("COLE_AQUI")
    );
}

/* ============================================
   ESTOQUE BAIXO
============================================ */

/*
   Consulta os produtos ativos e os respectivos saldos.

   Critério:
   quantidade disponível <= estoque mínimo.

   Se seu SQL utilizar nomes diferentes de tabelas
   ou colunas, ajuste a consulta para o esquema real.
*/

async function loadLowStock() {
    const [productsResult, balancesResult] = await Promise.all([
        supabaseClient
            .from("produtos")
            .select(
                "id, codigo, nome, estoque_minimo, controla_estoque, ativo"
            )
            .eq("ativo", true)
            .eq("controla_estoque", true),

        supabaseClient
            .from("saldos_estoque")
            .select("produto_id, quantidade")
    ]);

    if (productsResult.error) {
        throw new Error(
            `Erro ao consultar produtos: ${productsResult.error.message}`
        );
    }

    if (balancesResult.error) {
        throw new Error(
            `Erro ao consultar saldos: ${balancesResult.error.message}`
        );
    }

    const products = productsResult.data || [];
    const balances = balancesResult.data || [];
    const totals = new Map();

    for (const balance of balances) {
        const productId = balance.produto_id;
        const quantity = Number(balance.quantidade || 0);

        totals.set(
            productId,
            (totals.get(productId) || 0) + quantity
        );
    }

    const lowStock = products
        .map((product) => ({
            ...product,
            quantidade_atual: totals.get(product.id) || 0,
            estoque_minimo: Number(product.estoque_minimo || 0)
        }))
        .filter((product) =>
            product.quantidade_atual <= product.estoque_minimo
        )
        .sort((a, b) =>
            a.quantidade_atual - b.quantidade_atual
        );

    renderLowStock(lowStock);
}

/* ============================================
   EXIBIÇÃO DO ESTOQUE BAIXO
============================================ */

function renderLowStock(products) {
    const total = products.length;

    if ($("stockTotal")) {
        $("stockTotal").textContent = total;
    }

    if ($("stockCounter")) {
        $("stockCounter").textContent =
            `${total} ${total === 1 ? "produto" : "produtos"}`;
    }

    if ($("stockListCounter")) {
        $("stockListCounter").textContent =
            `${total} ${total === 1 ? "produto" : "produtos"}`;
    }

    if (total === 0) {
        setEmpty(
            "stockList",
            "✓",
            "Nenhum produto com estoque baixo."
        );
        return;
    }

    $("stockList").innerHTML = products
        .slice(0, 30)
        .map((product) => {
            const quantity = Number(product.quantidade_atual);
            const minimum = Number(product.estoque_minimo);
            const outOfStock = quantity <= 0;

            return `
                <div class="item">
                    <div class="item-info">
                        <div class="item-title">
                            ${escapeHTML(product.nome)}
                        </div>

                        <div class="item-subtitle">
                            Código: ${escapeHTML(product.codigo || "Não informado")}<br>
                            Estoque mínimo: ${minimum}
                        </div>

                        <span class="status ${
                            outOfStock ? "status-red" : "status-yellow"
                        }">
                            ${outOfStock ? "Sem estoque" : "Estoque baixo"}
                        </span>
                    </div>

                    <div class="item-value">
                        ${quantity}
                        <div class="item-subtitle">unidades</div>
                    </div>
                </div>
            `;
        })
        .join("");
}

/* ============================================
   PAGAMENTOS PENDENTES
============================================ */

/*
   Consulta prevista para a tabela contas_pagar.

   Colunas utilizadas:
   - id
   - descricao
   - fornecedor_nome
   - valor_aberto
   - vencimento
   - status

   Status previstos:
   - pendente
   - parcial
   - atrasado

   Esta consulta depende de a tabela e as colunas
   existirem no banco e de as permissões permitirem
   a leitura dos registros.
*/

async function loadPendingPayments() {
    const { data, error } = await supabaseClient
        .from("contas_pagar")
        .select(
            "id, descricao, fornecedor_nome, valor_aberto, vencimento, status"
        )
        .in("status", ["pendente", "parcial", "atrasado"])
        .order("vencimento", { ascending: true })
        .limit(100);

    if (error) {
        console.error(
            "Erro ao consultar pagamentos pendentes:",
            error.message
        );

        if ($("paymentsTotal")) {
            $("paymentsTotal").textContent = "—";
        }

        if ($("paymentsCounter")) {
            $("paymentsCounter").textContent = "Indisponível";
        }

        if ($("paymentsListCounter")) {
            $("paymentsListCounter").textContent = "Não carregado";
        }

        setEmpty(
            "paymentsList",
            "⚙️",
            "Não foi possível carregar as contas. Verifique a tabela contas_pagar e as permissões do Supabase."
        );

        return;
    }

    const payments = data || [];

    const total = payments.reduce(
        (sum, payment) => sum + Number(payment.valor_aberto || 0),
        0
    );

    if ($("paymentsTotal")) {
        $("paymentsTotal").textContent = formatMoney(total);
    }

    if ($("paymentsCounter")) {
        $("paymentsCounter").textContent =
            `${payments.length} ${
                payments.length === 1 ? "pendência" : "pendências"
            }`;
    }

    if ($("paymentsListCounter")) {
        $("paymentsListCounter").textContent =
            `${payments.length} ${
                payments.length === 1 ? "conta" : "contas"
            }`;
    }

    renderPendingPayments(payments);
}

/* ============================================
   EXIBIÇÃO DOS PAGAMENTOS
============================================ */

function renderPendingPayments(payments) {
    if (payments.length === 0) {
        setEmpty(
            "paymentsList",
            "✓",
            "Nenhuma conta pendente cadastrada."
        );
        return;
    }

    const today = todayISO();

    $("paymentsList").innerHTML = payments
        .slice(0, 30)
        .map((payment) => {
            const overdue = payment.vencimento &&
                payment.vencimento < today &&
                payment.status !== "pago";

            const isOverdue =
                overdue || payment.status === "atrasado";

            const statusText = isOverdue
                ? "Atrasado"
                : payment.status === "parcial"
                    ? "Pagamento parcial"
                    : "Pendente";

            const statusClass = isOverdue
                ? "status-red"
                : "status-yellow";

            const title = payment.fornecedor_nome ||
                payment.descricao ||
                "Conta sem descrição";

            const description =
                payment.descricao && payment.fornecedor_nome
                    ? `${escapeHTML(payment.descricao)}<br>`
                    : "";

            return `
                <div class="item">
                    <div class="item-info">
                        <div class="item-title">
                            ${escapeHTML(title)}
                        </div>

                        <div class="item-subtitle">
                            ${description}
                            Vencimento: ${formatDate(payment.vencimento)}
                        </div>

                        <span class="status ${statusClass}">
                            ${statusText}
                        </span>
                    </div>

                    <div class="item-value">
                        ${formatMoney(payment.valor_aberto)}
                    </div>
                </div>
            `;
        })
        .join("");
}

/* ============================================
   ATUALIZAÇÃO DO PAINEL
============================================ */

async function refreshDashboard() {
    if (!supabaseClient || isRefreshing) return;

    isRefreshing = true;

    try {
        await loadLowStock();
        await loadPendingPayments();

        setConnection("online", "Supabase conectado");
        updateLastRefresh();
    } catch (error) {
        console.error("Erro ao atualizar o painel:", error);

        setConnection("error", "Erro ao atualizar");
        updateLastRefresh("Falha na atualização");
    } finally {
        isRefreshing = false;
    }
}

/* ============================================
   INICIALIZAÇÃO
============================================ */

async function initializeDashboard() {
    updateClock();

    if (!isSupabaseConfigured()) {
        setConnection("error", "Configurar Supabase");
        updateLastRefresh("Configuração necessária");

        if ($("stockTotal")) {
            $("stockTotal").textContent = "—";
        }

        if ($("paymentsTotal")) {
            $("paymentsTotal").textContent = "—";
        }

        setEmpty(
            "stockList",
            "⚙️",
            "Configure a URL e a chave pública do Supabase em js/app.js."
        );

        setEmpty(
            "paymentsList",
            "💳",
            "Configure a conexão com o Supabase para consultar os pagamentos."
        );

        return;
    }

    if (!window.supabase) {
        setConnection("error", "Biblioteca indisponível");

        setEmpty(
            "stockList",
            "⚠️",
            "Não foi possível carregar a biblioteca do Supabase."
        );

        setEmpty(
            "paymentsList",
            "⚠️",
            "Verifique sua conexão com a internet."
        );

        return;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    await refreshDashboard();

    /*
       Atualiza os alertas a cada 60 segundos.
    */

    refreshTimer = window.setInterval(() => {
        refreshDashboard();
    }, 60000);
}

/* ============================================
   EVENTOS
============================================ */

document.addEventListener("DOMContentLoaded", () => {
    updateClock();
    initializeDashboard();

    window.setInterval(updateClock, 60000);
});

/*
   Libera o temporizador quando a página é fechada
   ou substituída, quando o navegador dispara o evento.
*/

window.addEventListener("pagehide", () => {
    if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
        refreshTimer = null;
    }
});