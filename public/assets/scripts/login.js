document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const formCadastroUsuario = document.getElementById('formCadastroUsuario');

    // Usa um caminho relativo para a URL da API
    const API_URL = '/usuarios';

    // Manipulador para o formulário de login
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const login = e.target.login.value;
            const senha = e.target.senha.value;

            try {
                const response = await fetch(`${API_URL}?login=${login}&senha=${senha}`);
                if (!response.ok) {
                    throw new Error('Falha na comunicação com o servidor.');
                }
                const users = await response.json();

                if (users.length > 0) {
                    const user = users[0];
                    // Salva as informações do usuário no sessionStorage para manter a sessão
                    sessionStorage.setItem('usuarioLogado', JSON.stringify(user));
                    alert('Login realizado com sucesso!');
                    window.location.href = 'index.html'; // Redireciona para a home
                } else {
                    alert('Login ou senha inválidos.');
                }
            } catch (error) {
                console.error('Erro ao fazer login:', error);
                alert('Ocorreu um erro ao tentar fazer login.');
            }
        });
    }

    // Manipulador para o formulário de cadastro de usuário
    if (formCadastroUsuario) {
        formCadastroUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const senha = e.target.senha.value;
            const confirmaSenha = e.target.confirma_senha.value;

            if (senha !== confirmaSenha) {
                alert('As senhas não coincidem. Por favor, tente novamente.');
                return;
            }

            const novoUsuario = {
                nome: e.target.nome.value,
                email: e.target.email.value,
                login: e.target.login.value,
                senha: senha,
                admin: false // Novos usuários nunca são administradores
            };

            try {
                 // Verifica se o login já existe
                const checkResponse = await fetch(`${API_URL}?login=${novoUsuario.login}`);
                const existingUsers = await checkResponse.json();

                if (existingUsers.length > 0) {
                    alert('Este login já está em uso. Por favor, escolha outro.');
                    return;
                }

                // Se o login estiver disponível, prossegue com o cadastro
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoUsuario)
                });

                if (response.ok) {
                    alert('Cadastro realizado com sucesso! Você já pode fazer o login.');
                    window.location.href = 'login.html';
                } else {
                    throw new Error('Não foi possível realizar o cadastro.');
                }
            } catch (error) {
                console.error('Erro ao cadastrar usuário:', error);
                alert('Ocorreu um erro durante o cadastro.');
            }
        });
    }
});