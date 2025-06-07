document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const formCadastroUsuario = document.getElementById('formCadastroUsuario');

    const API_URL = 'http://localhost:3000/usuarios';

    // Handler para o formulário de login
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
                    // Salva informações do usuário na sessionStorage
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

    // Handler para o formulário de cadastro de usuário
    if (formCadastroUsuario) {
        formCadastroUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            const novoUsuario = {
                nome: e.target.nome.value,
                email: e.target.email.value,
                login: e.target.login.value,
                senha: e.target.senha.value,
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