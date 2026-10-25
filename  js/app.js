/* ============================================
   JOHN MOTOS PEÇAS
   js/app.js
============================================ */

/* ---------- SUPABASE ---------- */

const SUPABASE_URL = "COLE_AQUI_A_URL_DO_SEU_PROJETO";
const SUPABASE_ANON_KEY = "COLE_AQUI_SUA_CHAVE_PUBLICA";

let supabaseClient = null;

if (
    window.supabase &&
    SUPABASE_URL !== "COLE_AQUI_A_URL_DO_SEU_PROJETO" &&
    SUPABASE_ANON_KEY !== "COLE_AQUI_SUA_CHAVE_PUBLICA"
) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}

/* ---------- MENU LATERAL ---------- */

document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(
        "#menuToggle, #menu-toggle, .menu-toggle"
    );

    const sidebar = document.querySelector(
        "#sidebar, .sidebar, .menu-lateral"
    );

    const overlay = document.querySelector(
        "#overlay, .sidebar-overlay"
    );

    function abrirMenu() {
        sidebar?.classList.add("active", "aberto");
        overlay?.classList.add("active", "visivel");

        document.body.classList.add("menu-aberto");

        menuToggle?.setAttribute("aria-expanded", "true");
    }

    function fecharMenu() {
        sidebar?.classList.remove("active", "aberto");
        overlay?.classList.remove("active", "visivel");

        document.body.classList.remove("menu-aberto");

        menuToggle?.setAttribute("aria-expanded", "false");
    }

    menuToggle?.addEventListener("click", () => {
        if (
            sidebar?.classList.contains("active") ||
            sidebar?.classList.contains("aberto")
        ) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    });

    overlay?.addEventListener("click", fecharMenu);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            fecharMenu();
        }
    });

    /* ---------- FECHAR MENU AO NAVEGAR ---------- */

    sidebar?.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", fecharMenu);
    });

    /* ---------- DATA E HORA ---------- */

    const elementoData = document.querySelector("#dataAtual");
    const elementoHora = document.querySelector("#horaAtual");

    function atualizarDataHora() {
        const agora = new Date();

        if (elementoData) {
            elementoData.textContent = agora.toLocaleDateString(
                "pt-BR",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );
        }

        if (elementoHora) {
            elementoHora.textContent = agora.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
        }
    }

    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);

    /* ---------- DESTAQUE DO MENU ATIVO ---------- */

    const paginaAtual = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    sidebar?.querySelectorAll("a[href]").forEach((link) => {
        const destino = link.getAttribute("href");

        if (!destino || destino.startsWith("#")) return;

        const arquivoDestino = destino
            .split("/")
            .pop()
            .toLowerCase();

        if (arquivoDestino === paginaAtual) {
            link.classList.add("ativo");
            link.setAttribute("aria-current", "page");
        }
    });

    /* ---------- BOTÕES COM DATA-URL ---------- */

    document.querySelectorAll("[data-url]").forEach((botao) => {
        botao.addEventListener("click", () => {
            const destino = botao.dataset.url;

            if (destino) {
                window.location.href = destino;
            }
        });
    });

    /* ---------- CONEXÃO SUPABASE ---------- */

    if (supabaseClient) {
        console.log("Supabase inicializado.");
    } else {
        console.log(
            "Supabase aguardando configuração das credenciais."
        );
    }
});