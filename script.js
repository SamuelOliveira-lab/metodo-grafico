let meuGrafico = null;
const cores = ['red', 'blue', 'green', 'purple', 'orange', 'brown', 'pink', 'cyan'];

document.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();

    const fObjetivo = document.getElementById('fobjetivo').value;
    const objetivo = document.querySelector('input[name="objetivo"]:checked').value;
    const restricoes = document.getElementById('restricoes').value.split('\n').filter(r => r.trim() !== '');

    const coefObjetivo = extrairCoeficientesFO(fObjetivo);
    if (!coefObjetivo) return;

    const restricoesAchadas = restricoes.map(restricao => {
        return extrairCoeficientes(restricao);
    }).filter(r => r !== null);

    desenharGrafico(restricoesAchadas);

    const solucao = encontrarSolucaoOtima(restricoesAchadas, coefObjetivo, objetivo);

    exibirResultado(solucao, fObjetivo);
});


function extrairCoeficientesFO(fo) {
    const string = fo.replace(/\s+/g, '').toLowerCase();
    if (!string.startsWith('z=') && !string.startsWith('maxz=') && !string.startsWith('minz=')) {
        alert('Formato da função objetivo deve ser "Z = ax + by"');
        return null;
    }

    const expressao = string.split('=')[1];
    let a = 0, b = 0;

    const termoX = expressao.match(/([+-]?\d*)x/);
    if (termoX) {
        a = termoX[1] === '' || termoX[1] === '+' ? 1 : (termoX[1] === '-' ? -1 : parseFloat(termoX[1]));
    }

    const termoY = expressao.match(/([+-]?\d*)y/);
    if (termoY) {
        b = termoY[1] === '' || termoY[1] === '+' ? 1 : (termoY[1] === '-' ? -1 : parseFloat(termoY[1]));
    }

    return { a, b };
}

function desenharGrafico(restricoes) {
    const contexto = document.getElementById('grafico').getContext('2d');


    if (meuGrafico) {
        meuGrafico.destroy();
    }


    const datasets = restricoes.map((restricao, index) => {
        const pontos = calcularPontos(restricao);
        const pontosChartJS = pontos.map(ponto => ({ x: ponto.x, y: ponto.y }));

        return {
            label: `Restrição: ${restricao.a}x + ${restricao.b}y ${restricao.operador} ${restricao.c}`,
            data: pontosChartJS,
            borderColor: cores[index % cores.length],
            backgroundColor: cores[index % cores.length],
            fill: false,
            showLine: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2
        };
    });

    const config = {
        type: 'scatter',
        data: {
            datasets: datasets

        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    min: -10,
                    max: 20,
                    grid: {
                        color: (ctx) => ctx.tick.value === 0 ? 'black' : '#ccc',
                        lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1
                    },
                    title: {
                        display: true,
                        text: 'Eixo X'
                    }
                },
                y: {
                    type: 'linear',
                    min: -10,
                    max: 20,
                    grid: {
                        color: (ctx) => ctx.tick.value === 0 ? 'black' : '#ccc',
                        lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1
                    },
                    title: {
                        display: true,
                        text: 'Eixo Y'
                    }
                }
            }
            ,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: (${context.parsed.x}, ${context.parsed.y})`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    };


    meuGrafico = new Chart(contexto, config);
}


function extrairCoeficientes(restricao) {
    const str = restricao.replace(/\s+/g, '');


    const regex = /^(.+?)(<=|>=|=)(.+)$/;
    const match = str.match(regex);

    if (!match) {
        alert('Formato de restrição inválido: ' + restricao);
        return null;
    }

    const parteEsquerda = match[1];
    const operador = match[2];
    const parteDireita = match[3];

    let a = 0, b = 0;


    const termoX = parteEsquerda.match(/([+-]?\d*)x/i);
    if (termoX) {
        a = termoX[1] === '' || termoX[1] === '+' ? 1 : (termoX[1] === '-' ? -1 : parseFloat(termoX[1]));
    }


    const termoY = parteEsquerda.match(/([+-]?\d*)y/i);
    if (termoY) {
        b = termoY[1] === '' || termoY[1] === '+' ? 1 : (termoY[1] === '-' ? -1 : parseFloat(termoY[1]));
    }

    const c = parseFloat(parteDireita);

    return { a, b, c, operador };
}


function calcularPontos({ a, b, c }) {
    const TAMANHO_LINHA = 20;

    if (b === 0) {
        const x = c / a;
        return [{ x: x, y: 0 }, { x: x, y: TAMANHO_LINHA }];
    }
    if (a === 0) {
        const y = c / b;
        return [{ x: 0, y: y }, { x: TAMANHO_LINHA, y: y }];
    }

    return [
        { x: 0, y: c / b },
        { x: c / a, y: 0 }
    ];
}

function encontrarVertices(restricoes) {
    const vertices = [];
    const numeroRestricoes = restricoes.length;


    vertices.push({ x: 0, y: 0 });

    for (let i = 0; i < numeroRestricoes; i++) {
        for (let j = i + 1; j < numeroRestricoes; j++) {
            const vertice = calcularInterseccao(restricoes[i], restricoes[j]);
            if (vertice && vertice.x >= 0 && vertice.y >= 0) {
                vertices.push(vertice);
            }
        }
    }

    return vertices.filter(vertice => {
        return restricoes.every(restricao => {
            const valor = restricao.a * vertice.x + restricao.b * vertice.y;
            switch (restricao.operador) {
                case '<=': return valor <= restricao.c;
                case '>=': return valor >= restricao.c;
                case '=': return Math.abs(valor - restricao.c) < 0.0001;
                default: return false;
            }
        });
    });
}

function calcularInterseccao(r1, r2) {
    const { a: a1, b: b1, c: c1 } = r1;
    const { a: a2, b: b2, c: c2 } = r2;

    const denominador = a1 * b2 - a2 * b1;
    if (Math.abs(denominador) < 0.0001) {
        return null;
    }

    const x = (b2 * c1 - b1 * c2) / denominador;
    const y = (a1 * c2 - a2 * c1) / denominador;

    return { x, y };
}

function encontrarSolucaoOtima(restricoes, coefObjetivo, objetivo) {
    const vertices = encontrarVertices(restricoes);
    if (vertices.length === 0) {
        return { erro: "Não tem solução" };
    }

    vertices.forEach(vertice => {
        vertice.valor = coefObjetivo.a * vertice.x + coefObjetivo.b * vertice.y;
    });

    let otimo;
    if (objetivo === 'maximizar') {
        otimo = vertices.reduce((max, vertice) => vertice.valor > max.valor ? vertice : max);
    } else {
        otimo = vertices.reduce((min, vertice) => vertice.valor < min.valor ? vertice : min);
    }

    return {
        x: otimo.x,
        y: otimo.y,
        valor: otimo.valor,
        vertices: vertices,
        objetivo: objetivo
    };


}

function ordenarVertices(vertices) {

    const centro = vertices.reduce((acc, v) => {
        acc.x += v.x;
        acc.y += v.y;
        return acc;
    }, { x: 0, y: 0 });
    centro.x /= vertices.length;
    centro.y /= vertices.length;

    return vertices.slice().sort((a, b) => {
        const angA = Math.atan2(a.y - centro.y, a.x - centro.x);
        const angB = Math.atan2(b.y - centro.y, b.x - centro.x);
        return angA - angB;
    });
}



function exibirResultado(solucao, fObjetivo) {
    const resultadoDiv = document.getElementById('resultado');

    if (solucao.erro) {
        resultadoDiv.innerHTML = `
             <div class="alert alert-danger">
                 <h4>Erro</h4>
                 <p>${solucao.erro}</p>
             </div>
         `;
        return;
    }

    resultadoDiv.innerHTML = `
         <h3>Solução Ótima</h3>
         <p>Função objetivo: ${fObjetivo}</p>
         <p>Valor ótimo: Z = ${solucao.valor.toFixed(2)}</p>
         <p>Ponto ótimo: (x = ${solucao.x.toFixed(2)}, y = ${solucao.y.toFixed(2)})</p>
         
         <h4 class="mt-4">Vértices</h4>
         <table class="table table-bordered">
             <thead>
                 <tr>
                     <th>Vértice</th>
                     <th>Coordenadas (x, y)</th>
                     <th>Valor de Z</th>
                 </tr>
             </thead>
             <tbody>
                 ${solucao.vertices.map((vertice, i) => `
                     <tr ${vertice.x === solucao.x && vertice.y === solucao.y ? 'class="table-success"' : ''}>
                         <td>${i + 1}</td>
                         <td>(${vertice.x.toFixed(2)}, ${vertice.y.toFixed(2)})</td>
                         <td>${vertice.valor.toFixed(2)}</td>
                     </tr>
                 `).join('')}
             </tbody>
         </table>
         
     `;
}