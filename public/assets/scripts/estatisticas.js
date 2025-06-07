document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/receitas';
    const ctx = document.getElementById('categoriasChart')?.getContext('2d');

    if (!ctx) {
        console.error('Elemento canvas para o gráfico não encontrado!');
        return;
    }

    async function carregarEstatisticas() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Erro HTTP! status: ${response.status}`);
            }
            const receitas = await response.json();

            if (!receitas || receitas.length === 0) {
                console.warn('Nenhuma receita encontrada para gerar estatísticas.');
                // Você pode exibir uma mensagem na tela aqui, se desejar
                const chartContainer = document.querySelector('.chart-container');
                if(chartContainer) {
                    chartContainer.innerHTML = '<p>Nenhuma receita cadastrada para exibir estatísticas.</p>';
                }
                return;
            }

            // Processar dados para o gráfico de pizza
            const categoriasCount = {};
            receitas.forEach(receita => {
                const categoria = receita.categoria || 'Sem Categoria'; // Trata receitas sem categoria
                categoriasCount[categoria] = (categoriasCount[categoria] || 0) + 1;
            });

            const labels = Object.keys(categoriasCount);
            const data = Object.values(categoriasCount);

            // Cores para o gráfico (pode adicionar mais se tiver muitas categorias)
            const backgroundColors = [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)',
                'rgba(199, 199, 199, 0.7)',
                'rgba(83, 102, 255, 0.7)',
                'rgba(102, 255, 83, 0.7)'
            ];

            const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));

            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Receitas por Categoria',
                        data: data,
                        backgroundColor: backgroundColors.slice(0, labels.length),
                        borderColor: borderColors.slice(0, labels.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Distribuição de Receitas por Categoria Culinária'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                        const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(2) : 0;
                                        label += `${context.raw} (${percentage}%)`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Erro ao carregar estatísticas das receitas:', error);
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = '<p class="error-message">Erro ao carregar estatísticas. Tente novamente mais tarde.</p>';
            }
        }
    }

    carregarEstatisticas();
});