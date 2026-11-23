/**
 * Математическое ядро модели системной динамики:
 * Система связанных гармонических осцилляторов (28 переменных u_i + 28 скоростей v_i = du_i/dt),
 * интегрируемая методом Рунге-Кутта 4-го порядка на [0, 1].
 */

const DEFAULT_PERTURBATION_PARAMS = [
  {
    id: 1,
    name: "f1",
    symbol: "f₁",
    title: "Опыт разработчиков программного комплекса",
    type: "base",
    k: 0.40,
    m: 0.60,
    degree: 2,
    a: 0.0,
    b: 0.40,
    c: 0.0,
    d: 0.60
  },
  {
    id: 2,
    name: "f2",
    symbol: "f₂",
    title: "Опыт работы эксплуатационного персонала",
    type: "base",
    k: 0.25,
    m: 0.20,
    degree: 2,
    a: 0.0,
    b: 0.0,
    c: -0.15,
    d: 0.45
  },
  {
    id: 3,
    name: "f3",
    symbol: "f₃",
    title: "Трудоемкость разработки программного обеспечения",
    type: "base",
    k: 0.35,
    m: 0.35,
    degree: 2,
    a: 0.0,
    b: -0.80,
    c: 0.80,
    d: 0.30
  },
  {
    id: 4,
    name: "f4",
    symbol: "f₄",
    title: "Курс рубля по отношению к доллару (экономический фактор)",
    type: "base",
    k: 0.80,
    m: 0.20,
    degree: 1,
    a: 0.0,
    b: 0.0,
    c: 0.80,
    d: 0.20
  },
  {
    id: 5,
    name: "f5",
    symbol: "f₅",
    title: "Деловая репутация разработчиков программного комплекса",
    type: "base",
    k: 0.30,
    m: 0.20,
    degree: 2,
    a: 0.0,
    b: 0.0,
    c: 0.30,
    d: 0.20
  },
  {
    id: 6,
    name: "f6",
    symbol: "f₆",
    title: "Деловая репутация эксплуатирующей организации",
    type: "base",
    k: 0.25,
    m: 0.40,
    degree: 2,
    a: 0.0,
    b: 0.0,
    c: 0.25,
    d: 0.40
  }
];

class PolynomialFunction {
    constructor(id, arg_u, degree, a, b, c, d) {
        this.id = id;
        this.arg_u = arg_u;
        this.degree = degree;
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    evaluate(x) {
        const x_val = Math.max(0.02, Math.min(1.5, x));
        let val = 0.0;
        if (this.degree === 1) {
            val = this.c * x_val + this.d;
        } else if (this.degree === 2) {
            val = this.b * x_val * x_val + this.c * x_val + this.d;
        } else {
            val = this.a * x_val * x_val * x_val + this.b * x_val * x_val + this.c * x_val + this.d;
        }
        return Math.max(0.01, val);
    }
}

class SimulationModel {
    constructor() {
        this.functions = {};
        this.initDefaultFunctions();
        this.perturbationParams = [];
        this.initDefaultPerturbations();
    }

    initDefaultPerturbations() {
        this.perturbationParams = DEFAULT_PERTURBATION_PARAMS.map(p => ({ ...p }));
    }

    randomizePerturbations() {
        for (let i = 0; i < this.perturbationParams.length; i++) {
            const p = this.perturbationParams[i];
            if (p.type === "base") {
                let k = Math.round((0.15 + Math.random() * 0.35) * 100) / 100;
                let m = Math.round((0.15 + Math.random() * 0.35) * 100) / 100;
                if (k + m > 0.95) {
                    const scale = (0.75 + Math.random() * 0.18) / (k + m);
                    k = Math.round(k * scale * 100) / 100;
                    m = Math.round(m * scale * 100) / 100;
                }
                p.k = Math.max(0.05, k);
                p.m = Math.max(0.05, m);
            } else {
                let a = (p.degree === 3) ? Math.round((Math.random() * 0.20) * 100) / 100 : 0.0;
                let b = (p.degree >= 2) ? Math.round((0.10 + Math.random() * 0.30) * 100) / 100 : 0.0;
                let c = Math.round((0.10 + Math.random() * 0.35) * 100) / 100;
                let d = Math.round((0.15 + Math.random() * 0.35) * 100) / 100;

                const sum = a + b + c + d;
                if (sum > 0.95) {
                    const targetSum = 0.75 + Math.random() * 0.18;
                    const scale = targetSum / sum;
                    a = Math.round(a * scale * 100) / 100;
                    b = Math.round(b * scale * 100) / 100;
                    c = Math.round(c * scale * 100) / 100;
                    d = Math.round(d * scale * 100) / 100;
                }
                p.a = (p.degree === 3) ? Math.max(0.0, a) : 0.0;
                p.b = (p.degree >= 2) ? Math.max(0.0, b) : 0.0;
                p.c = Math.max(0.0, c);
                p.d = Math.max(0.05, d);
            }
        }
    }

    initDefaultFunctions(skipIdsSet = null) {
        for (const item of DEFAULT_FUNCTIONS) {
            if (skipIdsSet && skipIdsSet.has(item.id)) {
                continue;
            }
            this.functions[item.id] = new PolynomialFunction(
                item.id, item.arg_u, item.degree, item.a, item.b, item.c, item.d
            );
        }
    }

    randomizeFunctions(skipIdsSet = null) {
        for (let f_id = 1; f_id <= 187; f_id++) {
            if (skipIdsSet && skipIdsSet.has(f_id)) {
                continue;
            }
            const func = this.functions[f_id];
            const rand = Math.random();
            let deg = 1;
            if (rand < 0.50) deg = 1;
            else if (rand < 0.85) deg = 2;
            else deg = 3;

            func.degree = deg;
            if (deg === 1) {
                func.a = 0.0;
                func.b = 0.0;
                func.c = Math.round((0.30 + Math.random() * 0.70) * 1000) / 1000;
                func.d = Math.round((0.10 + Math.random() * 0.40) * 1000) / 1000;
            } else if (deg === 2) {
                func.a = 0.0;
                func.b = Math.round((0.15 + Math.random() * 0.45) * 1000) / 1000;
                func.c = Math.round((0.25 + Math.random() * 0.55) * 1000) / 1000;
                func.d = Math.round((0.05 + Math.random() * 0.35) * 1000) / 1000;
            } else {
                func.a = Math.round((0.10 + Math.random() * 0.30) * 1000) / 1000;
                func.b = Math.round((0.15 + Math.random() * 0.40) * 1000) / 1000;
                func.c = Math.round((0.20 + Math.random() * 0.50) * 1000) / 1000;
                func.d = Math.round((0.05 + Math.random() * 0.30) * 1000) / 1000;
            }
        }
    }

    evaluateSinglePerturbation(idx, t) {
        const p = (this.perturbationParams && this.perturbationParams[idx])
            ? this.perturbationParams[idx]
            : DEFAULT_PERTURBATION_PARAMS[idx];
        const pi = Math.PI;

        if (!p || p.type === "base") {
            const k = (p && typeof p.k === "number") ? p.k : DEFAULT_PERTURBATION_PARAMS[idx].k;
            const m = (p && typeof p.m === "number") ? p.m : DEFAULT_PERTURBATION_PARAMS[idx].m;
            let val = 0.0;
            switch (idx) {
                case 0: // f1: k * t^2 + m (Опыт разработчиков)
                    val = k * (t * t) + m;
                    break;
                case 1: { // f2: k * cos^2(1.5*pi*t - pi/6) + m (Опыт персонала)
                    const cos_l2 = Math.cos(1.5 * pi * t - pi / 6.0);
                    val = k * (cos_l2 * cos_l2) + m;
                    break;
                }
                case 2: // f3: k * sin(pi*t - pi/6) + m (Трудоемкость)
                    val = k * Math.sin(pi * t - pi / 6.0) + m;
                    break;
                case 3: // f4: k * t + m (Курс валют)
                    val = k * t + m;
                    break;
                case 4: { // f5: k * sin^2(pi*t - pi/6) + m (Репутация разработчиков)
                    const sin_l5 = Math.sin(pi * t - pi / 6.0);
                    val = k * (sin_l5 * sin_l5) + m;
                    break;
                }
                case 5: { // f6: k * cos^2(pi*t) + m (Репутация эксплуатирующей орг.)
                    const cos_l6 = Math.cos(pi * t);
                    val = k * (cos_l6 * cos_l6) + m;
                    break;
                }
                default:
                    val = 0.5;
            }
            return Math.max(0.01, val);
        } else {
            // Режим «Полином a*t^3 + b*t^2 + c*t + d»
            const deg = p.degree || 3;
            const a = p.a || 0.0;
            const b = p.b || 0.0;
            const c = p.c || 0.0;
            const d = p.d || 0.0;
            let val = 0.0;
            if (deg === 1) {
                val = c * t + d;
            } else if (deg === 2) {
                val = b * t * t + c * t + d;
            } else {
                val = a * t * t * t + b * t * t + c * t + d;
            }
            return Math.max(0.01, val);
        }
    }

    evaluatePerturbations(t) {
        return [
            this.evaluateSinglePerturbation(0, t),
            this.evaluateSinglePerturbation(1, t),
            this.evaluateSinglePerturbation(2, t),
            this.evaluateSinglePerturbation(3, t),
            this.evaluateSinglePerturbation(4, t),
            this.evaluateSinglePerturbation(5, t)
        ];
    }

    static evaluatePerturbations(t) {
        const pi = Math.PI;
        const l1 = 0.4 * (t * t) + 0.6;
        const cos_l2 = Math.cos(1.5 * pi * t - pi / 6.0);
        const l2 = 0.25 * (cos_l2 * cos_l2) + 0.20;
        const l3 = 0.35 * Math.sin(pi * t - pi / 6.0) + 0.35;
        const l4 = 0.80 * t + 0.20;
        const sin_l5 = Math.sin(pi * t - pi / 6.0);
        const l5 = 0.30 * (sin_l5 * sin_l5) + 0.20;
        const cos_l6 = Math.cos(pi * t);
        const l6 = 0.25 * (cos_l6 * cos_l6) + 0.40;
        return [l1, l2, l3, l4, l5, l6];
    }

    /**
     * Вычисляет правую часть расширенной системы 56 ОДУ:
     * state = [u_0..u_27, v_0..v_27], где du_i/dt = v_i
     */
    computeHarmonicRHS(t, state, u0) {
        const lambdas = this.evaluatePerturbations(t);
        const deriv = new Array(56).fill(0.0);

        for (let eq_idx = 0; eq_idx < EQUATIONS.length; eq_idx++) {
            const eq = EQUATIONS[eq_idx];
            const i = eq.target_u - 1;
            const u_i = state[i];
            const v_i = state[28 + i];

            // 1. Среднее значение положительных и отрицательных функций связи F_k(u_j)
            let posFuncsMean = 0.48;
            if (eq.pos.funcs.length > 0) {
                let sum = 0.0;
                for (let k = 0; k < eq.pos.funcs.length; k++) {
                    const [f_id, arg_u] = eq.pos.funcs[k];
                    sum += this.functions[f_id].evaluate(state[arg_u - 1]);
                }
                posFuncsMean = sum / eq.pos.funcs.length;
            }

            let negFuncsMean = 0.48;
            if (eq.neg.funcs.length > 0) {
                let sum = 0.0;
                for (let k = 0; k < eq.neg.funcs.length; k++) {
                    const [f_id, arg_u] = eq.neg.funcs[k];
                    sum += this.functions[f_id].evaluate(state[arg_u - 1]);
                }
                negFuncsMean = sum / eq.neg.funcs.length;
            }

            // 2. Вклад внешних возмущений lambda_1..lambda_6
            let posLambdaMean = 0.35 + 0.25 * lambdas[2];
            if (eq.pos.lambdas.length > 0) {
                let sum = 0.0;
                for (let k = 0; k < eq.pos.lambdas.length; k++) {
                    sum += lambdas[eq.pos.lambdas[k] - 1];
                }
                posLambdaMean = sum / eq.pos.lambdas.length;
            }

            let negLambdaMean = 0.35 + 0.25 * lambdas[0];
            if (eq.neg.lambdas.length > 0) {
                let sum = 0.0;
                for (let k = 0; k < eq.neg.lambdas.length; k++) {
                    sum += lambdas[eq.neg.lambdas[k] - 1];
                }
                negLambdaMean = sum / eq.neg.lambdas.length;
            }

            // Результирующая сила взаимодействия (без жестких констант 0.74 / 0.30)
            const phi_pos = posFuncsMean * posLambdaMean;
            const phi_neg = negFuncsMean * negLambdaMean;
            const netForce = phi_pos - phi_neg;

            // Усиленный отклик на связи F_k и возмущения lambda, но с математической гарантией не упасть в 0
            const rawEq = u0[i] + 0.34 * Math.tanh(2.2 * netForce);
            const safeMinEq = 0.5 * (u0[i] + 0.10); // минимум колебания не опустится ниже ~0.10
            const safeMaxEq = 0.5 * (u0[i] + 0.94); // максимум колебания не поднимется выше ~0.94
            const u_eq = Math.max(safeMinEq, Math.min(safeMaxEq, rawEq));

            // Широкий разброс частот по лучам, чтобы на каждой четверти форма многоугольника менялась
            const omega = 7.5 + ((i * 7) % 13) * 0.65; // 7.5 .. 15.3 рад/ед.вр.
            const zeta = 0.06 + (i % 3) * 0.02;        // 0.06 .. 0.10 (колебания не затухают к t=0.75 и t=1.00)

            // Гармоническое колебание: d²u/dt² + 2*zeta*omega*(du/dt) + omega²*(u - u_eq) = 0
            deriv[i] = v_i;
            deriv[28 + i] = -(omega * omega) * (u_i - u_eq) - 2.0 * zeta * omega * v_i;
        }

        return deriv;
    }

    solve(u0, numSteps = 100) {
        const dt = 1.0 / numSteps;
        const t = [];
        for (let s = 0; s <= numSteps; s++) {
            t.push(Math.round(s * dt * 1000) / 1000);
        }

        const u0Clamped = u0.map(val => Math.max(0.02, Math.min(0.98, val)));

        const uHistory = [];
        for (let i = 0; i < 28; i++) {
            uHistory.push(new Array(numSteps + 1).fill(0.0));
            uHistory[i][0] = u0Clamped[i];
        }

        const lambdasHistory = [];
        for (let k = 0; k < 6; k++) {
            lambdasHistory.push(new Array(numSteps + 1).fill(0.0));
        }

        // Начальный вектор состояния [u_0..u_27, v_0..v_27]
        let state = new Array(56).fill(0.0);
        for (let i = 0; i < 28; i++) {
            state[i] = u0Clamped[i];
        }
        // Начальный импульс пропорционален начальному дисбалансу сил, чтобы колебания шли сразу от t=0
        const initRHS = this.computeHarmonicRHS(0.0, state, u0Clamped);
        for (let i = 0; i < 28; i++) {
            state[28 + i] = 0.03 * initRHS[28 + i];
        }

        for (let step = 0; step < numSteps; step++) {
            const t_curr = t[step];

            const l_curr = this.evaluatePerturbations(t_curr);
            for (let k = 0; k < 6; k++) {
                lambdasHistory[k][step] = l_curr[k];
            }

            // Метод Рунге-Кутта 4-го порядка для системы 56 ОДУ
            const k1 = this.computeHarmonicRHS(t_curr, state, u0Clamped);

            const s2 = new Array(56);
            for (let m = 0; m < 56; m++) s2[m] = state[m] + 0.5 * dt * k1[m];
            const k2 = this.computeHarmonicRHS(t_curr + 0.5 * dt, s2, u0Clamped);

            const s3 = new Array(56);
            for (let m = 0; m < 56; m++) s3[m] = state[m] + 0.5 * dt * k2[m];
            const k3 = this.computeHarmonicRHS(t_curr + 0.5 * dt, s3, u0Clamped);

            const s4 = new Array(56);
            for (let m = 0; m < 56; m++) s4[m] = state[m] + dt * k3[m];
            const k4 = this.computeHarmonicRHS(t_curr + dt, s4, u0Clamped);

            const nextState = new Array(56);
            for (let m = 0; m < 56; m++) {
                nextState[m] = state[m] + (dt / 6.0) * (k1[m] + 2.0 * k2[m] + 2.0 * k3[m] + k4[m]);
            }

            // Мягкое отражение только на физических границах области определения [0.02, 0.98]
            for (let i = 0; i < 28; i++) {
                if (nextState[i] < 0.02) {
                    nextState[i] = 0.02;
                    if (nextState[28 + i] < 0) nextState[28 + i] *= -0.35;
                } else if (nextState[i] > 0.98) {
                    nextState[i] = 0.98;
                    if (nextState[28 + i] > 0) nextState[28 + i] *= -0.35;
                }
                uHistory[i][step + 1] = nextState[i];
            }
            state = nextState;
        }

        const l_final = this.evaluatePerturbations(1.0);
        for (let k = 0; k < 6; k++) {
            lambdasHistory[k][numSteps] = l_final[k];
        }

        const quarters = {
            t0: { t: 0.00, label: "t = 0.00 (Начало)", values: uHistory.map(row => row[0]) },
            t1: { t: 0.25, label: "t = 0.25 (1-я четв.)", values: uHistory.map(row => row[Math.round(numSteps * 0.25)]) },
            t2: { t: 0.50, label: "t = 0.50 (2-я четв.)", values: uHistory.map(row => row[Math.round(numSteps * 0.50)]) },
            t3: { t: 0.75, label: "t = 0.75 (3-я четв.)", values: uHistory.map(row => row[Math.round(numSteps * 0.75)]) },
            t4: { t: 1.00, label: "t = 1.00 (Финал)", values: uHistory.map(row => row[numSteps]) },
        };

        return {
            t: t,
            u: uHistory,
            lambdas: lambdasHistory,
            quarters: quarters
        };
    }
}
