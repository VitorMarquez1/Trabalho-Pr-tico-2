document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000';
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    // --- Funções de UI ---

    function setupMenu() {
        const nav = document.getElementById('nav-principal');
        if (!nav) return;

        let menuHtml = '<a href="index.html">Página Inicial</a>';

        if (usuarioLogado) {
            // Usuário está logado
            menuHtml += ` <a href="favoritos.html">Favoritos</a>`;
            if (usuarioLogado.admin) {
                menuHtml += ` <a href="cadastro_receitas.html">Cadastrar Receita</a>`;
            }
            menuHtml += ` <a href="#" id="logout-btn">Logout (${usuarioLogado.nome})</a>`;
        } else {
            // Usuário deslogado
            menuHtml += ` <a href="login.html">Login</a>`;
        }
        nav.innerHTML = menuHtml;

        if (usuarioLogado) {
            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('usuarioLogado');
                alert('Você foi desconectado.');
                window.location.href = 'index.html';
            });
        }
    }

    async function toggleFavorito(receitaId, iconElement) {
        if (!usuarioLogado) {
            alert("Você precisa estar logado para favoritar receitas.");
            window.location.href = 'login.html';
            return;
        }

        const userId = usuarioLogado.id;
        
        // Verifica se já é favorito
        const favResponse = await fetch(`${API_BASE_URL}/favoritos?userId=${userId}&receitaId=${receitaId}`);
        const favoritos = await favResponse.json();

        if (favoritos.length > 0) {
            // Já é favorito -> Remover
            const favId = favoritos[0].id;
            await fetch(`${API_BASE_URL}/favoritos/${favId}`, { method: 'DELETE' });
            iconElement.classList.remove('fas', 'favorited');
            iconElement.classList.add('far');
            alert('Receita removida dos favoritos!');
        } else {
            // Não é favorito -> Adicionar
            const novoFavorito = { userId, receitaId };
            await fetch(`${API_BASE_URL}/favoritos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoFavorito)
            });
            iconElement.classList.remove('far');
            iconElement.classList.add('fas', 'favorited');
            alert('Receita adicionada aos favoritos!');
        }
    }
    
    async function renderRecipeCard(receita, favoritosDoUsuario) {
        const card = document.createElement('div');
        card.classList.add('card');
        
        const isFavorito = favoritosDoUsuario.includes(receita.id);
        const iconClass = isFavorito ? 'fas favorited' : 'far';

        card.innerHTML = `
            <img src="${receita.imagem_principal || 'imagens/placeholder_card.jpg'}" class="card-img-top" alt="${receita.nome}">
            <div class="card-body">
                <h5 class="card-title">${receita.nome}</h5>
                <p class="card-text">${receita.descricao_breve ? receita.descricao_breve.substring(0, 100) + '...' : ''}</p>
                <div class="card-actions">
                    <a href="detalhes.html?id=${receita.id}" class="btn">Detalhes</a>
                    <span class="fav-icon" data-receita-id="${receita.id}"><i class="${iconClass} fa-heart"></i></span>
                </div>
            </div>
        `;
        
        card.querySelector('.fav-icon').addEventListener('click', (e) => {
            e.stopPropagation();
            const icon = e.currentTarget.querySelector('i');
            toggleFavorito(receita.id, icon);
        });

        return card;
    }

    // --- Lógica das Páginas ---
    
    // ... (início do seu app.js)

    async function initHomePage() {
        const gridReceitas = document.getElementById('gridReceitas');
        const campoBusca = document.getElementById('campo-busca');
        const btnBusca = document.getElementById('btn-busca');

        let favoritosDoUsuario = [];
        if (usuarioLogado) {
            // Bloco de código corrigido com try...catch
            try {
                const response = await fetch(`${API_BASE_URL}/favoritos?userId=${usuarioLogado.id}`);
                if (response.ok) {
                    const favs = await response.json();
                    favoritosDoUsuario = favs.map(f => f.receitaId);
                } else {
                    // Adiciona um aviso no console do navegador caso a entidade 'favoritos' não seja encontrada
                    console.warn("Aviso: Não foi possível carregar os favoritos. Verifique se a entidade 'favoritos' existe no seu db.json.");
                }
            } catch (error) {
                console.error("Erro ao buscar favoritos:", error);
                // A página continuará a carregar as receitas mesmo se houver um erro aqui.
            }
        }

        const fetchAndRenderRecipes = async (query = '') => {
            if (!gridReceitas) return;
            gridReceitas.innerHTML = '<p class="loading-placeholder">Carregando...</p>';
            try {
                const response = await fetch(`${API_BASE_URL}/receitas${query}`);
                const receitas = await response.json();
                gridReceitas.innerHTML = '';
                if (receitas.length === 0) {
                    gridReceitas.innerHTML = '<p>Nenhuma receita encontrada.</p>';
                } else {
                    for (const receita of receitas) {
                        const card = await renderRecipeCard(receita, favoritosDoUsuario);
                        gridReceitas.appendChild(card);
                    }
                }
            } catch (error) {
                gridReceitas.innerHTML = '<p class="error-message">Erro ao carregar receitas.</p>';
                console.error(error);
            }
        };

        const handleSearch = () => {
            const termo = campoBusca.value.trim();
            if (termo) {
                fetchAndRenderRecipes(`?q=${encodeURIComponent(termo)}`);
            } else {
                fetchAndRenderRecipes();
            }
        };

        if (btnBusca && campoBusca) {
            btnBusca.addEventListener('click', handleSearch);
            campoBusca.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') handleSearch();
            });
        }
        
        fetchAndRenderRecipes(); // Carga inicial
    }

// ... (resto do seu app.js)

    async function initFavoritosPage() {
        const gridFavoritos = document.getElementById('gridFavoritos');
        if (!usuarioLogado) {
            gridFavoritos.innerHTML = '<p class="error-message">Você precisa estar logado para ver seus favoritos. <a href="login.html">Faça login</a>.</p>';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/favoritos?userId=${usuarioLogado.id}&_expand=receita`);
            const favoritos = await response.json();

            gridFavoritos.innerHTML = '';
            if (favoritos.length === 0) {
                gridFavoritos.innerHTML = '<p>Você ainda não tem receitas favoritas.</p>';
            } else {
                for (const fav of favoritos) {
                    if (fav.receita) {
                        // Passamos um array com o ID da própria receita para que o ícone apareça preenchido
                        const card = await renderRecipeCard(fav.receita, [fav.receita.id]);
                        gridFavoritos.appendChild(card);
                    }
                }
            }
        } catch (error) {
            gridFavoritos.innerHTML = '<p class="error-message">Erro ao carregar favoritos.</p>';
            console.error(error);
        }
    }
    
    async function initDetalhesPage() {
        // ... (seu código de detalhes existente, com pequenas adaptações) ...
        const detalhesContainer = document.getElementById('detalhes-container');
        const urlParams = new URLSearchParams(window.location.search);
        const receitaId = urlParams.get('id');

        // Adicione a lógica do ícone de favorito aqui também
    }

    // --- Inicialização ---

    setupMenu();

    if (document.getElementById('gridReceitas')) {
        initHomePage();
    }
    if (document.getElementById('gridFavoritos')) {
        initFavoritosPage();
    }
    if (document.getElementById('detalhes-container')) {
        initDetalhesPage();
    }
});