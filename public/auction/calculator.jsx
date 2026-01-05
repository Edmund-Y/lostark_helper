import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function AuctionCalculator() {
    // 페이지 방문 기록 (LocalStorage)
    useEffect(() => {
        try {
            const toolInfo = {
                id: 'auction',
                name: '경매 입찰 계산기',
                icon: '💰',
                url: '/auction',
                lastVisited: Date.now()
            };

            const recent = JSON.parse(localStorage.getItem('recentTools') || '[]');
            const filtered = recent.filter(t => t.id !== toolInfo.id);
            const updated = [toolInfo, ...filtered].slice(0, 3);
            localStorage.setItem('recentTools', JSON.stringify(updated));
        } catch (error) {
            console.error('LocalStorage error:', error);
        }
    }, []);

    const [marketPrice, setMarketPrice] = useState('');
    const [partySize, setPartySize] = useState(4);
    const [myBid, setMyBid] = useState('');

    // 손익분기점 및 추천가 계산
    const calculations = useMemo(() => {
        const price = parseFloat(marketPrice);
        if (!price || price <= 0) {
            return null;
        }

        // 거래소 수수료 계산 (5%, 최소 1골드, 1골드 이하 아이템은 수수료 없음)
        let fee = 0;
        if (price > 1) {
            fee = Math.max(1, Math.floor(price * 0.05));
        }
        const netPrice = price - fee;

        // 손익분기점: 모든 파티원이 균등하게 나눠갖는 입찰가
        // B = netPrice * (partySize - 1) / partySize
        const breakEven = netPrice * (partySize - 1) / partySize;

        // 추천 입찰가 (이득을 볼 수 있는 라인)
        const recommended70 = breakEven * 0.93; // 손익분기점의 93% (약 7% 이득)
        const recommended80 = breakEven * 0.96; // 손익분기점의 96% (약 4% 이득)
        const recommended90 = breakEven * 0.99; // 손익분기점의 99% (약 1% 이득)

        return {
            marketPrice: price,
            fee,
            netPrice,
            breakEven,
            recommended70,
            recommended80,
            recommended90,
            partySize
        };
    }, [marketPrice, partySize]);

    // 내 입찰가 분석
    const bidAnalysis = useMemo(() => {
        if (!calculations) return null;
        const bid = parseFloat(myBid);
        if (!bid || bid <= 0) return null;

        const { netPrice, breakEven, partySize } = calculations;

        // 낙찰 시 내가 받는 몫
        const myShare = netPrice - bid + (bid / partySize);
        // 다른 파티원들이 받는 몫
        const othersShare = bid / partySize;
        // 손익분기점 대비 차이
        const difference = breakEven - bid;
        // 이득/손해 비율
        const profitRate = ((myShare - othersShare) / othersShare * 100);

        return {
            bid,
            myShare,
            othersShare,
            difference,
            profitRate,
            isProfit: bid < breakEven,
            isLoss: bid > breakEven,
            isEven: Math.abs(bid - breakEven) < 0.01
        };
    }, [calculations, myBid]);

    const handlePriceChange = (value) => {
        const sanitized = value.replace(/[^\d]/g, '');
        setMarketPrice(sanitized);
    };

    const handleBidChange = (value) => {
        const sanitized = value.replace(/[^\d]/g, '');
        setMyBid(sanitized);
    };

    const handleReset = () => {
        setMarketPrice('');
        setPartySize(4);
        setMyBid('');
    };

    const formatGold = (value) => {
        return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            {/* 커스텀 스크롤바 */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1e293b;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #475569;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }
                input[type="text"] {
                    font-variant-numeric: tabular-nums;
                }
                .gold-text {
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
            `}</style>

            {/* 사이드바 */}
            <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-screen">
                {/* 로고 */}
                <div className="p-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
                            💰
                        </div>
                        <div>
                            <h1 className="font-bold text-amber-400">경매 입찰</h1>
                            <p className="text-xs text-slate-500">손익분기점 계산기</p>
                        </div>
                    </div>
                </div>

                {/* 설명 */}
                <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 mb-2">사용 방법</h3>
                    <ul className="text-xs text-slate-500 space-y-1">
                        <li>• 거래소 판매가 입력</li>
                        <li>• 파티 인원 선택</li>
                        <li>• 손익분기점 확인</li>
                        <li>• 입찰가 분석으로 이득 계산</li>
                    </ul>
                </div>

                {/* 파티 인원 선택 */}
                <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 mb-3">파티 인원</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[4, 8, 16].map(size => (
                            <button
                                key={size}
                                onClick={() => setPartySize(size)}
                                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                    partySize === size
                                        ? 'bg-amber-500 text-slate-900'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {size}인
                            </button>
                        ))}
                    </div>
                </div>

                {/* 계산 설명 */}
                <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 mb-2">계산 공식</h3>
                    <div className="text-xs text-slate-500 space-y-1">
                        <p>• <span className="text-amber-400">거래소 수수료</span>: 5% (최소 1골드)</p>
                        <p>• <span className="text-emerald-400">손익분기점</span>: 실수령액 × (인원-1) / 인원</p>
                        <p>• 손익분기점 미만 입찰 = 이득</p>
                        <p>• 손익분기점 초과 입찰 = 손해</p>
                    </div>
                </div>

                {/* 초기화 버튼 */}
                <div className="px-5 py-4">
                    <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        전체 초기화
                    </button>
                </div>

                {/* 푸터 */}
                <div className="mt-auto p-4 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-600">v1.0 • 게임 내 수치와 다를 수 있음</p>
                </div>
            </aside>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 ml-72 min-h-screen">
                {/* 헤더 */}
                <header className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 z-10">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-200">경매 손익분기점 계산</h2>
                                <p className="text-sm text-slate-500">
                                    레이드/필드보스 경매에서 이득을 볼 수 있는 입찰가를 계산합니다
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6 space-y-6">
                    {/* 거래소 판매가 입력 */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📊</span>
                            거래소 판매가
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={marketPrice}
                                        onChange={(e) => handlePriceChange(e.target.value)}
                                        placeholder="거래소에서 팔 수 있는 가격"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg text-right pr-16 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-medium">
                                        골드
                                    </span>
                                </div>
                            </div>
                        </div>
                        {calculations && (
                            <div className="mt-4 flex items-center gap-4 text-sm">
                                <span className="text-slate-400">
                                    수수료: <span className="text-red-400">-{formatGold(calculations.fee)}G</span>
                                </span>
                                <span className="text-slate-400">
                                    실수령액: <span className="text-emerald-400">{formatGold(calculations.netPrice)}G</span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 손익분기점 결과 */}
                    {calculations && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <span className="text-2xl">⚖️</span>
                                손익분기점
                            </h3>
                            
                            {/* 메인 손익분기점 */}
                            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl p-6 mb-6">
                                <div className="text-center">
                                    <p className="text-slate-400 text-sm mb-2">
                                        {calculations.partySize}인 파티 기준 손익분기점
                                    </p>
                                    <p className="text-4xl font-black gold-text">
                                        {formatGold(calculations.breakEven)} G
                                    </p>
                                    <p className="text-slate-500 text-xs mt-2">
                                        이 가격 미만으로 입찰하면 이득, 초과하면 손해
                                    </p>
                                </div>
                            </div>

                            {/* 추천 입찰가 */}
                            <h4 className="text-sm font-bold text-slate-300 mb-3">💡 추천 입찰가</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                                    <p className="text-xs text-emerald-400 mb-1">안전 (7% 이득)</p>
                                    <p className="text-xl font-bold text-emerald-400">
                                        {formatGold(calculations.recommended70)} G
                                    </p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                                    <p className="text-xs text-blue-400 mb-1">적정 (4% 이득)</p>
                                    <p className="text-xl font-bold text-blue-400">
                                        {formatGold(calculations.recommended80)} G
                                    </p>
                                </div>
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                                    <p className="text-xs text-purple-400 mb-1">공격적 (1% 이득)</p>
                                    <p className="text-xl font-bold text-purple-400">
                                        {formatGold(calculations.recommended90)} G
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 입찰가 분석 */}
                    {calculations && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🔍</span>
                                내 입찰가 분석
                            </h3>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={myBid}
                                    onChange={(e) => handleBidChange(e.target.value)}
                                    placeholder="내가 입찰하려는 가격을 입력하세요"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg text-right pr-16 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-medium">
                                    골드
                                </span>
                            </div>

                            {bidAnalysis && (
                                <div className={`rounded-xl p-6 ${
                                    bidAnalysis.isProfit 
                                        ? 'bg-emerald-500/10 border border-emerald-500/30' 
                                        : bidAnalysis.isLoss
                                            ? 'bg-red-500/10 border border-red-500/30'
                                            : 'bg-amber-500/10 border border-amber-500/30'
                                }`}>
                                    <div className="text-center mb-4">
                                        <p className={`text-3xl font-black ${
                                            bidAnalysis.isProfit 
                                                ? 'text-emerald-400' 
                                                : bidAnalysis.isLoss
                                                    ? 'text-red-400'
                                                    : 'text-amber-400'
                                        }`}>
                                            {bidAnalysis.isProfit ? '✅ 이득' : bidAnalysis.isLoss ? '❌ 손해' : '⚖️ 동일'}
                                        </p>
                                        {!bidAnalysis.isEven && (
                                            <p className={`text-lg mt-2 ${
                                                bidAnalysis.isProfit ? 'text-emerald-300' : 'text-red-300'
                                            }`}>
                                                손익분기점 대비 {bidAnalysis.isProfit ? '-' : '+'}{formatGold(Math.abs(bidAnalysis.difference))} G
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                            <p className="text-xs text-slate-400 mb-1">내가 받는 골드</p>
                                            <p className={`text-xl font-bold ${
                                                bidAnalysis.isProfit ? 'text-emerald-400' : 'text-slate-200'
                                            }`}>
                                                {formatGold(bidAnalysis.myShare)} G
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                            <p className="text-xs text-slate-400 mb-1">다른 파티원이 받는 골드</p>
                                            <p className="text-xl font-bold text-slate-200">
                                                {formatGold(bidAnalysis.othersShare)} G
                                            </p>
                                        </div>
                                    </div>

                                    {!bidAnalysis.isEven && (
                                        <p className="text-center text-sm text-slate-400 mt-4">
                                            다른 파티원 대비 {bidAnalysis.isProfit ? '+' : ''}{formatGold(bidAnalysis.myShare - bidAnalysis.othersShare)} G {bidAnalysis.isProfit ? '더 받음' : '적게 받음'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {!bidAnalysis && calculations && (
                                <div className="text-center text-slate-500 py-8">
                                    입찰가를 입력하면 이득/손해를 분석해드립니다
                                </div>
                            )}
                        </div>
                    )}

                    {/* 도움말 */}
                    {!calculations && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
                            <div className="text-6xl mb-4">💰</div>
                            <h3 className="text-xl font-bold text-slate-300 mb-2">경매 입찰 계산기</h3>
                            <p className="text-slate-500">
                                거래소 판매가를 입력하면 손익분기점을 계산해드립니다
                            </p>
                            <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                                <div className="bg-slate-800 rounded-lg p-4">
                                    <p className="text-amber-400 font-bold mb-1">1단계</p>
                                    <p className="text-slate-400">거래소 판매가 입력</p>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-4">
                                    <p className="text-amber-400 font-bold mb-1">2단계</p>
                                    <p className="text-slate-400">파티 인원 선택</p>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-4">
                                    <p className="text-amber-400 font-bold mb-1">3단계</p>
                                    <p className="text-slate-400">손익분기점 확인</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-slate-500 text-center">
                        💡 팁: 손익분기점보다 낮게 입찰하면 파티원보다 더 많은 골드를 얻게 됩니다
                    </p>
                </div>
            </main>
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<AuctionCalculator />);
}
