import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// 크래프트 모드별 레시피
const RECIPES = {
    basic: {
        id: 'basic',
        label: '아비도스',
        shortLabel: '기본',
        emoji: '🪓',
        accent: 'amber',
        outputName: '아비도스 목재',
        abidosWood: 33,
        softWood: 45,
        wood: 86,
        gold: 0,
        output: 15,
        maxCraft: 40,
        defaultCraft: 30
    },
    advanced: {
        id: 'advanced',
        label: '상급 아비도스',
        shortLabel: '상급',
        emoji: '🌟',
        accent: 'violet',
        outputName: '상급 아비도스 목재',
        abidosWood: 43,
        softWood: 59,
        wood: 112,
        gold: 0,
        output: 1,
        maxCraft: 40,
        defaultCraft: 10
    }
};

// 정확한 교환 비율
const EXCHANGE = {
    softToWood: { from: 25, to: 50 },
    sturdyToWood: { from: 5, to: 50 },
    woodToDust: { from: 100, to: 80 },
    softToDust: { from: 50, to: 80 },
    dustToSoft: { from: 100, to: 50 },
    dustToSturdy: { from: 100, to: 10 },
    dustToAbidos: { from: 100, to: 10 },
};

const MIN_UNIT = 100;

// 재료 정보
const MATERIALS = {
    wood: { name: '목재', emoji: '🪵', color: 'orange' },
    softWood: { name: '부드러운 목재', emoji: '🌿', color: 'emerald' },
    sturdyWood: { name: '튼튼한 목재', emoji: '🔴', color: 'red' },
    abidosWood: { name: '아비도스 목재', emoji: '✨', color: 'amber' },
    dust: { name: '벌목의 가루', emoji: '💨', color: 'purple' },
};

// 모드별 테마 클래스 매핑 (Tailwind JIT가 클래스를 안전히 인식하도록 명시)
const THEME = {
    amber: {
        text: 'text-amber-400',
        textSoft: 'text-amber-300',
        bg: 'bg-amber-500',
        bgSoft: 'bg-amber-500/20',
        bgGradFrom: 'from-amber-500',
        bgGradTo: 'to-yellow-600',
        border: 'border-amber-500',
        borderSoft: 'border-amber-500/30',
        ring: 'focus:ring-amber-500/20',
        focusBorder: 'focus:border-amber-500',
        shadow: 'shadow-amber-500/20',
        rankBg: 'from-amber-400 to-yellow-500',
        cardBg: 'from-amber-500/5 via-yellow-500/5 to-amber-500/5',
        chipBg: 'bg-amber-500/10',
        chipText: 'text-amber-400',
        chipBorder: 'border-amber-500/20'
    },
    violet: {
        text: 'text-violet-400',
        textSoft: 'text-violet-300',
        bg: 'bg-violet-500',
        bgSoft: 'bg-violet-500/20',
        bgGradFrom: 'from-violet-500',
        bgGradTo: 'to-fuchsia-600',
        border: 'border-violet-500',
        borderSoft: 'border-violet-500/30',
        ring: 'focus:ring-violet-500/20',
        focusBorder: 'focus:border-violet-500',
        shadow: 'shadow-violet-500/20',
        rankBg: 'from-violet-400 to-fuchsia-500',
        cardBg: 'from-violet-500/5 via-fuchsia-500/5 to-violet-500/5',
        chipBg: 'bg-violet-500/10',
        chipText: 'text-violet-400',
        chipBorder: 'border-violet-500/20'
    }
};

// 구매량 올림 계산
const ceilTo100 = (n) => Math.ceil(n / MIN_UNIT) * MIN_UNIT;

// 세트 표시
const formatSets = (sets) => {
    if (sets === 0) return null;
    return `${sets}세트`;
};

// 1. 각 재료별 수급 전략 정의 (전역)
const SOURCING_STRATEGIES = {
    wood: [
        { id: 'direct', name: '직접 구매', buyItem: 'wood' },
        { id: 'from_soft', name: '부드러운 교환', buyItem: 'softWood' },
        { id: 'from_sturdy', name: '튼튼한 교환', buyItem: 'sturdyWood' },
        { id: 'from_dust_wood', name: '가루(목재) 교환', buyItem: 'dust', dustSrc: 'wood' },
        { id: 'from_dust_soft', name: '가루(부드) 교환', buyItem: 'dust', dustSrc: 'softWood' }
    ],
    softWood: [
        { id: 'direct', name: '직접 구매', buyItem: 'softWood' },
        { id: 'from_dust_wood', name: '가루(목재) 교환', buyItem: 'dust', dustSrc: 'wood' },
        { id: 'from_dust_soft', name: '가루(부드) 교환', buyItem: 'dust', dustSrc: 'softWood' }
    ],
    abidosWood: [
        { id: 'direct', name: '직접 구매', buyItem: 'abidosWood' },
        { id: 'from_dust_wood', name: '가루(목재) 교환', buyItem: 'dust', dustSrc: 'wood' },
        { id: 'from_dust_soft', name: '가루(부드) 교환', buyItem: 'dust', dustSrc: 'softWood' }
    ]
};

// 3. 통합 계산기 (모든 조합 생성)
function generateAllCombinations(needed, inv, prices, recipe, bonusRate = 0) {
    const methods = [];

    for (const wStrat of SOURCING_STRATEGIES.wood) {
        for (const sStrat of SOURCING_STRATEGIES.softWood) {
            for (const aStrat of SOURCING_STRATEGIES.abidosWood) {
                const method = calculateCombination(
                    needed,
                    inv,
                    prices,
                    { wood: wStrat, soft: sStrat, abidos: aStrat },
                    recipe,
                    bonusRate
                );
                methods.push(method);
            }
        }
    }

    return methods;
}

// 4. 개별 조합 계산 로직 (핵심)
function calculateCombination(totalNeeded, originalInv, prices, strategies, recipe, bonusRate = 0) {
    let inv = { ...originalInv };
    const purchases = { wood: 0, softWood: 0, sturdyWood: 0, abidosWood: 0 };
    const steps = [];
    const warnings = [];
    let materialCost = 0;

    let titleParts = [];
    if (strategies.wood.id !== 'direct') titleParts.push(`🪵${strategies.wood.name.split(' ')[0]}`);
    if (strategies.soft.id !== 'direct') titleParts.push(`🌿${strategies.soft.name.split(' ')[0]}`);
    if (strategies.abidos.id !== 'direct') titleParts.push(`✨${strategies.abidos.name.split(' ')[0]}`);

    let title = titleParts.length === 0 ? "💰 모두 직접 구매" : `🔧 ${titleParts.join(' + ')}`;
    let description = "선택된 재료별 수급 전략 적용";

    const netNeeded = {
        wood: Math.max(0, totalNeeded.wood - inv.wood),
        softWood: Math.max(0, totalNeeded.softWood - inv.softWood),
        abidosWood: Math.max(0, totalNeeded.abidosWood - inv.abidosWood)
    };

    inv.wood = Math.max(0, inv.wood - totalNeeded.wood);
    inv.softWood = Math.max(0, inv.softWood - totalNeeded.softWood);
    inv.abidosWood = Math.max(0, inv.abidosWood - totalNeeded.abidosWood);

    if (netNeeded.abidosWood > 0) processStrategy('abidosWood', netNeeded.abidosWood, strategies.abidos, inv, purchases, steps, prices);
    if (netNeeded.softWood > 0) processStrategy('softWood', netNeeded.softWood, strategies.soft, inv, purchases, steps, prices);
    if (netNeeded.wood > 0) processStrategy('wood', netNeeded.wood, strategies.wood, inv, purchases, steps, prices);

    materialCost =
        (purchases.wood / 100) * prices.wood +
        (purchases.softWood / 100) * prices.softWood +
        (purchases.sturdyWood / 100) * prices.sturdyWood +
        (purchases.abidosWood / 100) * prices.abidosWood;

    const totalCost = materialCost + totalNeeded.gold;
    const totalOutput = totalNeeded.count * recipe.output * (1 + bonusRate / 100);
    const costPerItem = totalOutput > 0 ? totalCost / totalOutput : 0;

    return {
        title,
        description,
        materialCost,
        craftFee: totalNeeded.gold,
        cost: totalCost,
        costPerItem,
        purchases,
        steps,
        isValid: true,
        warnings,
        strategyIds: strategies
    };
}

// 전략 실행기
function processStrategy(targetType, amount, strategy, inv, purchases, steps, prices) {
    if (amount <= 0) return;

    if (strategy.id === 'direct') {
        const buyAmount = ceilTo100(amount);
        purchases[targetType] += buyAmount;
        steps.push(`${MATERIALS[targetType].emoji} ${MATERIALS[targetType].name} 부족분 ${amount}개 → ${buyAmount}개 구매`);
        return;
    }

    if (targetType === 'wood') {
        if (strategy.id === 'from_soft') {
            const softNeededReal = Math.ceil(amount / 50) * 25;
            let softToUse = Math.min(inv.softWood, softNeededReal);
            softToUse = Math.floor(softToUse / 25) * 25;
            const softToBuy = Math.max(0, softNeededReal - softToUse);

            if (softToUse > 0) {
                inv.softWood -= softToUse;
                steps.push(`🌿 부드러운 ${softToUse}개(보유) → 🪵 목재 ${softToUse * 2}개`);
            }
            if (softToBuy > 0) {
                const buySet = ceilTo100(softToBuy);
                purchases.softWood += buySet;
                steps.push(`🌿 부드러운 ${buySet}개 구매 → 🪵 목재 변환`);
            }
            return;
        } else if (strategy.id === 'from_sturdy') {
            const sturdyNeededReal = Math.ceil(amount / 50) * 5;
            let sturdyToUse = Math.min(inv.sturdyWood, sturdyNeededReal);
            sturdyToUse = Math.floor(sturdyToUse / 5) * 5;
            const sturdyToBuy = Math.max(0, sturdyNeededReal - sturdyToUse);

            if (sturdyToUse > 0) {
                inv.sturdyWood -= sturdyToUse;
                steps.push(`🔴 튼튼한 ${sturdyToUse}개(보유) → 🪵 목재 ${sturdyToUse * 10}개`);
            }
            if (sturdyToBuy > 0) {
                const buySet = ceilTo100(sturdyToBuy);
                purchases.sturdyWood += buySet;
                steps.push(`🔴 튼튼한 ${buySet}개 구매 → 🪵 목재 변환`);
            }
            return;
        }
    }

    if (strategy.id.startsWith('from_dust')) {
        let dustNeeded = 0;
        let intermediateStep = null;

        if (targetType === 'wood') {
            dustNeeded = Math.ceil(amount / 100) * 100;
            intermediateStep = 'sturdy';
        } else if (targetType === 'softWood') {
            dustNeeded = Math.ceil(amount / 50) * 100;
        } else if (targetType === 'abidosWood') {
            dustNeeded = Math.ceil(amount / 10) * 100;
        }

        const dustFromInv = Math.min(inv.dust, dustNeeded);
        inv.dust -= dustFromInv;
        const remainingDustNeeded = dustNeeded - dustFromInv;

        if (dustFromInv > 0) {
            steps.push(`💨 가루 ${dustFromInv}개(보유) 사용`);
        }

        if (remainingDustNeeded > 0) {
            const src = strategy.dustSrc;
            const exchangePaths = {
                wood: { consume: 100, produce: 80 },
                softWood: { consume: 50, produce: 80 }
            };

            const path = exchangePaths[src];
            const consumeAmt = path.consume;
            const produceAmt = path.produce;

            const setsNeeded = Math.ceil(remainingDustNeeded / produceAmt);
            const itemsNeeded = setsNeeded * consumeAmt;

            let invUsed = Math.min(inv[src] || 0, itemsNeeded);
            invUsed = Math.floor(invUsed / consumeAmt) * consumeAmt;
            if (inv[src] !== undefined) inv[src] -= invUsed;

            const buyAmt = Math.max(0, itemsNeeded - invUsed);

            if (invUsed > 0) steps.push(`${MATERIALS[src].emoji} ${MATERIALS[src].name} ${invUsed}개(보유) → 💨 가루`);
            if (buyAmt > 0) {
                const buyRounded = ceilTo100(buyAmt);
                purchases[src] += buyRounded;
                steps.push(`${MATERIALS[src].emoji} ${MATERIALS[src].name} ${buyRounded}개 구매 → 💨 가루`);
            }
        }

        if (intermediateStep === 'sturdy') {
            steps.push(`💨 가루 ${dustNeeded}개 → 🔴 튼튼한 → 🪵 목재 ${amount}개`);
        } else {
            steps.push(`💨 가루 ${dustNeeded}개 → ${MATERIALS[targetType].emoji} ${MATERIALS[targetType].name}`);
        }
    }
}

const MODE_STORAGE_KEY = 'abidosCalc.mode';

function loadInitialMode() {
    try {
        const v = localStorage.getItem(MODE_STORAGE_KEY);
        if (v === 'advanced' || v === 'basic') return v;
    } catch (_) {}
    return 'basic';
}

function AbidosCalculator() {
    const [craftMode, setCraftMode] = useState(loadInitialMode);
    const recipe = RECIPES[craftMode];
    const theme = THEME[recipe.accent];

    useEffect(() => {
        try { localStorage.setItem(MODE_STORAGE_KEY, craftMode); } catch (_) {}
    }, [craftMode]);

    // 입력 상태
    const [targetCount, setTargetCount] = useState(String(recipe.defaultCraft));
    const [priceWood, setPriceWood] = useState('');
    const [priceSoft, setPriceSoft] = useState('');
    const [priceSturdy, setPriceSturdy] = useState('');
    const [priceAbidos, setPriceAbidos] = useState('');
    const [invWood, setInvWood] = useState('');
    const [invSoft, setInvSoft] = useState('');
    const [invSturdy, setInvSturdy] = useState('');
    const [invAbidos, setInvAbidos] = useState('');
    const [invDust, setInvDust] = useState('');
    const [bonusRate, setBonusRate] = useState('0');

    // 모드 변경 시 목표 개수를 해당 모드 기본값으로 재설정
    useEffect(() => {
        setTargetCount(String(recipe.defaultCraft));
    }, [craftMode]);

    // UI 상태
    const [sortByPrice, setSortByPrice] = useState(true);
    const [displayLimit, setDisplayLimit] = useState(5);
    const [showAllMethods, setShowAllMethods] = useState(false);

    // 숫자 입력 핸들러
    const handleNumericInput = useCallback((setter, maxValue = null) => (e) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        if (maxValue !== null && Number(value) > maxValue) {
            setter(String(maxValue));
        } else {
            setter(value);
        }
    }, []);

    // 계산 결과
    const result = useMemo(() => {
        const count = Math.max(1, Math.min(recipe.maxCraft, Number(targetCount) || recipe.defaultCraft));

        const totalNeeded = {
            abidosWood: count * recipe.abidosWood,
            softWood: count * recipe.softWood,
            wood: count * recipe.wood,
            gold: count * recipe.gold,
            count: count
        };

        const inventory = {
            wood: Number(invWood) || 0,
            softWood: Number(invSoft) || 0,
            sturdyWood: Number(invSturdy) || 0,
            abidosWood: Number(invAbidos) || 0,
            dust: Number(invDust) || 0,
        };

        const prices = {
            wood: Number(priceWood) || 0,
            softWood: Number(priceSoft) || 0,
            sturdyWood: Number(priceSturdy) || 0,
            abidosWood: Number(priceAbidos) || 0,
        };

        let methods = generateAllCombinations(totalNeeded, inventory, prices, recipe, Number(bonusRate) || 0);

        const validMethods = methods.filter(m => m.isValid);

        if (validMethods.length > 0) {
            const minCost = Math.min(...validMethods.map(m => m.cost));
            validMethods.forEach(m => {
                m.isCheapest = Math.abs(m.cost - minCost) < 0.1;
            });
        }

        return {
            totalNeeded,
            inventory,
            methods: validMethods,
            hasValidMethod: validMethods.length > 0,
            bonusRate: Number(bonusRate) || 0
        };
    }, [targetCount, priceWood, priceSoft, priceSturdy, priceAbidos, invWood, invSoft, invSturdy, invAbidos, invDust, bonusRate, recipe]);

    const sortedMethods = useMemo(() => {
        const methods = [...result.methods];
        if (sortByPrice) {
            methods.sort((a, b) => {
                if (Math.abs(a.cost - b.cost) < 0.1) {
                    const totalPurchasesA = Object.values(a.purchases).reduce((sum, v) => sum + v, 0);
                    const totalPurchasesB = Object.values(b.purchases).reduce((sum, v) => sum + v, 0);
                    return totalPurchasesA - totalPurchasesB;
                }
                return a.cost - b.cost;
            });
        }
        return methods;
    }, [result.methods, sortByPrice]);

    const displayedMethods = showAllMethods ? sortedMethods : sortedMethods.slice(0, displayLimit);

    const quickCounts = [10, 20, 30, 40];

    const resetAll = () => {
        setTargetCount(String(recipe.defaultCraft));
        setPriceWood(''); setPriceSoft(''); setPriceSturdy(''); setPriceAbidos('');
        setInvWood(''); setInvSoft(''); setInvSturdy(''); setInvAbidos(''); setInvDust('');
        setBonusRate('0');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
                @keyframes fadeSlide {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .mode-anim { animation: fadeSlide 0.25s ease-out; }
            `}</style>

            {/* 사이드바 */}
            <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-screen">
                {/* 로고 + 모드 탭 */}
                <div className="p-5 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${theme.bgGradFrom} ${theme.bgGradTo} flex items-center justify-center text-xl shadow-lg ${theme.shadow} transition-all`}>
                            {recipe.emoji}
                        </div>
                        <div>
                            <h1 className={`font-bold ${theme.text} transition-colors`}>{recipe.label}</h1>
                            <p className="text-xs text-slate-500">제작 계산기 v3.0</p>
                        </div>
                    </div>

                    {/* 모드 토글 (세그먼티드 컨트롤) */}
                    <div className="bg-slate-800/70 rounded-lg p-1 flex gap-1">
                        {Object.values(RECIPES).map((r) => {
                            const active = craftMode === r.id;
                            const rTheme = THEME[r.accent];
                            return (
                                <button
                                    key={r.id}
                                    onClick={() => setCraftMode(r.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all ${
                                        active
                                            ? `bg-gradient-to-br ${rTheme.bgGradFrom} ${rTheme.bgGradTo} text-slate-900 shadow-md ${rTheme.shadow}`
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <span>{r.emoji}</span>
                                    <span>{r.shortLabel}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 제작 개수 */}
                <div className="px-5 py-3 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-400">제작 개수</label>
                        <button
                            onClick={resetAll}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-all"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            초기화
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={targetCount}
                            onChange={handleNumericInput(setTargetCount, recipe.maxCraft)}
                            placeholder={String(recipe.defaultCraft)}
                            className={`w-16 text-center text-xl font-black bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 ${theme.text} focus:outline-none ${theme.focusBorder} focus:ring-2 ${theme.ring} transition-all`}
                        />
                        <span className="text-slate-500 text-sm">/ {recipe.maxCraft}회</span>
                    </div>
                    <div className="flex gap-1.5">
                        {quickCounts.map((num) => (
                            <button
                                key={num}
                                onClick={() => setTargetCount(String(num))}
                                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${Number(targetCount) === num
                                    ? `${theme.bg} text-slate-900`
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                        제작 1회당 <span className={theme.text}>{recipe.outputName} {recipe.output}개</span>
                    </p>
                </div>

                {/* 대성공 확률 */}
                <div className="px-5 py-3 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-400">대성공 확률</label>
                        <span className={`text-xs ${theme.text} font-bold`}>{bonusRate}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0"
                            max="20"
                            step="0.5"
                            value={bonusRate}
                            onChange={(e) => setBonusRate(e.target.value)}
                            className={`flex-1 ${recipe.accent === 'amber' ? 'accent-amber-500' : 'accent-violet-500'} h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer`}
                        />
                        <div className="relative w-14">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={bonusRate}
                                onChange={handleNumericInput(setBonusRate, 100)}
                                className={`w-full text-center text-xs bg-slate-800 border border-slate-700 rounded px-1 py-1 text-slate-300 focus:outline-none ${theme.focusBorder}`}
                            />
                        </div>
                    </div>
                </div>

                {/* 입력 필드 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {/* 시장 가격 */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm">💰</span>
                            <h3 className="text-xs font-bold text-slate-300">시장 가격</h3>
                            <span className="text-xs text-slate-500">(1세트 = 100개)</span>
                        </div>
                        <div className="space-y-2">
                            {[
                                { key: 'wood', value: priceWood, setter: setPriceWood },
                                { key: 'softWood', value: priceSoft, setter: setPriceSoft },
                                { key: 'sturdyWood', value: priceSturdy, setter: setPriceSturdy },
                                { key: 'abidosWood', value: priceAbidos, setter: setPriceAbidos },
                            ].map(({ key, value, setter }) => (
                                <div key={key} className="bg-slate-800/50 rounded-lg p-2.5">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        {MATERIALS[key].emoji} {MATERIALS[key].name}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={value}
                                            onChange={handleNumericInput(setter)}
                                            placeholder="0"
                                            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-right pr-12 text-sm focus:outline-none ${theme.focusBorder} focus:ring-1 ${theme.ring} transition-all`}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">골드</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-slate-700"></div>

                    {/* 보유량 */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm">🎒</span>
                            <h3 className="text-xs font-bold text-slate-300">보유량</h3>
                        </div>
                        <div className="space-y-2">
                            {[
                                { key: 'wood', value: invWood, setter: setInvWood },
                                { key: 'softWood', value: invSoft, setter: setInvSoft },
                                { key: 'sturdyWood', value: invSturdy, setter: setInvSturdy },
                                { key: 'abidosWood', value: invAbidos, setter: setInvAbidos },
                                { key: 'dust', value: invDust, setter: setInvDust },
                            ].map(({ key, value, setter }) => (
                                <div key={key} className="bg-slate-800/50 rounded-lg p-2.5">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        {MATERIALS[key].emoji} {MATERIALS[key].name}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={value}
                                            onChange={handleNumericInput(setter)}
                                            placeholder="0"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-right pr-8 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">개</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 교환 비율 안내 */}
                    <div className="border-t border-slate-700 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm">📋</span>
                            <h3 className="text-xs font-bold text-slate-300">교환 비율</h3>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1 bg-slate-800/30 rounded-lg p-3">
                            <p>🌿25 → 🪵50</p>
                            <p>🔴5 → 🪵50</p>
                            <p>🪵100 → 💨80</p>
                            <p>🌿50 → 💨80</p>
                            <p>💨100 → 🌿50</p>
                            <p>💨100 → 🔴10</p>
                            <p>💨100 → ✨10</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-600">v3.0 • 기본 / 상급 모드 지원</p>
                </div>
            </aside>

            {/* 메인 */}
            <main className="flex-1 ml-80 min-h-screen">
                <header className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 z-10">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="mode-anim" key={craftMode}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${theme.chipBg} ${theme.chipText} border ${theme.chipBorder}`}>
                                        {recipe.shortLabel} MODE
                                    </span>
                                    <h2 className="text-lg font-bold text-slate-200">{recipe.label} 제작 시뮬레이션</h2>
                                </div>
                                <p className="text-sm text-slate-500">
                                    {Number(targetCount) || recipe.defaultCraft}회 제작 기준 • 총 <span className="text-slate-300">{sortedMethods.length}</span>가지 전략 분석 완료
                                </p>
                            </div>
                            <button
                                onClick={() => setSortByPrice(!sortByPrice)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm"
                            >
                                {sortByPrice ? '📊 최저가순' : '📋 기본순'}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-6 mode-anim" key={`${craftMode}-body`}>
                    {/* 결과 요약 배너 */}
                    <div className={`mb-6 rounded-2xl border ${theme.borderSoft} bg-gradient-to-r ${theme.cardBg} p-5 flex items-center justify-between flex-wrap gap-4`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.bgGradFrom} ${theme.bgGradTo} flex items-center justify-center text-2xl shadow-lg ${theme.shadow}`}>
                                {recipe.emoji}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">목표 산출량</p>
                                <p className="text-2xl font-black text-slate-100">
                                    {(result.totalNeeded.count * recipe.output).toLocaleString()}
                                    <span className="text-sm font-normal text-slate-500 ml-1">{recipe.outputName}</span>
                                    {result.bonusRate > 0 && (
                                        <span className={`text-xs font-medium ${theme.text} ml-2`}>
                                            +{((result.totalNeeded.count * recipe.output) * result.bonusRate / 100).toFixed(1)} 대성공 보너스
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        {sortedMethods.length > 0 && sortByPrice && (
                            <div className="text-right">
                                <p className="text-xs text-slate-500">최저 예상 비용</p>
                                <p className={`text-2xl font-black ${theme.text}`}>
                                    {Math.round(sortedMethods[0].cost).toLocaleString()}
                                    <span className="text-sm font-normal text-slate-500 ml-1">골드</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 필요 재료 카드 */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { key: 'abidosWood', total: result.totalNeeded.abidosWood, inv: result.inventory.abidosWood, bg: 'from-amber-500/10 to-yellow-500/10', border: 'border-amber-500/20' },
                            { key: 'softWood', total: result.totalNeeded.softWood, inv: result.inventory.softWood, bg: 'from-emerald-500/10 to-green-500/10', border: 'border-emerald-500/20' },
                            { key: 'wood', total: result.totalNeeded.wood, inv: result.inventory.wood, bg: 'from-orange-500/10 to-amber-500/10', border: 'border-orange-500/20' },
                        ].map(({ key, total, inv, bg, border }) => {
                            const shortage = Math.max(0, total - inv);
                            const perCraft = recipe[key];
                            return (
                                <div key={key} className={`bg-gradient-to-br ${bg} rounded-2xl p-5 border ${border}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{MATERIALS[key].emoji}</span>
                                            <span className="text-sm font-medium text-slate-300">{MATERIALS[key].name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 bg-slate-900/40 px-2 py-0.5 rounded">×{perCraft}/회</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-slate-100">
                                            {total.toLocaleString()}
                                            <span className="text-sm font-normal text-slate-500 ml-1">필요</span>
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            보유: {inv.toLocaleString()}개
                                        </p>
                                        <p className={`text-sm font-medium ${shortage === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {shortage === 0 ? '✓ 충분' : `부족: ${shortage.toLocaleString()}개`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 보유 재료 알림 */}
                    {(result.inventory.sturdyWood > 0 || result.inventory.dust > 0) && (
                        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <p className="text-sm text-purple-300 font-medium mb-2">🔄 교환 가능 재료</p>
                            <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                                {result.inventory.sturdyWood > 0 && (
                                    <span>🔴 튼튼한 {result.inventory.sturdyWood.toLocaleString()}개</span>
                                )}
                                {result.inventory.dust > 0 && (
                                    <span>💨 벌목의 가루 {result.inventory.dust.toLocaleString()}개</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 방법 리스트 */}
                    <div className="space-y-3">
                        {displayedMethods.map((method, idx) => {
                            const rank = sortByPrice ? idx + 1 : null;
                            const hasPurchases = Object.values(method.purchases).some(v => v > 0);

                            return (
                                <div
                                    key={idx}
                                    className={`rounded-2xl border transition-all ${method.isCheapest
                                        ? `bg-gradient-to-r ${theme.cardBg} ${theme.borderSoft} shadow-xl ${theme.shadow}`
                                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-4">
                                                {rank && (
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${rank === 1 ? `bg-gradient-to-br ${theme.rankBg} text-slate-900 shadow-lg ${theme.shadow}`
                                                        : rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900'
                                                            : rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-slate-100'
                                                                : 'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {rank}
                                                    </div>
                                                )}
                                                <div>
                                                    {method.isCheapest && (
                                                        <span className={`inline-block text-xs px-2.5 py-1 ${theme.chipBg} ${theme.chipText} rounded-full font-medium mb-1`}>
                                                            ✅ 최저가
                                                        </span>
                                                    )}
                                                    <p className="font-medium text-slate-200">{method.title}</p>
                                                    <p className="text-xs text-slate-500">{method.description}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="mb-1">
                                                    <span className="text-xs text-slate-500 mr-2">총 비용:</span>
                                                    <span className={`text-xl font-black ${method.isCheapest ? theme.text : 'text-slate-200'}`}>
                                                        {Math.round(method.cost).toLocaleString()}
                                                        <span className="text-xs font-normal text-slate-500 ml-1">골드</span>
                                                    </span>
                                                </div>
                                                {method.costPerItem > 0 && (
                                                    <p className="text-xs text-slate-500">
                                                        개당 <span className="text-slate-300 font-medium">{Math.round(method.costPerItem).toLocaleString()}</span>골드
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 경고 */}
                                        {method.warnings.length > 0 && (
                                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                {method.warnings.map((w, i) => (
                                                    <p key={i} className="text-sm text-red-400">{w}</p>
                                                ))}
                                            </div>
                                        )}

                                        {/* 구매 목록 */}
                                        {hasPurchases && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {method.purchases.abidosWood > 0 && (
                                                    <span className="text-xs px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                                                        ✨ 아비도스 {formatSets(method.purchases.abidosWood / 100)}
                                                    </span>
                                                )}
                                                {method.purchases.sturdyWood > 0 && (
                                                    <span className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
                                                        🔴 튼튼한 {formatSets(method.purchases.sturdyWood / 100)}
                                                    </span>
                                                )}
                                                {method.purchases.softWood > 0 && (
                                                    <span className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                                                        🌿 부드러운 {formatSets(method.purchases.softWood / 100)}
                                                    </span>
                                                )}
                                                {method.purchases.wood > 0 && (
                                                    <span className="text-xs px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20">
                                                        🪵 목재 {formatSets(method.purchases.wood / 100)}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {!hasPurchases && (
                                            <div className="mb-4">
                                                <span className="text-sm text-emerald-400 font-medium">🎉 추가 구매 필요 없음!</span>
                                            </div>
                                        )}

                                        {/* 상세 과정 */}
                                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                                            <p className="text-xs font-medium text-slate-400 mb-2">📝 진행 순서</p>
                                            <div className="space-y-1">
                                                {method.steps.length > 0 ? (
                                                    method.steps.map((step, i) => {
                                                        const isDustConversion = step.includes('→ 💨') || step.includes('→ 🪵→💨');
                                                        return (
                                                            <p key={i} className={`text-xs ${isDustConversion ? 'text-orange-400 font-medium' : 'text-slate-300'}`}>
                                                                {i + 1}. {step}
                                                            </p>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-xs text-slate-500">추가 작업 없음</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {sortedMethods.length > displayLimit && (
                        <button
                            onClick={() => setDisplayLimit(prev => prev + 5)}
                            className="w-full mt-4 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-sm font-medium transition-colors"
                        >
                            더 보기 ({sortedMethods.length - displayLimit}개 남음) ▼
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<AbidosCalculator />);
}
