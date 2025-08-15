// src/report/Report.jsx
import { useEffect, useMemo, useState } from 'react'

const badge = (lvl) =>
  lvl === 'bad' ? 'badge bad' : lvl === 'warn' ? 'badge warn' : 'badge'

// 0~100 점수 → 각도
const degFromScore = (s) => Math.max(0, Math.min(100, Number.isFinite(s) ? s : 0)) * 3.6

// safe|warn|bad 등급 계산 (기존 시각 규칙과 맞춤)
const levelFromScore = (s) => (s >= 80 ? 'safe' : s >= 60 ? 'warn' : 'bad')

export default function Report() {
  // 상단 메타
  const [targetUrl, setTargetUrl] = useState('')
  const [score, setScore] = useState(null) // 0~100
  const [verdict, setVerdict] = useState('분석 중…')
  const [finalNote, setFinalNote] = useState('최종 평가: 자동 분석을 기반으로 제공됩니다.')

  // 표 데이터
  const [basicRows, setBasicRows] = useState([]) // [{title, value, level}]
  const [vulnRows, setVulnRows] = useState([])
  const [extraRows, setExtraRows] = useState([])

  // “분석 요약”, “분석 기준 및 기술”
  const [summaryHTML, setSummaryHTML] = useState('-')
  const [methodology, setMethodology] = useState({
    tools: '-',
    analyzedAt: '-',
    analysisType: '-',
  })

  // 게이지 스타일 (디자인 동일)
  const gaugeStyle = useMemo(
    () => ({ background: `conic-gradient(var(--brand) ${degFromScore(score)}deg, var(--line) 0deg)` }),
    [score]
  )

  const scoreLevel = levelFromScore(score ?? 0)

  // URL 파라미터 수신 (예: report.html?url=https://example.com)
  useEffect(() => {
    const u = new URL(window.location.href)
    const q = u.searchParams.get('url') || ''
    setTargetUrl(q)
  }, [])

  // ✅ 기존 report.js와의 호환 브리지
  // 기존 코드가 DOM 조작 대신 아래 API를 호출하면 동일 동작
  useEffect(() => {
    window.ReportBridge = {
      // 상단 메타
      setTargetUrl: (u) => setTargetUrl(u || ''),
      setScore: (s) => setScore(Number(s)),
      setVerdict: (v) => setVerdict(v || ''),
      setFinalNote: (t) => setFinalNote(t || ''),

      // 표/요약/메소드
      setBasicRows: (rows) => setBasicRows(Array.isArray(rows) ? rows : []),
      setVulnRows: (rows) => setVulnRows(Array.isArray(rows) ? rows : []),
      setExtraRows: (rows) => setExtraRows(Array.isArray(rows) ? rows : []),

      setSummaryHTML: (html) => setSummaryHTML(String(html ?? '-')),
      setMethodology: (obj) =>
        setMethodology((prev) => ({
          tools: obj?.tools ?? prev.tools,
          analyzedAt: obj?.analyzedAt ?? prev.analyzedAt,
          analysisType: obj?.analysisType ?? prev.analysisType,
        })),

      // 한번에 세팅
      setAll: (payload = {}) => {
        if ('targetUrl' in payload) setTargetUrl(payload.targetUrl || '')
        if ('score' in payload) setScore(Number(payload.score))
        if ('verdict' in payload) setVerdict(payload.verdict || '')
        if ('finalNote' in payload) setFinalNote(payload.finalNote || '')
        if ('basicRows' in payload) setBasicRows(Array.isArray(payload.basicRows) ? payload.basicRows : [])
        if ('vulnRows' in payload) setVulnRows(Array.isArray(payload.vulnRows) ? payload.vulnRows : [])
        if ('extraRows' in payload) setExtraRows(Array.isArray(payload.extraRows) ? payload.extraRows : [])
        if ('summaryHTML' in payload) setSummaryHTML(String(payload.summaryHTML ?? '-'))
        if ('methodology' in payload)
          setMethodology((prev) => ({
            tools: payload.methodology?.tools ?? prev.tools,
            analyzedAt: payload.methodology?.analyzedAt ?? prev.analyzedAt,
            analysisType: payload.methodology?.analysisType ?? prev.analysisType,
          }))
      },
    }
    // cleanup은 굳이 제거하지 않음 (리포트 페이지는 단일 생명주기)
  }, [])

  // 검색 제출 → 동일 페이지에서 쿼리 갱신
  const onSubmitSearch = (e) => {
    e.preventDefault()
    const input = e.currentTarget.querySelector('.search-txt')
    const v = input?.value?.trim()
    if (!v) return
    const next = new URL(window.location.href)
    next.searchParams.set('url', v)
    window.location.href = next.toString()
  }

  // 표 렌더 (디자인/구성 동일)
  const renderTable = (rows) => (
    <div className="table">
      <div className="row">
        <div className="cell-title">항목</div>
        <div className="cell-title">설명</div>
        <div className="cell-title">상태</div>
      </div>
      {rows.map((r, i) => (
        <div className="row" key={i}>
          <div>{r.title}</div>
          <div>{r.value}</div>
          <div>
            <span className={badge(r.level)}>{r.level}</span>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* header-box 그대로 */}
      <div className="header-box">
        <img id="site-guard-icon" src="/icons/site-guard-icon.png" alt="siteguard-icons" />
        <div>
          <h2 className="header-title">SiteGuard</h2>
          <h6 className="header-title">
            SiteGuard는 사용 중인 웹사이트의 보안 위험 요소를 자동으로 분석하는 웹 보안 점검 서비스입니다.
          </h6>
        </div>
        <form className="search-box" onSubmit={onSubmitSearch} autoComplete="off">
          <input
            className="search-txt"
            type="text"
            placeholder="URL을 입력하세요 (예: https://example.com)"
            defaultValue={targetUrl}
          />
          <button className="search-btn" type="submit">
            <img className="search_icon" src="/icons/search_icon.png" alt="검색 아이콘" />
          </button>
        </form>
      </div>

      <main className="container" aria-live="polite">
        {/* 상단 경로 라인 (id 유지) */}
        <div className="meta-line">
          <div>SiteGuard 상세 보안 리포트 페이지</div>
          <div>|</div>
          <div className="path" id="rptUrl">
            {targetUrl || '-'}
          </div>
        </div>

        {/* 점수 박스/게이지 (id/class 유지) */}
        <section className="score-box">
          <div className="gauge" id="gauge" style={gaugeStyle} aria-label="보안 점수 게이지">
            <div className="gauge-content">
              <div className={`score-chip ${score != null ? scoreLevel : ''}`} aria-live="polite">
                <span id="scoreText">{score ?? '--'}</span>
                <span className="unit">/100</span>
              </div>
            </div>
          </div>

          <div className="score-info">
            <div className="big">
              종합 안전도 점수: <span id="scoreText2">{score ?? '--'}/100</span>
            </div>
            <div className={`verdict ${score != null ? scoreLevel : ''}`} id="verdict">
              {verdict}
            </div>
            <div className="final-note" id="finalNote">
              {finalNote}
            </div>
          </div>
        </section>

        {/* 표들 (id는 tableBasic/tableVuln/tableExtra 그대로 존재시키고, 내부는 React로 렌더) */}
        <h2 className="section-title">기본 보안 구성 점검</h2>
        <div id="tableBasic">{renderTable(basicRows)}</div>

        <h2 className="section-title">취약점 점검 결과</h2>
        <div id="tableVuln">{renderTable(vulnRows)}</div>

        <h2 className="section-title">추가 분석</h2>
        <div id="tableExtra">{renderTable(extraRows)}</div>

        {/* 분석 요약 (HTML 그대로 넣을 수 있게) */}
        <h2 className="section-title with-line">분석 요약</h2>
        <div id="summary" dangerouslySetInnerHTML={{ __html: summaryHTML }} />

        {/* 분석 기준 및 기술 */}
        <h2 className="section-title with-line">분석 기준 및 기술</h2>
        <div id="methodology">
          <div id="tools">분석 도구: {methodology.tools}</div>
          <div id="analyzedAt">분석 시점: {methodology.analyzedAt}</div>
          <div id="analysisType">검사 유형: {methodology.analysisType}</div>
        </div>
      </main>

      <div className="footer-box"></div>
    </>
  )
}
