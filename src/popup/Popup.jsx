import { useEffect, useMemo, useState } from 'react'

// 뱃지 클래스 헬퍼
const badge = (lvl) => lvl === 'bad' ? 'badge bad'
  : lvl === 'warn' ? 'badge warn'
  : 'badge'

// 점수→각도
const degFromScore = (s) => Math.max(0, Math.min(100, s || 0)) * 3.6

export default function Popup() {
  const [url, setUrl] = useState('...')
  const [score, setScore] = useState(null) // 0~100
  const [verdict, setVerdict] = useState('분석 중…')

  const [ssl, setSSL] = useState({ text: '확인중', level: 'safe' })
  const [whois, setWhois] = useState({ text: '확인중', level: 'safe' })
  const [blacklist, setBlacklist] = useState({ text: '확인중', level: 'safe' })
  const [keyword, setKeyword] = useState({ text: '확인중', level: 'warn' })
  const [redirect, setRedirect] = useState({ text: '확인중', level: 'safe' })

  const [autoScan, setAutoScan] = useState(true)
  const [shareData, setShareData] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [keywords, setKeywords] = useState(['login','verify','bonus'])

  const gaugeStyle = useMemo(() => ({
    background: `conic-gradient(var(--safe) ${degFromScore(score)}deg, #e5e7eb 0deg)`
  }), [score])

  useEffect(() => {
    // 기존 popup.js 로직을 이식하는 자리
    // 현재 탭 URL 얻기 → 백엔드 analyze 호출 → 상태 업데이트
    const init = async () => {
      // 탭 URL
      if (chrome?.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const u = tabs?.[0]?.url || 'about:blank'
          setUrl(u)
          if (autoScan) analyze(u)
        })
      } else {
        // dev 미리보기
        const u = 'https://example.com'
        setUrl(u)
        if (autoScan) analyze(u)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const analyze = async (targetUrl) => {
    // TODO: 기존 popup.js의 분석 로직을 이곳에 옮기세요.
    // 아래는 데모 값
    const s = 82
    setScore(s)
    setVerdict(s >= 80 ? '안전' : s >= 60 ? '주의' : '위험')
    setSSL({ text: 'TLS 1.3', level: 'safe' })
    setWhois({ text: '등록 확인', level: 'safe' })
    setBlacklist({ text: '위협 정보 없음', level: 'safe' })
    setKeyword({ text: '의심 키워드 없음', level: 'safe' })
    setRedirect({ text: '리디렉션 없음', level: 'safe' })
  }

    const openReport = async () => {
    // 보고 있는 URL과 분석 결과를 스토리지에 저장 (선택사항)
    const reportData = {
        url,
        score,
        verdict,
        ssl,
        whois,
        blacklist,
        keyword,
        redirect,
        analyzedAt: new Date().toISOString()
    }

    try {
        await chrome.storage.local.set({ reportData })
    } catch (e) {
        console.warn('storage set failed', e)
    }

    // 쿼리스트링에도 URL을 같이 붙여주기
    const target = chrome?.runtime?.getURL?.(`report.html?url=${encodeURIComponent(url)}`) 
        || `report.html?url=${encodeURIComponent(url)}`

    if (chrome?.tabs?.create) chrome.tabs.create({ url: target })
    else window.open(target, '_blank')
    }

  const onAddKeyword = (e) => {
    e.preventDefault()
    const v = e.currentTarget.keyword.value.trim()
    if (!v) return
    setKeywords((arr) => (arr.includes(v) ? arr : [...arr, v]))
    e.currentTarget.reset()
  }

  return (
    <div className="shell">
      <header className="app-header">
        <div className="logo">
          <img src="/icons/site-guard-icon.png" alt="siteguard-icons" className="logo-img" />
        </div>
        <div className="title-wrap">
          <h1 className="title">SiteGuard</h1>
          <p className="subtitle">현재 방문한 사이트의 안전도를 점검해보세요</p>
        </div>
      </header>

      <div className="header-rule" />

      <main>
        {/* 점수 카드 */}
        <section className="score-card" aria-live="polite">
          <div className="gauge" style={gaugeStyle} role="img" aria-label="안전도 점수">
            <div className="gauge-center">
              <span className="gauge-score">{score ?? '--'}</span>
              <span className="gauge-unit">/100</span>
            </div>
          </div>
          <div className="score-txt">
            <div className="url" title={url}>{url}</div>
            <div className="verdict">{verdict}</div>
          </div>
        </section>

        {/* 요약 */}
        <section className="details">
          <h2 className="section-title">세부 분석 결과 요약</h2>
          <ul className="kv">
            <li><span className="k">SSL 사용 여부</span><span className={badge(ssl.level)}>{ssl.text}</span></li>
            <li><span className="k">WHOIS 등록 여부</span><span className={badge(whois.level)}>{whois.text}</span></li>
            <li><span className="k">악성 URL 탐지</span><span className={badge(blacklist.level)}>{blacklist.text}</span></li>
            <li><span className="k">의심 키워드</span><span className={badge(keyword.level)}>{keyword.text}</span></li>
            <li><span className="k">리디렉션 여부</span><span className={badge(redirect.level)}>{redirect.text}</span></li>
          </ul>

          <button className="primary" onClick={openReport}>
            자세히 보기 <span aria-hidden="true">→</span>
          </button>
          <p className="helper">사이트에 대한 상세 보안 리포트를 확인합니다.</p>
        </section>

        {/* 설정 */}
        <section className="settings">
          <h2 className="section-title">설정</h2>

          <div className="setting-row">
            <div>
              <div className="setting-title">자동 검사</div>
              <div className="setting-desc">사이트 방문 시 자동으로 안전 여부를 확인합니다.</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={autoScan} onChange={e => setAutoScan(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-title">위험 키워드 관리</div>
              <div className="setting-desc">차단할 단어나 URL 키워드를 직접 설정할 수 있습니다.</div>
            </div>
            <button className="link-btn" aria-expanded={panelOpen} onClick={() => setPanelOpen(v => !v)}>관리</button>
          </div>

          {panelOpen && (
            <div className="keywords-panel">
              <div className="pill-list" aria-live="polite" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {keywords.map(k => (
                  <span key={k} className="pill" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', background: 'var(--chip)', color: 'var(--chip-text)', borderRadius: 999, padding: '4px 8px' }}>
                    <span>{k}</span>
                    <button onClick={() => setKeywords(arr => arr.filter(x => x !== k))} title="삭제">×</button>
                  </span>
                ))}
              </div>
              <form className="add-keyword" onSubmit={onAddKeyword} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input name="keyword" id="keywordInput" type="text" placeholder="키워드 추가 (예: login)" required />
                <button className="add-btn" type="submit">추가</button>
              </form>
            </div>
          )}

          <div className="setting-row">
            <div>
              <div className="setting-title">데이터 공유</div>
              <div className="setting-desc">익명 검사 결과를 개선 목적으로 공유합니다.</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={shareData} onChange={e => setShareData(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>
        </section>

        <footer className="foot">
          <button className="ghost" onClick={() => analyze(url)}>다시 검사</button>
          <span className="ver">v1.0</span>
        </footer>
      </main>
    </div>
  )
}
