document.addEventListener('DOMContentLoaded', () => {
    // A API agora está na mesma origem do site, então podemos usar um caminho relativo.
    const API_BASE_URL = ''; 
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    // --- Funções de UI ---

    function setupMenu() {
        const nav = document.getElementById('nav-principal');
        if (!nav) return;

        let menuHtml = '<a href="index.html">Página Inicial</a>';

        if (usuarioLogado) {
            menuHtml += ` <a href="favoritos.html">Favoritos</a>`;
            if (usuarioLogado.admin) {
                menuHtml += ` <a href="cadastro_receitas.html">Gerenciar Receitas</a>`;
            }
            menuHtml += ` <a href="#" id="logout-btn">Logout (${usuarioLogado.nome})</a>`;
        } else {
            menuHtml += ` <a href="login.html">Login</a>`;
        }
        nav.innerHTML = menuHtml;

        if (usuarioLogado) {
            document.getElementById('logout-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('usuarioLogado');
                alert('Você foi desconectado.');
                window.location.href = '/'; // Redireciona para a raiz do site
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
        
        try {
            const favResponse = await fetch(`${API_BASE_URL}/favoritos?userId=${userId}&receitaId=${receitaId}`);
            if (!favResponse.ok) throw new Error(`Erro de rede ao verificar favoritos (Status: ${favResponse.status})`);
            
            const favoritos = await favResponse.json();

            if (favoritos.length > 0) {
                const favId = favoritos[0].id;
                const deleteResponse = await fetch(`${API_BASE_URL}/favoritos/${favId}`, { method: 'DELETE' });
                if (!deleteResponse.ok) throw new Error(`Não foi possível remover o favorito (Status: ${deleteResponse.status})`);
                
                iconElement.classList.remove('fas', 'favorited');
                iconElement.classList.add('far');
            } else {
                const novoFavorito = { userId: userId, receitaId: receitaId };
                const postResponse = await fetch(`${API_BASE_URL}/favoritos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoFavorito)
                });
                if (!postResponse.ok) throw new Error(`Não foi possível adicionar o favorito (Status: ${postResponse.status})`);
                
                iconElement.classList.remove('far');
                iconElement.classList.add('fas', 'favorited');
            }
        } catch (error) {
            console.error("Erro detalhado no processo de favoritar:", error);
            alert(`Ocorreu um erro ao processar sua solicitação de favorito.\n\nDetalhes: ${error.message}`);
        }
    }
    
    async function renderRecipeCard(receita, favoritosDoUsuario = []) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const isFavorito = favoritosDoUsuario.includes(receita.id.toString());
        const iconClass = isFavorito ? 'fas favorited' : 'far';

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

    // --- Lógica das Páginas ---

    async function initHomePage() {
        const gridReceitas = document.getElementById('gridReceitas');
        const campoBusca = document.getElementById('campo-busca');
        const btnBusca = document.getElementById('btn-busca');
        const carouselContainer = document.getElementById('carousel-featured-recipe');
        
        const favoritosDoUsuario = await getFavoritosDoUsuario();

        const fetchAndRenderRecipes = async (query = '') => {
            if (!gridReceitas) return;
            gridReceitas.innerHTML = '<p class="loading-placeholder">Carregando receitas...</p>';
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

        const fetchAndRenderFeatured = async () => {
            if (!carouselContainer) return;
            try {
                const response = await fetch(`${API_BASE_URL}/receitas?destaque=true`);
                const destaques = await response.json();
                carouselContainer.innerHTML = '';
                if (destaques.length > 0) {
                    const receita = destaques[0];
                    carouselContainer.innerHTML = `
                        <div class="featured-recipe-item">
                            <img src="${receita.imagem_principal || 'imagens/placeholder_card.jpg'}" alt="${receita.nome}" onerror="this.onerror=null;this.src='imagens/placeholder_card.jpg';">
                            <div class="featured-recipe-content">
                                <h3>${receita.nome}</h3>
                                <p>${receita.descricao_breve}</p>
                                <a href="detalhes.html?id=${receita.id}" class="btn">Ver Receita Completa</a>
                            </div>
                        </div>`;
                } else {
                    carouselContainer.innerHTML = '<p>Nenhuma receita em destaque no momento.</p>';
                }
            } catch (error) {
                carouselContainer.innerHTML = '<p class="error-message">Erro ao carregar destaques.</p>';
                console.error("Erro ao buscar destaques:", error);
            }
        };

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

    async function initFavoritosPage() {
        const gridFavoritos = document.getElementById('gridFavoritos');
        if (!gridFavoritos) return;

        if (!usuarioLogado) {
            gridFavoritos.innerHTML = '<p class="error-message">Você precisa estar logado para ver seus favoritos. <a href="login.html">Faça login</a>.</p>';
            return;
        }

        gridFavoritos.innerHTML = '<p class="loading-placeholder">Carregando seus favoritos...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}/favoritos?userId=${usuarioLogado.id}&_expand=receita`);
            if(!response.ok) throw new Error('Falha ao buscar favoritos.');
            
            const favoritos = await response.json();
            
            gridFavoritos.innerHTML = '';
            if (favoritos.length === 0) {
                gridFavoritos.innerHTML = '<p>Você ainda não tem receitas favoritas.</p>';
            } else {
                const favoritosDoUsuario = favoritos.map(f => f.receita.id.toString());
                for (const fav of favoritos) {
                    if (fav.receita) {
                        const card = await renderRecipeCard(fav.receita, favoritosDoUsuario);
                        gridFavoritos.appendChild(card);
                    }
                }
            }
        } catch (error) {
            gridFavoritos.innerHTML = '<p class="error-message">Erro ao carregar favoritos.</p>';
            console.error("Erro na página de favoritos:", error);
        }
    }
    
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

            detalhesContainer.innerHTML = `
                <img src="${receita.imagem_principal || 'imagens/placeholder_card.jpg'}" alt="${receita.nome}" class="recipe-main-image" onerror="this.onerror=null;this.src='imagens/placeholder_card.jpg';">
                <header class="recipe-header">
                    <h1 class="recipe-title">${receita.nome}</h1>
                    <div class="recipe-time">
                        <i class="far fa-clock"></i>
                        <span>${receita.tempo_preparo || 'Não informado'}</span>
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
                        ${(receita.preparo || '').split('. ').filter(p => p).map(passo => `<li>${passo}</li>`).join('')}
                    </ol>
                </div>
            `;
        } catch (error) {
            detalhesContainer.innerHTML = `<p class="error-message">Erro ao carregar detalhes da receita: ${error.message}</p>`;
            console.error(error);
        }
    }

    // --- Inicialização ---

    setupMenu();

    if (document.querySelector('#gridReceitas')) {
        initHomePage();
    }
    if (document.querySelector('#gridFavoritos')) {
        initFavoritosPage();
    }
    if (document.querySelector('#detalhes-container')) {
        initDetalhesPage();
    }
});