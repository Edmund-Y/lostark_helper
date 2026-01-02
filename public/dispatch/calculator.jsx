import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const MAX_MISSIONS = 20;

function DispatchCalculator() {
    // 페이지 방문 기록 (LocalStorage)
    useEffect(() => {
        try {
            const toolInfo = {
                id: 'dispatch',
                name: '파견의뢰소 효율 비교',
                icon: '📋',
                url: '/dispatch',
                lastVisited: Date.now()
            };

            const recent = JSON.parse(localStorage.getItem('recentTools') || '[]');
            const filtered = recent.filter(t => t.id !== toolInfo.id);
            const updated = [toolInfo, ...filtered].slice(0, 3);
            localStorage.setItem('recentTools', JSON.stringify(updated));
        } catch (error) {
            // LocalStorage 에러 조용히 무시
            console.error('LocalStorage error:', error);
        }
    }, []);

    const [missions, setMissions] = useState([
        { id: Date.now(), seals: '', activity: '', time: '' }
    ]);
    const [sortBy, setSortBy] = useState('sealsPerTime');

    // 마지막 임무 완성 여부 체크
    const isLastMissionComplete = useMemo(() => {
        const last = missions[missions.length - 1];
        return Boolean(last && last.seals && last.activity && last.time);
    }, [missions]);

    // 자동으로 새 임무 추가
    useEffect(() => {
        if (isLastMissionComplete && missions.length < MAX_MISSIONS) {
            const timer = setTimeout(() => {
                setMissions(prev => [...prev, {
                    id: Date.now(),
                    seals: '',
                    activity: '',
                    time: ''
                }]);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isLastMissionComplete, missions.length]);

    // 입력 변경 핸들러
    const handleMissionChange = useCallback((id, field, value) => {
        const sanitized = value.replace(/[^\d.]/g, '');
        const parts = sanitized.split('.');
        const finalValue = parts.length > 2
            ? parts[0] + '.' + parts.slice(1).join('')
            : sanitized;

        setMissions(prev =>
            prev.map(m =>
                m.id === id ? { ...m, [field]: finalValue } : m
            )
        );
    }, []);

    // 임무 삭제
    const handleDeleteMission = useCallback((id) => {
        if (missions.length > 1) {
            setMissions(prev => prev.filter(m => m.id !== id));
        } else {
            setMissions([{ id: Date.now(), seals: '', activity: '', time: '' }]);
        }
    }, [missions.length]);

    // 전체 초기화
    const handleReset = useCallback(() => {
        setMissions([{ id: Date.now(), seals: '', activity: '', time: '' }]);
        setSortBy('sealsPerTime');
    }, []);

    // 효율 계산 및 정렬된 데이터
    const sortedMissions = useMemo(() => {
        // 모든 임무를 효율 계산과 함께 처리
        const allMissions = missions.map(m => {
            const seals = parseFloat(m.seals);
            const activity = parseFloat(m.activity);
            const time = parseFloat(m.time);

            const isComplete = m.seals && m.activity && m.time;

            if (!isComplete) {
                return {
                    ...m,
                    isComplete: false,
                    sealsPerTime: 0,
                    sealsPerActivity: 0,
                    overallScore: 0,
                };
            }

            return {
                ...m,
                isComplete: true,
                seals,
                activity,
                time,
                sealsPerTime: time > 0 ? seals / time : 0,
                sealsPerActivity: activity > 0 ? seals / activity : 0,
            };
        });

        // 완료된 임무들만 추출
        const completedMissions = allMissions.filter(m => m.isComplete);

        if (completedMissions.length > 0) {
            // 정규화를 위한 최대값 계산
            const maxSealsPerTime = Math.max(...completedMissions.map(m => m.sealsPerTime));
            const maxSealsPerActivity = Math.max(...completedMissions.map(m => m.sealsPerActivity));
            const maxSeals = Math.max(...completedMissions.map(m => m.seals));

            // 종합 효율 점수 계산
            completedMissions.forEach(m => {
                const normalizedTime = maxSealsPerTime > 0 ? (m.sealsPerTime / maxSealsPerTime) * 100 : 0;
                const normalizedActivity = maxSealsPerActivity > 0 ? (m.sealsPerActivity / maxSealsPerActivity) * 100 : 0;
                const normalizedSeals = maxSeals > 0 ? (m.seals / maxSeals) * 100 : 0;

                m.overallScore = normalizedTime * 0.4 + normalizedActivity * 0.4 + normalizedSeals * 0.2;
            });

            // 각 기준별 순위 계산
            const sortedByTime = [...completedMissions].sort((a, b) => b.sealsPerTime - a.sealsPerTime);
            const sortedByActivity = [...completedMissions].sort((a, b) => b.sealsPerActivity - a.sealsPerActivity);
            const sortedByOverall = [...completedMissions].sort((a, b) => b.overallScore - a.overallScore);

            completedMissions.forEach(m => {
                m.rankByTime = sortedByTime.findIndex(sm => sm.id === m.id) + 1;
                m.rankByActivity = sortedByActivity.findIndex(sm => sm.id === m.id) + 1;
                m.rankByOverall = sortedByOverall.findIndex(sm => sm.id === m.id) + 1;
            });
        }

        // 완료된 임무는 정렬, 미완료는 원래 순서대로
        const incompleteMissions = allMissions.filter(m => !m.isComplete);

        if (completedMissions.length === 0) {
            return allMissions;
        }

        const sortKey = {
            sealsPerTime: 'sealsPerTime',
            sealsPerActivity: 'sealsPerActivity',
            overall: 'overallScore',
        }[sortBy];

        const sortedCompleted = completedMissions.sort((a, b) => b[sortKey] - a[sortKey]);

        // 완료된 임무(정렬됨) + 미완료 임무(원래 순서)
        return [...sortedCompleted, ...incompleteMissions];
    }, [missions, sortBy]);

    const validMissionCount = useMemo(() => {
        return missions.filter(m => m.seals && m.activity && m.time).length;
    }, [missions]);

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
            `}</style>

            {/* 사이드바 */}
            <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-screen">
                {/* 로고 */}
                <div className="p-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
                            📋
                        </div>
                        <div>
                            <h1 className="font-bold text-purple-400">파견의뢰소</h1>
                            <p className="text-xs text-slate-500">효율 비교기</p>
                        </div>
                    </div>
                </div>

                {/* 설명 */}
                <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 mb-2">사용 방법</h3>
                    <ul className="text-xs text-slate-500 space-y-1">
                        <li>• 테이블에 임무 정보 입력</li>
                        <li>• 입력 완료 시 실시간 효율 계산</li>
                        <li>• 자동 정렬로 최고 효율 확인</li>
                        <li>• 최대 {MAX_MISSIONS}개까지 비교 가능</li>
                    </ul>
                </div>

                {/* 정렬 옵션 */}
                <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 mb-3">정렬 기준</h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-slate-800/50 transition-all">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="radio"
                                    name="sort"
                                    value="sealsPerTime"
                                    checked={sortBy === 'sealsPerTime'}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sortBy === 'sealsPerTime'
                                        ? 'border-purple-500 bg-purple-500'
                                        : 'border-slate-600 group-hover:border-slate-500'
                                    }`}>
                                    {sortBy === 'sealsPerTime' && (
                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-lg">⏱️</span>
                                <div>
                                    <div className={`text-sm font-medium transition-colors ${sortBy === 'sealsPerTime' ? 'text-purple-400' : 'text-slate-300 group-hover:text-slate-200'
                                        }`}>시간당 인장</div>
                                    <div className="text-xs text-slate-500">빠른 임무 우선</div>
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-slate-800/50 transition-all">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="radio"
                                    name="sort"
                                    value="sealsPerActivity"
                                    checked={sortBy === 'sealsPerActivity'}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sortBy === 'sealsPerActivity'
                                        ? 'border-emerald-500 bg-emerald-500'
                                        : 'border-slate-600 group-hover:border-slate-500'
                                    }`}>
                                    {sortBy === 'sealsPerActivity' && (
                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-lg">⚡</span>
                                <div>
                                    <div className={`text-sm font-medium transition-colors ${sortBy === 'sealsPerActivity' ? 'text-emerald-400' : 'text-slate-300 group-hover:text-slate-200'
                                        }`}>활동력당 인장</div>
                                    <div className="text-xs text-slate-500">적은 활동력 우선</div>
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg hover:bg-slate-800/50 transition-all">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="radio"
                                    name="sort"
                                    value="overall"
                                    checked={sortBy === 'overall'}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sortBy === 'overall'
                                        ? 'border-amber-500 bg-amber-500'
                                        : 'border-slate-600 group-hover:border-slate-500'
                                    }`}>
                                    {sortBy === 'overall' && (
                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-lg">🏆</span>
                                <div>
                                    <div className={`text-sm font-medium transition-colors ${sortBy === 'overall' ? 'text-amber-400' : 'text-slate-300 group-hover:text-slate-200'
                                        }`}>종합 효율</div>
                                    <div className="text-xs text-slate-500">밸런스 추천</div>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* 효율 계산 설명 */}
                <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-300 mb-2">효율 계산</h3>
                    <div className="text-xs text-slate-500 space-y-1">
                        <p>• <span className="text-purple-400">시간당</span>: 인장 ÷ 시간</p>
                        <p>• <span className="text-emerald-400">활동력당</span>: 인장 ÷ 활동력</p>
                        <p>• <span className="text-amber-400">종합</span>: 시간 40% + 활동력 40% + 인장 20%</p>
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
                                <h2 className="text-lg font-bold text-slate-200">임무 효율 비교</h2>
                                <p className="text-sm text-slate-500">
                                    {validMissionCount}개 임무 분석 중
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6">
                    {/* 통합 테이블 */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '70vh' }}>
                            <table className="w-full">
                                <thead className="bg-slate-950/80 border-b border-slate-800 sticky top-0 z-20">
                                    <tr>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-400 w-16">순위</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-400 w-20">#</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-400">인장</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-400">활동력</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-slate-400">시간(분)</th>
                                        <th className="px-3 py-3 text-right text-xs font-bold text-purple-400">시간당</th>
                                        <th className="px-3 py-3 text-right text-xs font-bold text-emerald-400">활동력당</th>
                                        <th className="px-3 py-3 text-right text-xs font-bold text-amber-400">종합</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-slate-400 w-16">삭제</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedMissions.map((mission, displayIndex) => {
                                        const originalIndex = missions.findIndex(m => m.id === mission.id) + 1;
                                        const isComplete = mission.isComplete;

                                        // 완료된 임무 중에서의 순위 (표시용)
                                        const displayRank = isComplete ? displayIndex + 1 : null;
                                        const isTop3 = displayRank && displayRank <= 3;

                                        return (
                                            <tr
                                                key={mission.id}
                                                className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${displayRank === 1 ? 'bg-amber-500/5' : ''
                                                    } ${!isComplete ? 'opacity-60' : ''}`}
                                            >
                                                {/* 순위 */}
                                                <td className="px-3 py-2 text-center">
                                                    {isComplete ? (
                                                        isTop3 ? (
                                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${displayRank === 1 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-900' :
                                                                    displayRank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900' :
                                                                        'bg-gradient-to-br from-amber-600 to-amber-700 text-slate-100'
                                                                }`}>
                                                                {displayRank}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 text-sm">{displayRank}</span>
                                                        )
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">-</span>
                                                    )}
                                                </td>

                                                {/* 임무 번호 */}
                                                <td className="px-3 py-2 text-sm text-slate-400">#{originalIndex}</td>

                                                {/* 입력 필드들 */}
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={mission.seals}
                                                        onChange={(e) => handleMissionChange(mission.id, 'seals', e.target.value)}
                                                        placeholder="0"
                                                        className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={mission.activity}
                                                        onChange={(e) => handleMissionChange(mission.id, 'activity', e.target.value)}
                                                        placeholder="0"
                                                        className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={mission.time}
                                                        onChange={(e) => handleMissionChange(mission.id, 'time', e.target.value)}
                                                        placeholder="0"
                                                        className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                                                    />
                                                </td>

                                                {/* 효율 결과 */}
                                                <td className="px-3 py-2 text-right">
                                                    {isComplete ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-purple-400 font-medium text-sm">
                                                                {mission.sealsPerTime.toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-slate-600">#{mission.rankByTime}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {isComplete ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-emerald-400 font-medium text-sm">
                                                                {mission.sealsPerActivity.toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-slate-600">#{mission.rankByActivity}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {isComplete ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-amber-400 font-medium text-sm">
                                                                {Math.round(mission.overallScore)}
                                                            </span>
                                                            <span className="text-xs text-slate-600">#{mission.rankByOverall}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">-</span>
                                                    )}
                                                </td>

                                                {/* 삭제 버튼 */}
                                                <td className="px-3 py-2 text-center">
                                                    {missions.length > 1 && (
                                                        <button
                                                            onClick={() => handleDeleteMission(mission.id)}
                                                            className="text-red-400 hover:text-red-300 px-2 py-1 text-xs rounded hover:bg-red-500/10 transition-all"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        💡 팁: 3개 값을 모두 입력하면 실시간으로 효율이 계산되고 자동 정렬됩니다
                    </p>
                </div>
            </main>
        </div>
    );
}
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<DispatchCalculator />);
}
