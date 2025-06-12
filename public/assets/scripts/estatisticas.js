document.addEventListener('DOMContentLoaded', () => {
    // Use relative path for API_URL
    const API_URL = '/receitas';
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
                const chartContainer = document.getElementById('categoriasChart').parentElement;
                if(chartContainer) {
                    chartContainer.innerHTML = '<p>Nenhuma receita cadastrada para exibir estatísticas.</p>';
                }
                return;
            }

            // Process data for the pie chart
            const categoriasCount = {};
            receitas.forEach(receita => {
                const categoria = receita.categoria || 'Sem Categoria';
                categoriasCount[categoria] = (categoriasCount[categoria] || 0) + 1;
            });

            const labels = Object.keys(categoriasCount);
            const data = Object.values(categoriasCount);

            // PALETA DE CORES ATUALIZADA E EXPANDIDA
            const backgroundColors = [
                'rgba(255, 99, 132, 0.8)',  // Vermelho
                'rgba(54, 162, 235, 0.8)',  // Azul
                'rgba(255, 206, 86, 0.8)',  // Amarelo
                'rgba(75, 192, 192, 0.8)',  // Verde-água
                'rgba(153, 102, 255, 0.8)', // Roxo
                'rgba(255, 159, 64, 0.8)',  // Laranja
                'rgba(46, 204, 113, 0.8)',   // Verde Esmeralda
                'rgba(231, 84, 128, 0.8)',  // Rosa
                'rgba(0, 188, 212, 0.8)',   // Ciano
                'rgba(141, 69, 19, 0.8)',   // Marrom
                'rgba(211, 84, 0, 0.8)',    // Laranja Escuro
                'rgba(149, 165, 166, 0.8)'  // Cinza
            ];

            const borderColors = backgroundColors.map(color => color.replace('0.8', '1'));

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
                            text: 'Distribuição de Receitas por Categoria'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(2) : 0;
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Erro ao carregar estatísticas das receitas:', error);
            const chartContainer = document.getElementById('categoriasChart').parentElement;
            if (chartContainer) {
                chartContainer.innerHTML = '<p class="error-message">Erro ao carregar estatísticas. Tente novamente mais tarde.</p>';
            }
        }
    }

    carregarEstatisticas();
});