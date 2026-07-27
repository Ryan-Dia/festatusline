# festatusline

[English](./README.md) | **한국어**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![i18n](https://img.shields.io/badge/i18n-ko%20%7C%20en%20%7C%20zh-orange)](./README.md)

> Claude Code 상태바(statusline) 도구. 다국어(ko/en/zh), 5종 테마, 7종 프리셋, 22개 위젯, Codex CLI 통합을 지원합니다.

[ccstatusline](https://github.com/sirmalloc/ccstatusline) 을 참고한 파생 버전입니다.

---

## ✨ 주요 특징

- **다국어 지원** — 한국어·영어·중국어를 `FESTATUSLINE_LOCALE` 또는 `$LANG` 으로 자동 감지
- **5종 테마 내장** — default, dracula, nord, gruvbox, tokyo-night
- **22개 위젯** — Claude 사용량, Codex CLI, Git 정보, 피크 시간, 세션 비용, 캐시 통계
- **Codex CLI 통합** — `~/.codex` 파싱으로 GPT 요청 수·레이트 리밋·모델 표시
- **7종 프리셋 + 인터랙티브 셋업** — `/festatusline:setup` 으로 제로 설정 완료
- **Node ≥18 전용** — Bun API 미사용

---

## 🚀 빠른 시작

**Claude Code 플러그인으로 설치:**

```
/plugin install festatusline
```

**인터랙티브 셋업** (프리셋·테마·언어 선택 → statusLine 자동 등록):

```
/festatusline:setup
```

**플러그인 업그레이드 후** 경로 갱신:

```
/plugin update festatusline
/festatusline:update
```

셋업 후 `~/.claude/settings.json` 에 기록되는 내용:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/plugins/cache/festatusline/festatusline/<version>/dist/cli.js",
    "refreshIntervalMs": 60000
  }
}
```

---

## 🎨 데모

```
Daily   │ Ctx ■■■■■■■■■■  23% (47K/200K)  │ Session ■■■■■■■■■■  30% (3h 41m)
Weekly  │ 7d ■■■■■■■■■■  25% (4d 0h)
Codex   │ 7d ■■■■■■■■■■  10% (1d 1h)

⚡74% │ ⏱ 1h 0m │ $0.0042
Sonnet 4.6 [high] │ 📁 festatusline(main)
```

실제 출력에는 트루컬러 ANSI 색상이 적용됩니다 (밝음/어두움 바, 강조 텍스트). 프리셋과 로케일에 따라 결과가 달라집니다.

---

## ⚙️ 설정

설정 파일 경로: `~/.config/festatusline/settings.json` (`$XDG_CONFIG_HOME` 환경변수 적용)

```jsonc
{
  "lines": [
    [{ "id": "dailyUsage" }, { "id": "context" }],
    [{ "id": "weeklyUsage" }, { "id": "weeklyRateLimit" }],
    [{ "id": "model" }, { "id": "claudePeak" }, { "id": "gitRepo" }]
  ],
  "theme": "default",
  "locale": "ko",
  "weeklyAnchorDay": null,
  "separator": " │ "
}
```

`lines` 는 행(row) 배열 — 각 행이 독립된 stdout 줄로 출력됩니다.  
위젯 항목에 `"color": "#hexcode"` 를 추가하면 색상을 개별 오버라이드할 수 있습니다.

직접 파일을 편집하거나 Claude Code 에서 `/festatusline:setup` 으로 재설정할 수 있습니다.

---

## 🧩 위젯

### Claude (15개)

| id | 출력 예시 | 설명 |
|---|---|---|
| `model` | `Sonnet 4.6` / `Sonnet 4.6 [high]` | 현재 모델명(축약). 노력 레벨이 보통이 아니면 괄호로 표시. |
| `context` | `Ctx ■■□□□□□□□□  23% (47K/200K)` | 컨텍스트 창 바 + 비율 + 토큰 수 |
| `sessionRateLimit` | `Now ■■■□□□□□□□  30% (3h 41m)` | 현재 세션(약 5시간 롤링) 사용량 바 + 리셋까지 남은 시간 |
| `weeklyRateLimit` | `7d ■■□□□□□□□□  25% (6d 10h)` | 7일 전체 모델 레이트 리밋 + 리셋까지 남은 시간 |
| `peakTime` | `22:00–05:00` | 최근 14일 기준 피크 사용 시간대 (jsonl 이력 분석) |
| `dailyUsage` | `Daily  ` | 오늘 사용량용 레이블 (다른 위젯과 함께 배치) |
| `dailyReset` | `↺ 04:32` | 자정 기준 일간 리셋까지 카운트다운 |
| `weeklyUsage` | `Weekly ` | 주간 사용량용 레이블 |
| `weeklyReset` | `↺ 2d 3h` | 주간 리셋 앵커까지 카운트다운 |
| `sonnetWeeklyUsage` | `S:42K` / `S:1.3M` | 이번 주 Sonnet 모델 누적 토큰 수 |
| `sonnetWeeklyReset` | `S↺ 2d 3h` | Sonnet 주간 리셋까지 카운트다운 |
| `claudePeak` | `🔴 Peak (1h 30m)` / `🟢 Off-Peak (8h 6m)` | KST 22:00–04:00 피크 창 (UTC 13:00–19:00) |
| `sessionCost` | `$0.0042` / `$1.23` | 세션 비용 (USD) |
| `cacheHit` | `⚡74%` | 캐시 히트율 (cache_read / 총 입력 토큰) |
| `cacheTtl` | `⏱ 1h 0m` | 캐시 TTL 잔여 시간 (ephemeral → 1h, 나머지 → 5m) |

### Codex (4개)

| id | 출력 예시 | 설명 |
|---|---|---|
| `gptUsage` | `GPT:12req` | 오늘 Codex CLI 요청 수 (`~/.codex/history.jsonl` 기반) |
| `codexModel` | `Codex  ` | Codex/GPT 행임을 나타내는 고정 라벨 |
| `codexWeeklyRateLimit` | `7d ■□□□□□□□□□  10% (1d 1h)` | Codex 7일 레이트 리밋 |

> `gptUsage`는 Codex CLI를 한 번이라도 사용하기 전까지 숨겨집니다. `codexModel`은 고정
> 라벨이라 처음 사용하기 전에도 Codex 행이 항상 표시됩니다.

### Git (2개)

| id | 출력 예시 | 설명 |
|---|---|---|
| `gitBranch` | `main` | 현재 작업 디렉터리의 브랜치 |
| `gitRepo` | `📁 festatusline(main)` | 리포지토리 이름 + 브랜치 합산 표시 |

### 레이아웃 (1개)

| id | 출력 예시 | 설명 |
|---|---|---|
| `spacer` | ` ` | 공백 하나 — `lines` 배열에서 행 간 시각적 여백으로 활용 |

---

## 🎨 테마

| 테마 | 강조색 | 비고 |
|---|---|---|
| `default` | `#89b4fa` | Catppuccin 계열, 구분자 `│` |
| `dracula` | `#bd93f9` | Dracula 팔레트 |
| `nord` | `#88c0d0` | Arctic Nord 계열 |
| `gruvbox` | `#83a598` | Gruvbox 따뜻한 색조 |
| `tokyo-night` | `#7aa2f7` | Tokyo Night 다크 테마 |

TUI 에서 테마를 바꾸거나 settings.json 의 `"theme"` 필드를 직접 수정할 수 있습니다.

---

## 📦 프리셋

| 프리셋 | 라인 수 | 주요 구성 |
|---|---|---|
| `lite` | 3 | `dailyUsage` + `context` / `weeklyUsage` + `weeklyRateLimit` / `model` + `claudePeak` + `gitRepo` |
| `plus` | 5 | lite + spacer + `cacheHit`, `cacheTtl`, `sessionCost` 행 추가 |
| `pro` | 6 | plus + Codex 행(`codexModel`, `codexWeeklyRateLimit`) 추가 |

Claude Code 에서 `/festatusline:setup` 으로 적용할 수 있습니다.

---

## 🌏 다국어

지원 로케일: `ko`(한국어), `en`(영어), `zh`(중국어)

**감지 우선순위:**

1. `FESTATUSLINE_LOCALE` 환경변수 (`ko` | `en` | `zh`)
2. `$LANG` 접두 — `ko*` → 한국어, `zh*` → 중국어
3. 설정 파일의 `locale` 필드
4. 최종 폴백: `en`

`FESTATUSLINE_LOCALE` 는 설정 파일보다 항상 우선합니다.

---

## 🔧 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `FESTATUSLINE_LOCALE` | — | 로케일 강제 지정 (`ko` / `en` / `zh`) |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Claude 데이터 디렉터리 위치 변경 |
| `CODEX_CONFIG_DIR` | `~/.codex` | Codex 데이터 디렉터리 위치 변경 |
| `XDG_CONFIG_HOME` | `~/.config` | 설정 파일 기준 경로 |
| `XDG_CACHE_HOME` | `~/.cache` | 캐시 파일 기준 경로 |
| `LANG` | — | 시스템 로케일 — 자동 감지 폴백 |

---

## 라이선스

MIT © 2026 [Cheol Won](https://github.com/ryan-dia)

[ccstatusline](https://github.com/sirmalloc/ccstatusline) (sirmalloc) 에서 영감을 받았습니다.
