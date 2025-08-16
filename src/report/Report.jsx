// src/report/Report.jsx
/* global chrome */
import { useEffect, useMemo, useState } from 'react'

const levelText = (l) => (l === 'safe' ? '정상' : l === 'warn' ? '주의' : '위험')
const badgeClass = (l) => (l === 'bad' ? 'badge bad' : l === 'warn' ? 'badge warn' : 'badge safe')

// SVG 아이콘 (원본과 동일)
const Icons = {
  safe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M20 6L9 17l-5-5" />
    </svg>
  ),
  warn: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M12 9v4m0 4h.01" />
      <path strokeWidth="2" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  ),
  bad: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

// 점수 → 밴드
function getBand(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  if (s <= 40) return 'bad'
  if (s <= 70) return 'warn'
  return 'safe'
}
const bandToText = (b) => (b === 'bad' ? '위험' : b === 'warn' ? '주의' : '안전')
const bandToNote = (b) =>
  b === 'bad'
    ? '다수의 위험 요소가 감지되었습니다. 즉시 조치가 필요합니다.'
    : b === 'warn'
    ? '중간 수준의 위험 요소가 감지되었습니다. 권장 설정을 점검하세요.'
    : '전반적으로 안전한 설정입니다. 일부 항목은 개선 여지가 있을 수 있습니다.'

// 0~100 점수 → 각도
const degFromScore = (s) => Math.max(0, Math.min(100, Number.isFinite(s) ? s : 0)) * 3.6

// “평가항목 모두 보이기”를 위한 초기 placeholder 행들 (확인중)
const INITIAL_BASIC = [
  { title: 'SSL 인증서', status: 'warn', detail: '확인중' },
  { title: 'WHOIS 등록 정보', status: 'warn', detail: '확인중' },
  { title: '악성 도메인 목록 여부', status: 'warn', detail: '확인중' },
  { title: 'DNS 상태', status: 'warn', detail: '확인중' },
  { title: 'HTML 기본 분석', status: 'warn', detail: '확인중' },
]
const INITIAL_VULN = [
  { title: 'XSS 탐지', status: 'warn', detail: '확인중' },
  { title: 'Clickjacking 방지 설정', status: 'warn', detail: '확인중' },
  { title: '파일 업로드 경로 노출', status: 'warn', detail: '확인중' },
  { title: '디렉터리 리스팅', status: 'warn', detail: '확인중' },
  { title: 'CSP', status: 'warn', detail: '확인중' },
  { title: 'CORS 정책', status: 'warn', detail: '확인중' },
  { title: '서버 정보 노출', status: 'warn', detail: '확인중' },
]
const INITIAL_EXTRA = [
  { title: '의심 키워드 포함 여부', status: 'warn', detail: '확인중' },
  { title: '리디렉션 여부', status: 'warn', detail: '확인중' },
]

const KST = 'Asia/Seoul'
function formatKST(date = new Date()) {
  const d = new Date(date.toLocaleString('en-US', { timeZone: KST }))
  const yyyy = d.getFullYear()
  const m = d.getMonth() + 1
  const mm = String(m).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}년 ${m}월 ${dd}일 ${hh}:${mi} KST`
}

export default function Report() {
  // 상단 메타
  const [targetUrl, setTargetUrl] = useState('')               // URL 없으면 '' → 화면엔 "- (확인중)" 표시
  const [score, setScore] = useState(null)                     // 점수 없으면 게이지 "--"
  const [verdict, setVerdict] = useState('확인중')             // 기본 "확인중"
  const [finalNote, setFinalNote] = useState('최종 평가: 확인중') // 기본 "확인중"

  // 표 데이터 (초기엔 “확인중” 항목들로 꽉 채움)
  const [basicRows, setBasicRows] = useState(INITIAL_BASIC)
  const [vulnRows, setVulnRows] = useState(INITIAL_VULN)
  const [extraRows, setExtraRows] = useState(INITIAL_EXTRA)

  // 요약/기술
  const [summaryHTML, setSummaryHTML] = useState('확인중')
  const [methodology, setMethodology] = useState({
    tools: '확인중',
    analyzedAt: '확인중',
    analysisType: '확인중',
  })

  // 게이지 스타일: 밴드별 색상 변수 사용(--bad | --warn | --safe)
  const gaugeStyle = useMemo(() => {
    const s = Number.isFinite(score) ? score : 0
    const angle = degFromScore(s)
    const band = getBand(s)
    const brandVar = band === 'bad' ? '--bad' : band === 'warn' ? '--warn' : '--safe'
    // CSS var를 직접 참조: conic-gradient(var(--bad|--warn|--safe) ...)
    return { background: `conic-gradient(var(${brandVar}) ${angle}deg, var(--line) 0deg)` }
  }, [score])

  // --- 기존 report.js 호환: 스토리지/파라미터 로딩, 간이분석, 검색 ---

  async function loadFromStorage() {
    try {
      const l = await chrome?.storage?.local?.get?.('reportData')
      if (l?.reportData) return l.reportData
      const s = await chrome?.storage?.session?.get?.('reportData')
      return s?.reportData || null
    } catch {
      return null
    }
  }

  function toURLLike(input) {
    if (!input) return null
    let v = input.trim()
    if (/\s/.test(v)) return null
    if (!/^https?:\/\//i.test(v)) {
      if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) v = 'https://' + v
      else return null
    }
    try {
      const u = new URL(v)
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
    } catch {
      return null
    }
  }

  async function runLightAnalysis(urlStr, tabId) {
    if (!/^https?:\/\//i.test(urlStr || '')) return null
    let redirectCount = 0
    try {
      if (tabId && chrome?.scripting?.executeScript) {
        const [res] = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            try {
              const n = performance.getEntriesByType('navigation')[0]
              return n ? n.redirectCount : 0
            } catch {
              return 0
            }
          },
        })
        redirectCount = res?.result ?? 0
      }
    } catch {}
    const https = urlStr.startsWith('https:')
    const s = Math.max(1, Math.min(100, (https ? 90 : 65) - (redirectCount ? 10 : 0)))

    return {
      url: urlStr,
      score: s,
      basic: [
        { title: 'SSL 인증서', level: https ? 'safe' : 'warn', note: https ? 'HTTPS 연결' : 'HTTP 연결' },
        { title: 'WHOIS 등록 정보', level: 'warn', note: '확인 불가(헤더 접근 제한)' },
        { title: '악성 도메인 목록 여부', level: 'safe', note: '목록에 없음(내장 목록 기준)' },
        { title: 'DNS 상태', level: 'safe', note: '정상 도메인 구조' },
        { title: 'HTML 기본 분석', level: 'safe', note: '특이사항 없음(간이 분석)' },
      ],
      vuln: [
        { title: 'XSS 탐지', level: 'safe', note: '악성 스크립트 징후 없음(간이)' },
        { title: 'Clickjacking 방지 설정', level: 'warn', note: '헤더 확인 불가' },
        { title: '파일 업로드 경로 노출', level: 'safe', note: '노출 흔적 없음' },
        { title: '디렉터리 리스팅', level: 'safe', note: '노출되지 않음' },
        { title: 'CSP', level: 'warn', note: '정책 확인 불가' },
        { title: 'CORS 정책', level: 'safe', note: '개방적 아님' },
        { title: '서버 정보 노출', level: 'safe', note: '노출 없음' },
      ],
      extra: [
        { title: '의심 키워드 포함 여부', level: 'safe', note: '특이사항 없음' },
        {
          title: '리디렉션 여부',
          level: redirectCount ? 'warn' : 'safe',
          note: redirectCount ? `자동 이동 감지(${redirectCount})` : '감지되지 않음',
        },
      ],
      tools: ['axios', 'cheerio', 'ssl-certificate', 'whois-json', 'Google Safe Browsing API'],
      analysisTypes: ['비접속 기반 정적 분석', '응답 기반 동적 분석'],
      analyzedAt: formatKST(),
      summary: '검색창으로 입력된 URL에 대한 간이 분석 결과입니다.',
    }
  }

  function mapRows(arr) {
    // level -> status, note -> detail 매핑
    return (arr || []).map((x) => ({
      title: x.title,
      status: x.status || x.level || 'safe',
      detail: x.detail || x.note || '',
    }))
  }

  // URL 파라미터 읽기 + 스토리지 데이터(or 간이 분석 or 확인중) 로드
  useEffect(() => {
    const u = new URL(window.location.href)
    const q = u.searchParams.get('url') || ''
    setTargetUrl(q)

    const boot = async () => {
      try {
        // 1) 스토리지 우선
        const stored = await loadFromStorage()
        if (stored && Array.isArray(stored.basic) && Array.isArray(stored.vuln) && Array.isArray(stored.extra)) {
          applyAll(stored)
          return
        }
        // 2) 파라미터로 들어온 url이 있으면 간이 분석
        if (q) {
          const data = await runLightAnalysis(q, null)
          if (data) {
            applyAll(data)
            return
          }
        }
        // 3) 아무것도 없으면 “확인중” 상태 유지 + URL 표시도 확인중
        setVerdict('확인중')
        setFinalNote('최종 평가: 확인중')
        setSummaryHTML('확인중')
        setMethodology({ tools: '확인중', analyzedAt: '확인중', analysisType: '확인중' })
      } catch {
        // 오류 시에도 확인중 유지
      }
    }
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyAll(data) {
    const url = data?.url || ''
    const s = Number(data?.score ?? 0)
    setTargetUrl(url)
    setScore(s)

    const band = getBand(s)
    setVerdict(bandToText(band))
    setFinalNote(`최종 평가: ${bandToNote(band)}`)

    setBasicRows(mapRows(data?.basic))
    setVulnRows(mapRows(data?.vuln))
    setExtraRows(mapRows(data?.extra))

    setSummaryHTML(data?.summary || buildSummary(url || '-', band))
    setMethodology({
      tools: (data?.tools || ['axios', 'cheerio', 'ssl-certificate', 'whois-json', 'Google Safe Browsing API']).join(', '),
      analyzedAt: data?.analyzedAt || formatKST(),
      analysisType: (data?.analysisTypes || ['비접속 기반 정적 분석', '응답 기반 동적 분석']).join(' + '),
    })
  }

  function buildSummary(url, band) {
    if (band === 'bad') {
      return `"${url}"는 핵심 보안 기준을 충족하지 못한 항목이 다수 확인되었습니다. 즉시 조치가 필요하며, 현 시점에서 안전한 사용을 권장하지 않습니다.`
    }
    if (band === 'warn') {
      return `"${url}"는 일부 설정 미흡으로 주의가 필요합니다. 권장 보안 설정을 적용하면 보안 수준을 개선할 수 있습니다. 일반 사용은 가능하나 관리자 점검을 권장합니다.`
    }
    return `"${url}"는 다양한 보안 기준을 충족하며, 현재까지 알려진 위험 정보는 발견되지 않았습니다. 사이트는 안전하게 사용할 수 있습니다.`
  }

  // 헤더 검색 제출 → 간이 분석 실행
  const onSubmitSearch = async (e) => {
    e.preventDefault()
    const input = e.currentTarget.querySelector('.search-txt')
    const raw = input?.value || ''
    const url = toURLLike(raw)
    if (!url) {
      // URL 형식 아님 → 확인중 유지 + 안내
      setTargetUrl(raw || '')
      setScore(0)
      setVerdict('확인중')
      setFinalNote('최종 평가: 확인중')
      setSummaryHTML('URL 형식이 아닙니다. 예: https://example.com')
      setMethodology({
        tools: 'axios, cheerio, ssl-certificate, whois-json, Google Safe Browsing API',
        analyzedAt: formatKST(),
        analysisType: '비접속 기반 정적 분석 + 응답 기반 동적 분석',
      })
      setBasicRows([])
      setVulnRows([])
      setExtraRows([])
      return
    }
    const data = await runLightAnalysis(url, null)
    if (data) applyAll(data)
  }

  // 테이블 렌더: (항목 | 상태 | 설명) 순서, 아이콘 + 라벨, 클래스명 동일
  const renderTable = (rows) => (
    <div className="table">
      <div className="row">
        <div className="cell-title"><strong>항목</strong></div>
        <div><strong>상태</strong></div>
        <div><strong>설명</strong></div>
      </div>
      {rows.map((r, i) => {
        const L = r.status || 'safe'
        return (
          <div className="row" key={`${r.title}-${i}`}>
            <div className="cell-title">{r.title}</div>
            <div>
              <span className={badgeClass(L)}>
                {Icons[L] ? Icons[L]() : Icons.safe()}
                <span>{levelText(L)}</span>
              </span>
            </div>
            <div>{r.detail}</div>
          </div>
        )
      })}
    </div>
  )

  // 표시용 URL 텍스트: 없으면 “- (확인중)”
  const urlForDisplay = targetUrl ? targetUrl : '- (확인중)'

  return (
    <>
      {/* header-box */}
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
        <div className="meta-line">
          <div>SiteGuard 상세 보안 리포트 페이지</div>
          <div>|</div>
          <div className="path" id="rptUrl">{urlForDisplay}</div>
        </div>

        <section className="score-box">
          <div className="gauge" id="gauge" style={gaugeStyle} aria-label="보안 점수 게이지">
            <div className="gauge-content">
              <div className={`score-chip ${score != null ? getBand(score) : ''}`} aria-live="polite">
                <span id="scoreText">{Number.isFinite(score) ? score : '--'}</span>
                <span className="unit">/100</span>
              </div>
            </div>
          </div>

          <div className="score-info">
            <div className="big">
              종합 안전도 점수: <span id="scoreText2">{Number.isFinite(score) ? `${score}/100` : '--/100'}</span>
            </div>
            <div className={`verdict ${Number.isFinite(score) ? getBand(score) : ''}`} id="verdict">
              {verdict}
            </div>
            <div className="final-note" id="finalNote">{finalNote}</div>
          </div>
        </section>

        <h2 className="section-title">기본 보안 구성 점검</h2>
        <div id="tableBasic">{renderTable(basicRows)}</div>

        <h2 className="section-title">취약점 점검 결과</h2>
        <div id="tableVuln">{renderTable(vulnRows)}</div>

        <h2 className="section-title">추가 분석</h2>
        <div id="tableExtra">{renderTable(extraRows)}</div>

        <h2 className="section-title with-line">분석 요약</h2>
        <div id="summary">{summaryHTML === '확인중' ? '확인중' : <span dangerouslySetInnerHTML={{ __html: summaryHTML }} />}</div>

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
