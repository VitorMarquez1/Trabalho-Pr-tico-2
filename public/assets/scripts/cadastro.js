document.addEventListener('DOMContentLoaded', () => {
    // Usa caminho relativo para a API_URL
    const API_URL = '/receitas';
    const mainContent = document.getElementById('main-content');
    const usuario = JSON.parse(sessionStorage.getItem('usuarioLogado'));
    let editingId = null; 

    // 1. Verifica Permissões de Administrador
    if (!usuario || !usuario.admin) {
        mainContent.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 40px;">
                <h1>Acesso Negado</h1>
                <p>Você precisa ser um administrador para acessar esta página.</p>
                <a href="index.html" class="btn">Voltar para a Página Inicial</a>
            </div>
        `;
        return; 
    }

    // 2. Renderiza formulário e tabela para usuários administradores
    mainContent.innerHTML = `
        <h1>Gerenciamento de Receitas</h1>
        <section class="form-container">
            <h2 id="form-title">Cadastrar Nova Receita</h2>
            <form id="formCadastroReceita">
                <input type="hidden" id="receitaId" name="receitaId">
                <div class="form-group">
                    <label for="nome">Nome da Receita:</label>
                    <input type="text" id="nome" name="nome" required>
                </div>
                <div class="form-group">
                    <label for="descricao_breve">Descrição Breve:</label>
                    <textarea id="descricao_breve" name="descricao_breve" required></textarea>
                </div>
                <div class="form-group">
                    <label for="ingredientes">Ingredientes (um por linha):</label>
                    <textarea id="ingredientes" name="ingredientes" rows="5" required></textarea>
                </div>
                <div class="form-group">
                    <label for="preparo">Modo de Preparo:</label>
                    <textarea id="preparo" name="preparo" rows="5" required></textarea>
                </div>
                <div class="form-group">
                    <label for="tempo_preparo">Tempo de Preparo:</label>
                    <input type="text" id="tempo_preparo" name="tempo_preparo" placeholder="Ex: 45 minutos">
                </div>
                <div class="form-group">
                    <label for="rendimento">Rendimento:</label>
                    <input type="text" id="rendimento" name="rendimento" placeholder="Ex: 8 porções">
                </div>
                <div class="form-group">
                    <label for="categoria">Categoria:</label>
                    <input type="text" id="categoria" name="categoria" required>
                </div>
                <div class="form-group">
                    <label for="imagem_principal">Caminho da Imagem Principal:</label>
                    <input type="text" id="imagem_principal" name="imagem_principal" placeholder="Ex: imagens/nome_da_foto.jpg">
                </div>
                <div class="form-group">
                    <input type="checkbox" id="destaque" name="destaque">
                    <label for="destaque" style="display: inline; font-weight: normal;">Marcar como destaque?</label>
                </div>
                <button type="submit" id="submit-button">Cadastrar Receita</button>
                <button type="button" id="cancel-button" style="display: none; background-color: #6c757d;">Cancelar Edição</button>
            </form>
        </section>
        <section class="table-container">
            <h2>Receitas Cadastradas</h2>
            <table id="tabelaReceitas">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Destaque</th>
                        <th class="actions-column">Ações</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </section>
    `;

    // 3. Referências aos Elementos do DOM
    const form = document.getElementById('formCadastroReceita');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submit-button');
    const cancelButton = document.getElementById('cancel-button');
    const tabelaBody = document.querySelector('#tabelaReceitas tbody');

    // 4. Funções CRUD

    const carregarReceitas = async () => {
        try {
            const response = await fetch(API_URL);
            const receitas = await response.json();
            tabelaBody.innerHTML = ''; 
            receitas.forEach(receita => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${receita.nome}</td>
                    <td>${receita.categoria}</td>
                    <td>${receita.destaque ? 'Sim' : 'Não'}</td>
                    <td class="actions-column">
                        <button class="btn-action btn-edit" data-id="${receita.id}">Editar</button>
                        <button class="btn-action btn-delete" data-id="${receita.id}">Excluir</button>
                    </td>
                `;
                tabelaBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Erro ao carregar receitas:', error);
            tabelaBody.innerHTML = '<tr><td colspan="4">Erro ao carregar dados.</td></tr>';
        }
    };

    const popularFormularioParaEdicao = async (id) => {
        try {
            const response = await fetch(`${API_URL}/${id}`);
            const receita = await response.json();
            
            form.nome.value = receita.nome;
            form.descricao_breve.value = receita.descricao_breve;
            form.ingredientes.value = (receita.ingredientes || []).join('\n');
            form.preparo.value = receita.preparo;
            form.tempo_preparo.value = receita.tempo_preparo || ''; // Adicionado
            form.rendimento.value = receita.rendimento || '';     // Adicionado
            form.categoria.value = receita.categoria;
            form.imagem_principal.value = receita.imagem_principal;
            form.destaque.checked = receita.destaque;
            
            editingId = id;
            formTitle.textContent = 'Editando Receita';
            submitButton.textContent = 'Salvar Alterações';
            cancelButton.style.display = 'inline-block';
            window.scrollTo(0, 0); 
        } catch (error) {
            console.error('Erro ao buscar receita para edição:', error);
            alert('Erro ao carregar dados da receita para edição.');
        }
    };

    const deletarReceita = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
        
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            alert('Receita excluída com sucesso!');
            carregarReceitas(); 
        } catch (error) {
            console.error('Erro ao excluir receita:', error);
            alert('Falha ao excluir a receita.');
        }
    };
    
    const resetarFormulario = () => {
        form.reset();
        editingId = null;
        formTitle.textContent = 'Cadastrar Nova Receita';
        submitButton.textContent = 'Cadastrar Receita';
        cancelButton.style.display = 'none';
    };

    // 5. Event Listeners

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dadosReceita = {
            nome: form.nome.value,
            descricao_breve: form.descricao_breve.value,
            descricao_completa: form.descricao_breve.value, 
            ingredientes: form.ingredientes.value.split('\n').filter(line => line.trim() !== ''),
            preparo: form.preparo.value,
            tempo_preparo: form.tempo_preparo.value, // Adicionado
            rendimento: form.rendimento.value,         // Adicionado
            categoria: form.categoria.value,
            tags: form.categoria.value.split(/, | /).map(t => t.trim()),
            imagem_principal: form.imagem_principal.value,
            destaque: form.destaque.checked,
            rating: editingId ? undefined : { value: 0, count: 0 }
        };
        
        if (dadosReceita.rating === undefined) {
           delete dadosReceita.rating;
        }

        const method = editingId ? 'PATCH' : 'POST';
        const url = editingId ? `${API_URL}/${editingId}` : API_URL;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosReceita)
            });

            if (!response.ok) throw new Error('Falha ao salvar a receita.');

            alert(`Receita ${editingId ? 'atualizada' : 'cadastrada'} com sucesso!`);
            resetarFormulario();
            carregarReceitas();

        } catch (error) {
            console.error('Erro ao salvar receita:', error);
            alert('Ocorreu um erro ao salvar a receita.');
        }
    });

    tabelaBody.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('btn-edit')) {
            popularFormularioParaEdicao(id);
        } else if (target.classList.contains('btn-delete')) {
            deletarReceita(id);
        }
    });

    cancelButton.addEventListener('click', resetarFormulario);

    // 6. Carga Inicial
    carregarReceitas();
});