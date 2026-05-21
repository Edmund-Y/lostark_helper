import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// 시간 포맷팅 유틸리티
function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
        return '방금 전';
    } else if (diff < hour) {
        const minutes = Math.floor(diff / minute);
        return `${minutes}분 전`;
    } else if (diff < day) {
        const hours = Math.floor(diff / hour);
        return `${hours}시간 전`;
    } else if (diff < 2 * day) {
        return '어제';
    } else if (diff < 7 * day) {
        const days = Math.floor(diff / day);
        return `${days}일 전`;
    } else {
        return new Date(timestamp).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
        });
    }
}

// 히어로 섹션 컴포넌트
function HeroSection({ hasRecentTools }) {
    const handleQuickStart = () => {
        const target = hasRecentTools ? 'recent' : 'all';
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleViewAll = () => {
        document.getElementById('all')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="py-20 text-center">
            <h1 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent">
                로스트아크 도구 모음
            </h1>
            <p className="text-slate-400 text-lg md:text-xl mb-8">
                게임을 더 편하게 즐기기 위한 계산기와 도구들
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
                <button
                    onClick={handleQuickStart}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/50 transition-all"
                >
                    빠른 시작
                </button>
                <button
                    onClick={handleViewAll}
                    className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl font-medium hover:border-slate-600 transition-all"
                >
                    전체 도구 보기
                </button>
            </div>
        </section>
    );
}

// 최근 사용 도구 섹션 컴포넌트
function RecentToolsSection({ tools }) {
    if (!tools || tools.length === 0) return null;

    return (
        <section id="recent" className="mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-purple-400">⚡</span>
                최근 사용
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map(tool => (
                    <a key={tool.id} href={tool.url} className="group">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-purple-500/50 transition-all flex items-center gap-4">
                            <span className="text-3xl">{tool.icon}</span>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-purple-400 group-hover:text-purple-300 truncate">
                                    {tool.name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {formatTime(tool.lastVisited)}
                                </p>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}

// 전체 도구 섹션 컴포넌트
function AllToolsSection() {
    return (
        <section id="all">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-amber-400">🎯</span>
                모든 도구
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 아비도스 계산기 */}
                <a href="abidoscalculator/" className="group">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/50 transition-all hover:shadow-xl hover:shadow-amber-500/10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-4xl">🪓</span>
                            <span className="text-4xl">🌟</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-amber-400 group-hover:text-amber-300">
                            아비도스 / 상급 아비도스 계산기
                        </h2>
                        <p className="text-slate-400 text-sm">
                            아비도스·상급 아비도스 목재 제작을 위한 최적의 재료 조합을 계산합니다
                        </p>
                    </div>
                </a>

                {/* 파견의뢰소 효율 비교 */}
                <a href="dispatch/" className="group">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10">
                        <div className="text-4xl mb-4">📋</div>
                        <h2 className="text-xl font-bold mb-2 text-purple-400 group-hover:text-purple-300">
                            파견의뢰소 효율 비교
                        </h2>
                        <p className="text-slate-400 text-sm">
                            파견 임무의 시간·활동력 효율을 비교하여 최적의 임무를 찾습니다
                        </p>
                    </div>
                </a>

                {/* 경매 입찰 계산기 */}
                <a href="auction/" className="group">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/50 transition-all hover:shadow-xl hover:shadow-amber-500/10">
                        <div className="text-4xl mb-4">💰</div>
                        <h2 className="text-xl font-bold mb-2 text-amber-400 group-hover:text-amber-300">
                            경매 입찰 계산기
                        </h2>
                        <p className="text-slate-400 text-sm">
                            레이드/필드보스 경매 손익분기점을 계산합니다
                        </p>
                    </div>
                </a>
            </div>
        </section>
    );
}

// 푸터 컴포넌트
function Footer() {
    return (
        <div className="mt-12 text-center">
            <p className="text-slate-600 text-sm">
                © 2025 moonlight.one • 문의 및 건의 : admin@moonlight.one
            </p>
        </div>
    );
}

// 메인 페이지 컴포넌트
function MainPage() {
    const [recentTools, setRecentTools] = useState([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('recentTools');
            if (stored) {
                const tools = JSON.parse(stored);
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

                // 7일 이상 된 항목 필터링
                const filtered = tools.filter(t => t.lastVisited > sevenDaysAgo);

                // 변경사항이 있으면 LocalStorage 업데이트
                if (filtered.length !== tools.length) {
                    localStorage.setItem('recentTools', JSON.stringify(filtered));
                }

                setRecentTools(filtered);
            }
        } catch (error) {
            // LocalStorage 에러 조용히 무시
            console.error('LocalStorage error:', error);
        }
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="max-w-4xl w-full">
                <HeroSection hasRecentTools={recentTools.length > 0} />
                <RecentToolsSection tools={recentTools} />
                <AllToolsSection />
                <Footer />
            </div>
        </div>
    );
}

// 앱 렌더링
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<MainPage />);
}
