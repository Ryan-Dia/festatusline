# festatusline

[English](./README.md) | **한국어**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![i18n](https://img.shields.io/badge/i18n-ko%20%7C%20en%20%7C%20zh-orange)](./README.md)

> Claude Code 상태바(statusline) 도구. 다국어(ko/en/zh), 5종 테마, 7종 프리셋, 26개 위젯, Codex CLI 통합을 지원합니다.

[ccstatusline](https://github.com/sirmalloc/ccstatusline) 을 참고한 파생 버전입니다.

---

## ✨ 주요 특징

- **다국어 지원** — 한국어·영어·중국어를 `FESTATUSLINE_LOCALE` 또는 `$LANG` 으로 자동 감지
- **5종 테마 내장** — default, dracula, nord, gruvbox, tokyo-night
- **26개 위젯** — Claude 사용량, Codex CLI, Git 정보, 세션 비용, 캐시 통계
- **Codex CLI 통합** — `~/.codex` 파싱으로 GPT 요청 수·레이트 리밋·모델 표시
- **7종 프리셋 + 인터랙티브 셋업** — `/festatusline:setup` 으로 제로 설정 완료
- **Node ≥18 전용** — Bun API 미사용

---

## 🚀 빠른 시작

**1. 마켓플레이스 등록** (최초 1회 — festatusline은 Claude 공식 플러그인 카탈로그에 없습니다):

```
/plugin marketplace add Ryan-Dia/festatusline
```

**2. 플러그인 설치:**

```
/plugin install festatusline@festatusline
```

**3. 인터랙티브 셋업** (프리셋·테마·언어 선택 → statusLine 자동 등록):

```
/festatusline:setup
```

**플러그인 업그레이드 후**, 아래 명령만 실행하세요:

```
/festatusline:update
```

마켓플레이스 갱신, 플러그인 업데이트, `statusLine` 을 최신 캐시 버전으로 다시 가리키는 것까지
한 번에 처리합니다 — `/plugin` 명령을 따로 실행할 필요가 없습니다.

이후 Claude Code(또는 터미널 세션)를 재시작하세요 — statusLine 커맨드는 세션 시작 시
한 번만 읽어옵니다.

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
Daily   │ Ctx ■■■■■■■■■■  38% (75K/200K)  │ Session ■■■■■■■■■■  30% (3h 0m)
Weekly  │ all ■■■■■■■■■■  25% (4d 0h)     │ Fable   ■■■■■■■■■■  89% (4d 0h)
Codex   │ 7d  ■■■■■■■■■■  10% (1d 0h)

⚡70% │ ⏱ 30m │ $0.420
Opus 5 [high] │ 📁 festatusline(main)
```

Codex 행을 추가한 `max` 프리셋 기준입니다. 실제 출력에는 트루컬러 ANSI 색상이 적용됩니다 — 채운
칸과 빈 칸이 같은 `■` 문자에 밝기만 다르게 표시되므로, 색을 벗기면 바가 꽉 찬 것처럼 보입니다.
프리셋, Codex 포함 여부, 로케일에 따라 결과가 달라집니다.

`Fable` 바는 Fable 한도 데이터를 가져올 수 있을 때만 나타납니다. 가져올 수 없는 환경
([위젯](#-위젯) 섹션의 플랫폼 주의 참고)에서는 주간 행이 `all` 하나로만 표시되고 나머지는
그대로입니다.

---

## ⚙️ 설정

설정 파일 경로: `~/.config/festatusline/settings.json` (`$XDG_CONFIG_HOME` 환경변수 적용)

셋업은 전개된 위젯 목록이 아니라 **어떤 프리셋을 골랐는지**를 기록합니다:

```jsonc
{
  "preset": "pro",
  "codexRow": true,
  "theme": "default",
  "locale": "ko",
  "weeklyAnchorDay": null,
  "separator": " │ "
}
```

덕분에 프리셋에 위젯이 추가된 릴리스가 나오면 `/festatusline:update` 만으로 반영됩니다 — 셋업을
다시 돌리거나 이 파일을 고칠 필요가 없습니다. 0.6.0 이전에 만들어진 설정은 전개된 목록을 저장했는데,
그 목록이 원래 프리셋과 그대로 일치하면 자동으로 인식되어 똑같이 업데이트를 따라갑니다.

레이아웃을 고정하고 싶으면 `lines` 를 쓰면 됩니다 — 행(row) 배열이고 각 행이 독립된 stdout 줄로
출력됩니다. `lines` 는 항상 `preset` 보다 우선하므로, 직접 손본 레이아웃을 업데이트가 건드리는 일은
없습니다 (위젯 편집기가 이 형식으로 저장합니다):

```jsonc
{
  "lines": [
    [{ "id": "dailyUsage" }, { "id": "context" }],
    [{ "id": "weeklyUsage" }, { "id": "weeklyRateLimit" }],
    [{ "id": "model" }, { "id": "gitRepo" }]
  ],
  "theme": "default"
}
```

위젯 항목에 `"color": "#hexcode"` 를 추가하면 색상을 개별 오버라이드할 수 있습니다.

직접 파일을 편집하거나 Claude Code 에서 `/festatusline:setup` 으로 재설정할 수 있습니다.

---

## 🧩 위젯

### Claude (19개)

| id | 출력 예시 | 설명 |
|---|---|---|
| `model` | `Sonnet 4.6` / `Opus 5 [xhigh, fast]` | 현재 모델명(축약). 세션 플래그를 덧붙임 — effort 레벨, 패스트 모드면 `fast`, thinking 을 명시적으로 끈 경우 `no-think`. |
| `context` | `Ctx ■■□□□□□□□□  23% (47K/200K)` | 컨텍스트 창 바 + 비율 + 토큰 수 |
| `sessionRateLimit` | `Session ■■■□□□□□□□  30% (3h 41m)` | 현재 세션(약 5시간 롤링) 사용량 바 + 리셋까지 남은 시간 |
| `weeklyRateLimit` | `all ■■□□□□□□□□  25% (6d 10h)` | 7일 전체 모델 레이트 리밋 + 리셋까지 남은 시간 |
| `dailyUsage` | `Daily  ` | 오늘 사용량용 레이블 (다른 위젯과 함께 배치) |
| `dailyReset` | `↺ 04:32` | 자정 기준 일간 리셋까지 카운트다운 |
| `weeklyUsage` | `Weekly ` | 주간 사용량용 레이블 |
| `weeklyReset` | `↺ 2d 3h` | 주간 리셋 앵커까지 카운트다운 |
| `sonnetWeeklyUsage` | `S:42K` / `S:1.3M` | 이번 주 Sonnet 모델 누적 토큰 수 |
| `sonnetWeeklyReset` | `S↺ 2d 3h` | Sonnet 주간 리셋까지 카운트다운 |
| `fableWeeklyUsage` | `F:42K` / `F:1.3M` | 이번 주 Fable 모델 누적 토큰 수 |
| `fableWeeklyReset` | `F↺ 2d 3h` | Fable 주간 리셋까지 카운트다운 |
| `fableWeeklyRateLimit` | `Fable   ■■■■■■■■□□  89% (4d 2h)` | Fable 전용 주간 한도. Anthropic OAuth 사용량 API 조회. 데이터를 못 받으면 숨김 |
| `sessionCost` | `$0.0042` / `$1.23` | 세션 비용 (USD) |
| `cacheHit` | `⚡74%` | 캐시 히트율 (cache_read / 총 입력 토큰) |
| `cacheTtl` | `⏱ 1h 0m` | 캐시 TTL 잔여 시간 (ephemeral → 1h, 나머지 → 5m) |
| `modelMix` | `Opus 78% · Sonnet 22%` | 이번 주 사용량의 모델 계열별 비중 (`/usage` 와 동일한 가중치) |
| `fastMode` | `»fast` | 패스트 모드가 켜져 있을 때만 표시 (`model` 플래그의 단독 버전) |
| `linesChanged` | `+156/-23` | 이번 세션에서 추가/삭제된 줄 수 |

> **모델별 주간 한도는 statusline stdin 페이로드에 없습니다.** `rate_limits.five_hour` 와
> `rate_limits.seven_day` 만 계정 전체 값으로 실려 옵니다. `fableWeeklyRateLimit` 은
> [Orca](https://github.com/stablyai/orca) 클라이언트와 같은 방식으로 이 제약을 우회합니다 —
> Claude Code 가 `~/.claude/.credentials.json` 에 저장해둔 OAuth 액세스 토큰을 그대로 읽어서,
> `/usage` 와 CLI 자체가 쓰는 것과 동일한 Anthropic 내부(비공식) 엔드포인트
> `https://api.anthropic.com/api/oauth/usage` 를 직접 호출합니다. 아직 Opus·Sonnet 용은
> 없습니다 — 지금까지 역공학된 건 Fable 뿐입니다.
>
> 같은 엔드포인트 응답에는 `five_hour`/`seven_day` 도 함께 들어있어서, `sessionRateLimit` 과
> `weeklyRateLimit` 도 이걸 씁니다. stdin 값은 이 세션이 마지막으로 실제 API 를 호출했을 때의
> 스냅샷이라 그 순간엔 정확하지만, Claude Code 가 유휴 중에도 그 스냅샷을 그대로 계속 보내기
> 때문에 다른 기기에서 소모한 양은 절대 반영되지 않습니다. 두 소스 모두 "언제 찍힌 값인지"
> 타임스탬프가 없어서, 소스에 순위를 매기는 대신 **스냅샷 자체의 신선도**를 비교합니다: 같은
> 리셋 윈도우 안에서 사용률은 오르기만 하므로 더 높은 % 가 더 최신값이고, 윈도우가 다르면 더
> 늦은 `resets_at` 이 최신이며, 완전히 같으면 stdin 을 씁니다. 결과적으로 메시지를 보낸 직후엔
> stdin 이, 가만히 있는 동안엔 OAuth 가 이깁니다. 이 엔드포인트는 공개용이 아니고 렌더마다
> 두들겨서는 안 되므로, 세 값을 한 번에 조회해서 디스크(`~/.cache/festatusline/`)에 5분 TTL 로
> 캐싱하고, 실패하면 1분간 재시도를 멈추며(오프라인에서 매 렌더가 멈추지 않도록), 그동안은
> 마지막 성공값을 그대로 보여줍니다.
>
> **플랫폼 주의:** 토큰은 `~/.claude/.credentials.json` 에서 읽는데, 이건 Linux·WSL·Windows 의
> 저장 위치입니다. macOS 에서는 Claude Code 가 Keychain 에 저장하므로 현재 OAuth 계층이 동작하지
> 않습니다 — `fableWeeklyRateLimit` 은 표시되지 않고, `sessionRateLimit`/`weeklyRateLimit` 은
> 이 기능 이전과 완전히 동일하게 동작합니다. Node 의 `fetch` 는 `HTTPS_PROXY` 도 읽지 않아서
> 사내 프록시 환경에서도 같은 방식으로 조용히 비활성화됩니다.

> `modelMix` 는 Claude Code 의 `/usage` 와 같은 가중치를 씁니다 — 캐시 읽기를 1 로 두고
> 캐시 미스 입력 10배, 캐시 쓰기 12.5배, 출력 50배에 모델 계열 배수(Fable 10, Opus 5,
> Sonnet 3, Haiku 1)를 곱합니다. 가중치가 붙은 값은 다른 가중치 값과 비교할 때만 의미가
> 있어 비율로만 표시합니다. `sonnetWeeklyUsage`, `fableWeeklyUsage` 같은 원시 토큰 위젯은
> 그대로 둡니다.


> `model` 위젯의 effort 라벨은 페이로드의 `effort.level` 을 쓰고, 없으면 Claude Code 가
> statusline 프로세스에 넘겨주는 `CLAUDE_EFFORT` 환경변수로 폴백합니다(같은 값이라, 페이로드
> 파싱이 실패한 경우에만 의미가 있습니다). `~/.claude/settings.json` 의 `effortLevel` 은
> **의도적으로 보지 않습니다** — 세션 중 `/effort` 변경과 모델별 `modelSettings` 오버라이드를
> 반영하지 못해서, 실제로 돌고 있지 않은 레벨을 표시합니다. ultracode 는 탐지 자체가
> 불가능합니다: Claude Code 가 모든 경로에서 `xhigh` 로 보고하므로, 설정 파일에
> `ultracode: true` 를 박은 경우만 구분됩니다.

### Codex (3개)

| id | 출력 예시 | 설명 |
|---|---|---|
| `gptUsage` | `GPT:12req` | 오늘 Codex CLI 요청 수 (`~/.codex/history.jsonl` 기반) |
| `codexModel` | `Codex  ` | Codex/GPT 행임을 나타내는 고정 라벨 |
| `codexWeeklyRateLimit` | `7d  ■□□□□□□□□□  10% (1d 1h)` | Codex 7일 레이트 리밋 |

> `gptUsage`는 Codex CLI를 한 번이라도 사용하기 전까지 숨겨집니다. `codexModel`은 고정
> 라벨이라 처음 사용하기 전에도 Codex 행이 항상 표시됩니다.

### Git (3개)

| id | 출력 예시 | 설명 |
|---|---|---|
| `gitBranch` | `main` | 현재 작업 디렉터리의 브랜치 |
| `gitRepo` | `📁 festatusline(main)` | 리포지토리 이름 + 브랜치 합산 표시. Claude Code 가 `workspace.repo` 를 넘겨주면 그 값을 쓰고, 없으면 `git rev-parse` 로 폴백. |
| `pr` | `PR #1234 ✓` / `MR !77 ✗` | 현재 브랜치의 열린 PR. GitLab 머지 리퀘스트는 `MR !번호` 로 표시 |

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
| `basic` | 2 | 일간 행 / 주간 행 |
| `pro` | 4 | basic + 개행 + `model` + `gitRepo` |
| `max` | 5 | pro + `cacheHit`, `cacheTtl`, `sessionCost` 행 |

일간 행은 `dailyUsage` + `context` + `sessionRateLimit`, 주간 행은
`weeklyUsage` + `weeklyRateLimit` + `fableWeeklyRateLimit` 이며, 각 열이 윗줄 열 아래에 오도록
폭이 맞춰져 있습니다. `Fable` 바는 데이터를 못 받는 환경에서 스스로 숨어 주간 행이 2열이 됩니다.

Claude Code 에서 `/festatusline:setup` 으로 적용할 수 있습니다. setup 마법사와 프리셋 메뉴 모두
커서가 놓인 프리셋의 실시간 미리보기를 보여줍니다 — 예시 사용량 수치에 현재 테마·로케일이
적용되므로, 고르기 전에 레이아웃을 확인할 수 있습니다.

어떤 프리셋이든 Codex 행(`codexModel` + `codexWeeklyRateLimit`)을 추가로 붙일 수 있으며, 주간 행
바로 아래에 삽입됩니다. setup 마법사에서 프리셋을 고른 다음 별도 단계로 물어보며, 특정 등급에
종속되지 않습니다.

`minimal`, `full`, `korean-dev`, `multi-cli` 는 프리셋 메뉴에는 남아 있지만 setup 마법사에는
나오지 않습니다.

---

## 🌏 다국어

지원 로케일: `ko`(한국어), `en`(영어), `zh`(중국어)

**감지 우선순위:**

1. `FESTATUSLINE_LOCALE` 환경변수 (`ko` | `en` | `zh`)
2. `$LANG` 접두 — `ko*` → 한국어, `zh*` → 중국어
3. 설정 파일의 `locale` 필드
4. 최종 폴백: `en`

`FESTATUSLINE_LOCALE` 는 설정 파일보다 항상 우선합니다.

로케일은 인터랙티브 TUI — 셋업 마법사 라벨, 메뉴, 프리셋 이름 — 에 적용됩니다. 상태바 출력에는
번역 문자열이 없으므로 위젯 출력은 어떤 로케일에서도 동일합니다.

---

## 🔧 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `FESTATUSLINE_LOCALE` | — | 로케일 강제 지정 (`ko` / `en` / `zh`) |
| `CLAUDE_EFFORT` | — | 사용자가 아니라 Claude Code 가 설정. 현재 세션의 effort 레벨 — 페이로드에 `effort.level` 이 없을 때만 폴백으로 사용 |
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Claude 데이터 디렉터리 위치 변경 |
| `CODEX_CONFIG_DIR` | `~/.codex` | Codex 데이터 디렉터리 위치 변경 |
| `XDG_CONFIG_HOME` | `~/.config` | 설정 파일 기준 경로 |
| `XDG_CACHE_HOME` | `~/.cache` | 캐시 파일 기준 경로 |
| `LANG` | — | 시스템 로케일 — 자동 감지 폴백 |

---

## 라이선스

MIT © 2026 [Cheol Won](https://github.com/ryan-dia)

[ccstatusline](https://github.com/sirmalloc/ccstatusline) (sirmalloc) 에서 영감을 받았습니다.
