document.addEventListener('DOMContentLoaded', () => {
    // A URL base da API é relativa, assumindo que o front-end é servido da mesma origem que a API.
    const API_BASE_URL = '';
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    // --- Estado para o Carrossel de Destaques ---
    let destaques = [];
    let destaqueAtualIndex = 0;

    // --- Funções de UI ---

    /**
     * Configura o menu de navegação principal com base no status de login do usuário.
     * Esta função é chamada em cada carregamento de página para garantir a consistência do menu.
     */
    function setupMenu() {
        const nav = document.getElementById('nav-principal');
        if (!nav) return;

        let menuHtml = '<a href="index.html">Página Inicial</a>';

        if (usuarioLogado) {
            menuHtml += ` <a href="favoritos.html">Favoritos</a>`;
            // O link "Gerenciar Receitas" é mostrado apenas para usuários administradores
            if (usuarioLogado.admin) {
                menuHtml += ` <a href="cadastro_receitas.html">Gerenciar Receitas</a>`;
            }
            menuHtml += ` <a href="#" id="logout-btn">Logout (${usuarioLogado.nome})</a>`;
        } else {
            menuHtml += ` <a href="login.html">Login</a>`;
        }
        nav.innerHTML = menuHtml;

        // Adiciona a funcionalidade de logout
        if (usuarioLogado) {
            document.getElementById('logout-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('usuarioLogado');
                alert('Você foi desconectado.');
                window.location.href = '/'; // Redireciona para a raiz do site
            });
        }
    }

    /**
     * Alterna o status de favorito de uma receita para o usuário logado.
     * Persiste a alteração no servidor.
     * @param {string} receitaId - O ID da receita a ser alternada.
     * @param {HTMLElement} iconElement - O elemento <i> do ícone de coração para atualizar sua classe.
     */
    async function toggleFavorito(receitaId, iconElement) {
        if (!usuarioLogado) {
            alert("Você precisa estar logado para favoritar receitas.");
            window.location.href = 'login.html';
            return;
        }

        const userId = usuarioLogado.id;

        try {
            const favResponse = await fetch(`${API_BASE_URL}/favoritos?userId=${userId}&receitaId=${receitaId}`);
            if (!favResponse.ok) throw new Error(`Erro de rede ao verificar favoritos (Status: ${favResponse.status})`);

            const favoritosExistentes = await favResponse.json();

            if (favoritosExistentes.length > 0) {
                // Remove dos favoritos
                const favId = favoritosExistentes[0].id;
                const deleteResponse = await fetch(`${API_BASE_URL}/favoritos/${favId}`, { method: 'DELETE' });
                if (!deleteResponse.ok) throw new Error(`Não foi possível remover o favorito (Status: ${deleteResponse.status})`);

                iconElement.classList.remove('fas', 'favorited');
                iconElement.classList.add('far'); // Muda para coração vazio
            } else {
                // Adiciona aos favoritos
                const novoFavorito = { userId: userId, receitaId: receitaId };
                const postResponse = await fetch(`${API_BASE_URL}/favoritos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoFavorito)
                });
                if (!postResponse.ok) throw new Error(`Não foi possível adicionar o favorito (Status: ${postResponse.status})`);

                iconElement.classList.remove('far');
                iconElement.classList.add('fas', 'favorited'); // Muda para coração preenchido
            }
        } catch (error) {
            console.error("Erro detalhado no processo de favoritar:", error);
            alert(`Ocorreu um erro ao processar sua solicitação de favorito.\n\nDetalhes: ${error.message}`);
        }
    }

    /**
     * Cria e retorna um elemento de card de receita.
     * @param {object} receita - O objeto com os dados da receita.
     * @param {string[]} favoritosDoUsuario - Um array de IDs de receitas favoritadas pelo usuário.
     * @returns {HTMLElement} A div do card da receita.
     */
    async function renderRecipeCard(receita, favoritosDoUsuario = []) {
        const card = document.createElement('div');
        card.className = 'card';

        const isFavorito = favoritosDoUsuario.includes(receita.id.toString());
        const iconClass = isFavorito ? 'fas favorited' : 'far'; // Ícone de coração preenchido ou vazio

        card.innerHTML = `
            <img src="${receita.imagem_principal || 'imagens/placeholder_card.jpg'}" class="card-img-top" alt="${receita.nome}" onerror="this.onerror=null;this.src='imagens/placeholder_card.jpg';">
            <div class="card-body">
                <h5 class="card-title">${receita.nome}</h5>
                <p class="card-text">${receita.descricao_breve ? receita.descricao_breve.substring(0, 100) + '...' : ''}</p>
                <div class="card-actions">
                    <a href="detalhes.html?id=${receita.id}" class="btn">Detalhes</a>
                    <span class="fav-icon" data-receita-id="${receita.id}"><i class="${iconClass} fa-heart"></i></span>
                </div>
            </div>
        `;

        card.querySelector('.fav-icon')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const icon = e.currentTarget.querySelector('i');
            toggleFavorito(receita.id, icon);
        });

        return card;
    }

    /**
     * Busca a lista de IDs de receitas favoritas para o usuário logado.
     * @returns {Promise<string[]>} Uma promessa que resolve para um array de IDs de receitas.
     */
    async function getFavoritosDoUsuario() {
        if (!usuarioLogado) return [];
        try {
            const response = await fetch(`${API_BASE_URL}/favoritos?userId=${usuarioLogado.id}`);
            if (!response.ok) return [];
            const favs = await response.json();
            return favs.map(f => f.receitaId.toString());
        } catch (error) {
            console.error("Erro ao buscar favoritos do usuário:", error);
            return [];
        }
    }

    // --- Lógica Específica da Página ---

    /**
     * Inicializa todas as funcionalidades da Página Inicial (index.html).
     */
    async function initHomePage() {
        const gridReceitas = document.getElementById('gridReceitas');
        const campoBusca = document.getElementById('campo-busca');
        const btnBusca = document.getElementById('btn-busca');

        const favoritosDoUsuario = await getFavoritosDoUsuario();

        // Busca e renderiza a grade principal de receitas, aplicando uma query de busca se fornecida.
        const fetchAndRenderRecipes = async (query = '') => {
            if (!gridReceitas) return;
            gridReceitas.innerHTML = '<p class="loading-placeholder">Carregando receitas...</p>';
            try {
                // A query de busca é enviada para o json-server
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

        // Renderiza uma única receita em destaque no container do carrossel.
        const renderFeaturedItem = () => {
            const carouselContainer = document.getElementById('carousel-featured-recipe');
            if (!carouselContainer || destaques.length === 0) return;
            
            const receita = destaques[destaqueAtualIndex];
            carouselContainer.innerHTML = `
                <div class="featured-recipe-item">
                    <img src="${receita.imagem_principal || 'imagens/placeholder_card.jpg'}" alt="${receita.nome}" onerror="this.onerror=null;this.src='imagens/placeholder_card.jpg';">
                    <div class="featured-recipe-content">
                        <h3>${receita.nome}</h3>
                        <p>${receita.descricao_breve}</p>
                        <a href="detalhes.html?id=${receita.id}" class="btn">Ver Receita Completa</a>
                    </div>
                </div>
                <button class="carousel-control-prev" id="prev-destaque">&#10094;</button>
                <button class="carousel-control-next" id="next-destaque">&#10095;</button>
            `;

            // Adiciona event listeners para os novos botões
            document.getElementById('prev-destaque').addEventListener('click', () => {
                destaqueAtualIndex = (destaqueAtualIndex - 1 + destaques.length) % destaques.length;
                renderFeaturedItem();
            });
            document.getElementById('next-destaque').addEventListener('click', () => {
                destaqueAtualIndex = (destaqueAtualIndex + 1) % destaques.length;
                renderFeaturedItem();
            });
        };
        
        // Busca as receitas em destaque e inicializa o carrossel.
        const fetchAndRenderFeatured = async () => {
            const carouselContainer = document.getElementById('carousel-featured-recipe');
            if (!carouselContainer) return;
            try {
                const response = await fetch(`${API_BASE_URL}/receitas?destaque=true`);
                destaques = await response.json();
                if (destaques.length > 0) {
                    renderFeaturedItem();
                } else {
                    carouselContainer.innerHTML = '<p>Nenhuma receita em destaque no momento.</p>';
                }
            } catch (error) {
                carouselContainer.innerHTML = '<p class="error-message">Erro ao carregar destaques.</p>';
                console.error("Erro ao buscar destaques:", error);
            }
        };

        // Lida com a entrada de busca e cliques no botão.
        const handleSearch = () => {
            const termo = campoBusca.value.trim();
            const query = termo ? `?q=${encodeURIComponent(termo)}` : '';
            fetchAndRenderRecipes(query);
        };

        if (btnBusca && campoBusca) {
            btnBusca.addEventListener('click', handleSearch);
            campoBusca.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') handleSearch();
            });
        }
        
        fetchAndRenderRecipes();
        fetchAndRenderFeatured();
    }
    
    /**
     * Inicializa todas as funcionalidades da Página de Favoritos (favoritos.html).
     */
    async function initFavoritosPage() {
        const gridFavoritos = document.getElementById('gridFavoritos');
        if (!gridFavoritos) return;

        if (!usuarioLogado) {
            gridFavoritos.innerHTML = '<p class="error-message">Você precisa estar logado para ver seus favoritos. <a href="login.html">Faça login</a>.</p>';
            return;
        }

        gridFavoritos.innerHTML = '<p class="loading-placeholder">Carregando seus favoritos...</p>';
        try {
            // Usa _expand para buscar os dados da receita relacionada junto com a entrada de favorito
            const response = await fetch(`${API_BASE_URL}/favoritos?userId=${usuarioLogado.id}&_expand=receita`);
            if(!response.ok) throw new Error('Falha ao buscar favoritos.');
            
            const favoritos = await response.json();
            
            gridFavoritos.innerHTML = '';
            if (favoritos.length === 0) {
                gridFavoritos.innerHTML = '<p>Você ainda não tem receitas favoritas.</p>';
            } else {
                const favoritosIDs = favoritos.map(f => f.receita.id.toString());
                for (const fav of favoritos) {
                    if (fav.receita) {
                        const card = await renderRecipeCard(fav.receita, favoritosIDs);
                        gridFavoritos.appendChild(card);
                    }
                }
            }
        } catch (error) {
            gridFavoritos.innerHTML = '<p class="error-message">Erro ao carregar favoritos.</p>';
            console.error("Erro na página de favoritos:", error);
        }
    }
    
    /**
     * Inicializa todas as funcionalidades da Página de Detalhes (detalhes.html).
     */
    async function initDetalhesPage() {
        const detalhesContainer = document.getElementById('detalhes-container');
        if (!detalhesContainer) return;

        const urlParams = new URLSearchParams(window.location.search);
        const receitaId = urlParams.get('id');

        if (!receitaId) {
            detalhesContainer.innerHTML = '<p class="error-message">ID da receita não fornecido.</p>';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/receitas/${receitaId}`);
            if (!response.ok) throw new Error('Receita não encontrada.');
            
            const receita = await response.json();
            document.title = receita.nome; 

            // Renderiza os detalhes básicos da receita
            detalhesContainer.innerHTML = `
                <img src="${receita.imagem_principal || 'imagens/placeholder_card.jpg'}" alt="${receita.nome}" class="recipe-main-image" onerror="this.onerror=null;this.src='imagens/placeholder_card.jpg';">
                <header class="recipe-header">
                    <h1 class="recipe-title">${receita.nome}</h1>
                    <div class="recipe-actions">
                         <div class="recipe-meta-item">
                            <i class="far fa-clock"></i>
                            <span>${receita.tempo_preparo || 'Não informado'}</span>
                        </div>
                        <div class="recipe-meta-item">
                            <i class="fas fa-users"></i>
                            <span>${receita.rendimento || 'Não informado'}</span>
                        </div>
                        <span class="fav-icon-details" data-receita-id="${receita.id}">
                            <i class="far fa-heart"></i>
                        </span>
                    </div>
                </header>
                <div class="recipe-tags">
                    ${(receita.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="recipe-description-box">
                    <p>${receita.descricao_completa || receita.descricao_breve}</p>
                </div>
                <h2 class="recipe-section-title">Ingredientes</h2>
                <div class="recipe-ingredients">
                    <ul>
                        ${(receita.ingredientes || []).map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </div>
                <h2 class="recipe-section-title">Modo de Preparo</h2>
                <div class="recipe-instructions">
                    <ol>
                        ${(receita.preparo || '').split('. ').filter(p => p).map(passo => `<li>${passo.trim()}</li>`).join('')}
                    </ol>
                </div>
            `;

            // Configura o ícone de favorito se o usuário estiver logado
            if (usuarioLogado) {
                const favIconContainer = detalhesContainer.querySelector('.fav-icon-details');
                const favIcon = favIconContainer.querySelector('i');
                favIconContainer.style.display = 'inline-block'; // Torna visível

                const favoritosDoUsuario = await getFavoritosDoUsuario();
                if (favoritosDoUsuario.includes(receitaId)) {
                    favIcon.classList.add('fas', 'favorited');
                    favIcon.classList.remove('far');
                }

                favIconContainer.addEventListener('click', () => {
                    toggleFavorito(receitaId, favIcon);
                });
            }

        } catch (error) {
            detalhesContainer.innerHTML = `<p class="error-message">Erro ao carregar detalhes da receita: ${error.message}</p>`;
            console.error(error);
        }
    }

    // --- Inicialização Global ---

    setupMenu(); // Sempre configure o menu primeiro

    // Roteia para a função de inicialização correta com base no conteúdo da página
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