# cwstatusline

Claude Code 용 상태바(statusline) 도구. [ccstatusline](https://github.com/sirmalloc/ccstatusline) 을 참고한 차별화 파생 버전.

## 차별 포인트

- **다국어(ko/en/zh)** 지원 — `FESTATUSLINE_LOCALE` 환경변수 또는 `$LANG` 자동 감지
- **테마 5종** 내장: default, dracula, nord, gruvbox, tokyo-night
- **한국 개발자 친화 위젯**: 일간/주간/Sonnet 주간 사용량 + 초기화 타이머
- **Codex CLI 사용량** 통합 (`~/.codex`)
- 런타임: Node.js ≥ 18 전용 (Bun 미사용)

## 기술 스택

- TypeScript + tsup (ESM 번들)
- Ink 5 + React 18 (TUI)
- zod (설정 스키마 검증)
- vitest (테스트)

## 주요 명령어

```bash
npm run build       # 빌드 (dist/)
npm run dev         # watch 모드
npm test            # vitest 단위 테스트
npm run typecheck   # 타입 검사

# 빌드 후 실행
cat test/data/sample-stdin.json | node dist/cli.js   # 렌더 모드 테스트
node dist/cli.js                                      # TUI 설정 화면
node dist/cli.js install                              # Claude Code 에 자동 등록
node dist/cli.js doctor                               # 데이터 경로 확인
```

## 디렉토리 구조

```
src/
├── cli.ts                 # 엔트리: stdin 감지 시 render, TTY 시 TUI
├── data/
│   ├── stdin.ts           # Claude Code stdin JSON 파싱 (zod)
│   ├── jsonl.ts           # ~/.claude/projects/**/*.jsonl 파싱 (mtime 캐시)
│   ├── usage.ts           # 일간/주간/Sonnet 주간 사용량 집계 (30s 캐시)
│   ├── reset.ts           # 일간/주간 리셋 카운트다운
│   ├── codex.ts           # ~/.codex 파싱 → GPT 사용량
│   ├── cache.ts           # TTL 캐시 유틸리티
│   ├── claude-settings.ts # ~/.claude/settings.json 파싱 (ultracode 플래그만)
│   ├── modelTier.ts       # 모델 계열 분류 + /usage 동일 가중치
│   └── time.ts            # 시간 유틸 (날짜 경계 계산)
├── widgets/               # 위젯 25종 + 레지스트리
├── utils/                 # 공통 유틸 (bar, duration, tokens)
├── render/                # 위젯 배열 → stdout 한 줄 문자열
├── i18n/                  # ko/en/zh 번들 + t() 헬퍼
├── config/                # zod 스키마, load/save, 프리셋, install/doctor
├── theme/                 # 테마 5종 팔레트
└── tui/                   # Ink 기반 대화형 설정 화면
```

## 설정 파일

- 설정: `~/.config/festatusline/settings.json`
- Claude 통합: `~/.claude/settings.json` 의 `statusLine` 필드

### 프리셋 추적 (0.6.0~)

- 셋업은 전개된 `lines` 가 아니라 **`preset` 이름 + `codexRow` 불리언**을 저장한다. 그래야
  프리셋에 위젯을 추가하는 릴리스가 기존 사용자에게 업데이트만으로 도달한다. 0.5.0 까지는
  전개 결과만 저장해서, 새 위젯이 아무에게도 안 갔다.
- 실제 렌더 행은 `resolveLines(settings)` (`config/presets.ts`) 가 결정한다. 우선순위:
  `lines`(직접 편집) > 레거시 지문 대조 > `preset` > 기본 프리셋(`minimal`).
- `lines` 는 **위젯 편집기로 직접 손봤을 때만** 기록된다. 기록되는 순간 `preset` 을 지워서,
  이후 릴리스가 직접 만든 레이아웃을 덮어쓰지 않게 한다.
- 0.6.0 이전 설정에는 `preset` 이 없다. `config/legacyPresets.ts` 가 **0.5.0 시점의 프리셋
  레이아웃 스냅샷**과 대조해서 일치하면 그 프리셋으로 간주한다. 이 표는 **역사적 스냅샷이라
  PRESETS 를 바꿔도 절대 같이 바꾸면 안 된다** — 바꾸면 옛 설정이 매칭에서 탈락한다.
  위젯에 `color` 오버라이드가 하나라도 있으면 프리셋 전개 시 색이 날아가므로 매칭을 포기한다.
- 렌더 경로에서 설정 파일을 **다시 쓰지 않는다.** 매 렌더가 새 프로세스라 동시 쓰기가 겹친다.
  레거시 대조는 읽기 전용으로 매번 수행한다.

## 배포

npm 에 발행하지 않는다. 배포 경로는 GitHub 플러그인 마켓플레이스이므로 **`dist/` 를 커밋해야
한다** (`.gitignore` 는 `dist/*.map` 만 제외). 버전은 네 파일 다섯 곳을 함께 올린다.

| 파일 | 위치 |
|---|---|
| `package.json` | `version` |
| `package-lock.json` | 최상위 `version` + `packages[""].version` |
| `.claude-plugin/plugin.json` | `version` |
| `.claude-plugin/marketplace.json` | `metadata.version` + top-level `version` |

버전을 올리지 않으면 사용자 쪽 `/plugin update` 가 "already at the latest version" 을 반환한다
— 플러그인 캐시가 `~/.claude/plugins/cache/festatusline/festatusline/<version>/` 로 버전별
디렉터리를 쓰기 때문이다.

### 릴리스 절차

1. 버전 4파일 5곳을 올린다 (위 표). 위젯 추가·동작 변경이면 minor, 버그 수정만이면 patch.
2. `CHANGELOG.md` 의 `## [Unreleased]` 를 `## [x.y.z] - YYYY-MM-DD` 로 확정하고 빈
   `## [Unreleased]` 를 위에 다시 만든다.
3. `npm run build` — `dist/` 는 커밋 대상이라 반드시 최신 상태로 만든다.
4. 커밋 2개로 나눈다 (기존 히스토리와 동일):
   - `feat:`/`fix:` — `src/`, `test/`, `README*.md`, `CLAUDE.md`
   - `chore: Release vX.Y.Z` — 버전 파일들 + `CHANGELOG.md` + `dist/`
   pre-commit 훅(lint-staged + eslint + vitest 전체)이 돌므로 실패하면 커밋이 통째로 롤백된다.
   특히 **지역변수는 camelCase 강제** — `five_hour` 같은 페이로드 키 이름을 그대로 변수로
   쓰면 `@typescript-eslint/naming-convention` 에 걸린다.
5. **annotated** 태그를 만든다: `git tag -a vX.Y.Z -F -` (기존 태그가 전부 annotated).
6. `git push origin main` + `git push origin vX.Y.Z`.
7. **`gh release create vX.Y.Z --verify-tag --latest --notes-file -`** — 태그를 푸시해도
   GitHub Release 는 생기지 않는다. 둘은 별개고, 이 단계를 빼먹으면 Releases 페이지가 옛
   버전에 멈춰 있다. 본문 형식은 기존 릴리스를 따른다: `## ✨ Features` / `## 🐞 Bug Fixes` /
   `## 🔧 Changes` 섹션, 항목 끝에 커밋 해시를 `` (`abc1234`) `` 로 붙이고, 마지막 줄에
   `**Full Changelog**: .../compare/v<이전>...v<이번>` 링크를 단다.
8. 내 환경 반영: `claude plugin marketplace update festatusline` →
   `claude plugin update festatusline@festatusline -y` → `~/.claude/settings.json` 의
   `statusLine` 을 새 캐시 경로로 교체. 적용은 Claude Code 재시작 후.

플러그인 설치·업데이트는 Release 가 아니라 **`main` 브랜치의 `dist/` 와 마켓플레이스 JSON 버전**을
보므로, Release 는 사람이 변경 내역을 읽는 용도다. 빠뜨려도 `/plugin update` 는 동작한다.

## 위젯 ID 목록

| id | 설명 |
|---|---|
| `model` | 현재 Claude 모델명 + 세션 플래그(effort / `fast` / `no-think`) |
| `context` | 컨텍스트 사용률 바 + % |
| `sessionRateLimit` | 현재 세션(약 5시간 롤링) 한도 바 |
| `weeklyRateLimit` | Claude 7일 전체 할당량 바 (`all`) |
| `dailyUsage` | 오늘 총 토큰 수 |
| `dailyReset` | 일간 리셋까지 남은 시간 |
| `weeklyUsage` | 최근 7일 총 토큰 수 |
| `weeklyReset` | 주간 리셋까지 남은 시간 |
| `sonnetWeeklyUsage` | 최근 7일 Sonnet 모델 토큰 수 |
| `sonnetWeeklyReset` | Sonnet 주간 리셋까지 남은 시간 |
| `fableWeeklyUsage` | 최근 7일 Fable 모델 토큰 수 |
| `fableWeeklyReset` | Fable 주간 리셋까지 남은 시간 |
| `fableWeeklyRateLimit` | Fable 전용 주간 한도 바 (OAuth 조회, `/usage` 와 동일 값). 데이터 없으면 숨김 |
| `modelMix` | 주간 사용량의 모델 계열별 비중 (`/usage` 동일 가중치) |
| `gptUsage` | 오늘 Codex CLI 요청 수 |
| `codexWeeklyRateLimit` | Codex 7일 한도 바 |
| `codexModel` | Codex/GPT 행 고정 라벨 ("Codex") |
| `sessionCost` | 현재 세션 비용 |
| `cacheHit` | 프롬프트 캐시 적중률 |
| `cacheTtl` | 캐시 TTL 잔여 시간 |
| `gitBranch` | 현재 Git 브랜치명 |
| `gitRepo` | 현재 Git 레포명 (`workspace.repo` 우선, 없으면 git 폴백) |
| `pr` | 현재 브랜치의 열린 PR / GitLab MR |
| `fastMode` | 패스트 모드 표시 (켜져 있을 때만) |
| `linesChanged` | 세션 내 추가/삭제 줄 수 |
| `spacer` | 빈 공백 구분자 |

## 코딩 컨벤션

[Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) 를 기준으로 한다. TypeScript 코드에도 동일하게 적용.

### 변수 선언

- `const` 우선, 재할당이 필요한 경우에만 `let`. `var` 사용 금지.
- 한 선언문에 변수 하나씩.

### 참조 / 객체 / 배열

- 객체/배열은 리터럴 문법으로 생성 (`new Object()`, `new Array()` 금지).
- 객체 프로퍼티 접근은 가능하면 구조분해 할당 사용.
- 배열 복사는 스프레드(`[...arr]`) 사용.

### 함수

- 익명 함수 자리에는 화살표 함수 사용.
- 함수 바디가 표현식 하나면 중괄호 생략 가능.
- 기본 매개변수는 마지막에 위치.
- 가변 인자는 `arguments` 대신 rest 파라미터(`...args`) 사용.

### 클래스 / 모듈

- 클래스 메서드에서 `this` 를 사용하지 않으면 `static` 으로 선언.
- `import` / `export` 사용. `require()` 금지 (ESM 프로젝트).
- 와일드카드 import (`import * as`) 금지.
- `export default` 보다 named export 선호.

### 문자열 / 비교

- 문자열은 작은따옴표(`'`) 사용. 보간이 필요할 때만 템플릿 리터럴.
- 동등 비교는 `===` / `!==` 만 사용.

### 포맷

- 들여쓰기: 스페이스 2칸.
- 세미콜론 필수.
- 한 줄 최대 100자.
- 객체/배열 마지막 요소에 trailing comma 허용.

### TypeScript 추가 규칙

- `any` 사용 금지. 불가피하면 `unknown` + 타입 가드.
- 타입은 `interface` 보다 `type` alias 선호 (단, 확장이 필요한 경우 `interface`).
- `!` non-null assertion 최소화 — 대신 타입 가드나 optional chaining 사용.
- `as` 타입 단언은 외부 데이터 경계(zod 파싱 이후)에서만 사용.

## 커밋 컨벤션

[Udacity Git Commit Style Guide](https://udacity.github.io/git-styleguide/) 준수. **영어로 작성.**

```
type: Subject

body (optional)

footer (optional)
```

- **type**: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
- **Subject**: 대문자 시작, 마침표 없음, 명령형, 100자 이내
- **body**: 72자/줄, what & why 설명 (선택)
- **footer**: 이슈 참조 (선택) — `Resolves: #123`

```
# 좋은 예
feat: Add Sonnet weekly usage widget
fix: Prevent crash when .codex dir is missing
refactor: Extract token formatter into shared util
```

## CHANGELOG

`CHANGELOG.md` 를 유지한다. [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 형식,
**영어로 작성**.

- 사용자가 체감하는 변경(위젯 추가/제거, 출력 형식 변경, 버그 수정, 동작 변경)은 커밋과 함께
  기록한다. 내부 리팩터링만이라면 생략해도 된다.
- 작업은 `## [Unreleased]` 에 쌓고, 릴리스 시점에 `## [x.y.z] - YYYY-MM-DD` 로 확정한다.
- 섹션은 `Added` / `Changed` / `Fixed` / `Removed` 순. 관측된 사실이나 조사 결과를 남길 곳이
  없으면 `Notes` 를 쓴다.
- **왜 그렇게 했는지**를 한 줄이라도 남긴다. 증상만 적으면 다음 사람이 같은 조사를 반복한다.
- `0.2.3` ~ `0.3.4` 항목은 태그와 커밋 메시지로 소급 작성한 것이라 당시 작성분보다 얕다.
  `0.2.3` 이전은 태그가 없어 `## Earlier` 에 개요만 남겼다. 앞으로는 작업과 동시에 기록한다.

## 주의사항

- Bun API(`Bun.*`) 절대 사용 금지 — Node.js 전용
- 새 위젯 추가 시 `src/widgets/index.ts` 의 `ALL_WIDGETS` 배열에 반드시 등록
- 번역 키 추가 시 `ko.ts` 를 원본으로 두고 `en.ts`, `zh.ts` 에 동일 키 추가
- 위젯/문서/번역 개수가 어긋나기 쉽다. 위젯을 건드리면 `ALL_WIDGETS`, `README.md`,
  `README.ko.md`(섹션 헤더 숫자 포함), `CLAUDE.md` 위젯 표, i18n 3종을 모두 맞춘다.

### stdin 페이로드 취급

- **옵셔널 필드는 전부 `.nullish()`** 로 둔다. Claude Code 는 여러 필드를 "생략"이 아니라
  `null` 로 보낸다 (`context_window.current_usage` 는 첫 API 호출 전과 `/compact` 직후,
  `used_percentage` 는 세션 초반). `.optional()` 하나가 전체 파싱을 터뜨려 상태바를 통째로
  비운다. 2차 방어로 `salvageStdin()` 이 키 단위 폴백 파싱을 한다.
- 페이로드에 **없는** 것을 스키마에 넣지 않는다. `model` 은 `{id, display_name}` 뿐이다.

### OAuth 네트워크 계층 (`src/data/claudeOAuthUsage.ts`)

- 이 모듈 하나만 로컬 파일이 아니라 **네트워크 호출**을 한다. Claude Code 는 모델별
  (Opus/Sonnet/Fable) 주간 한도를 statusline stdin 에 절대 실어주지 않는다 — `/usage` 화면과
  CLI 내부 OAuth 호출에서만 볼 수 있다. 이 사실은 오카(Orca, https://github.com/stablyai/orca)
  소스를 직접 확인해서 검증했다: `claude-fetcher.ts` 가 `~/.claude/.credentials.json` 의
  `claudeAiOauth.accessToken` 을 읽어 `https://api.anthropic.com/api/oauth/usage` 를
  `claude-code/2.1.0` User-Agent + `oauth-2025-04-20` 베타 헤더로 직접 호출하고, `limits[]`
  배열의 `kind === 'weekly_scoped'` + `scope.model.display_name === 'fable'` 항목에서 퍼센트를
  뽑는다. festatusline 도 동일한 방식을 그대로 따른다.
- 같은 응답에 `five_hour`/`seven_day` (계정 전체 세션/주간 한도) 도 같이 들어있다. 이건 stdin
  으로도 오지만, stdin 값은 **"이 세션이 마지막으로 API 를 호출한 시점"의 스냅샷**이다 — 같은
  계정을 여러 기기/터미널에서 동시에 쓰면, 한쪽이 가만히 있는 동안 다른 쪽이 소모한 만큼은
  반영이 안 된다 (Orca 의 `claude-statusline-rate-limits.ts` 주석: "pipes rate_limits ... on
  every turn — piggybacked on Messages API responses" 이 이걸 뒷받침한다). **유휴 중에도 stdin
  은 마지막 스냅샷을 계속 실어 보내므로 "stdin 이 있으면 stdin 우선" 규칙은 유휴 케이스를
  절대 잡지 못한다** — 초기 구현이 그랬고, 리뷰에서 걸렸다.
- 그래서 `render/index.ts` 의 `mergeRateLimits()` 는 소스가 아니라 **스냅샷의 신선도**를
  비교한다(`fresher()`). 두 소스 모두 타임스탬프가 없지만 윈도우가 그 역할을 한다: `resets_at`
  이 같은(±120초, 반올림 오차 관측됨: stdin 1787637000 vs OAuth 1787636999) 윈도우 안에서
  사용률은 단조 증가하므로 **더 높은 % 가 더 최신**, 윈도우가 다르면 **더 늦은 `resets_at` 이
  최신**, 완전 동률이면 stdin. 로컬 `rate_limits.json` 캐시는 과거 stdin 이라 stdin 이 비어
  있을 때만 대신 쓰고 신선도 비교엔 끼지 않는다. Claude Code 가 stdin 을 첫 API 호출 전에
  `{used_percentage: null, resets_at: null}` 껍데기로 보내는 것도 `usablePeriod()` 가 걸러낸다.
- `/api/oauth/usage` 는 **문서화되지 않은 내부 엔드포인트**라 예고 없이 바뀌거나 막힐 수 있다.
  Orca 는 기본 폴링 15분·최소 30초로 이 엔드포인트를 아낀다(코드 주석: "spending the OAuth
  usage endpoint's tight budget... invites 429s"). festatusline 은 렌더마다 새 프로세스가
  뜨는 구조라 인메모리 캐시(`createTtlCache`)는 무의미하고, **디스크 캐시**
  (`~/.cache/festatusline/oauth_usage.json`, TTL 5분)로 렌더 간 호출을 막는다. 실패하면
  `failedAt` 을 남겨 60초 백오프한다 — 이게 없으면 오프라인/프록시 환경에서 캐시가 만료된 뒤
  **매 렌더가 3초 타임아웃에 걸려 멈춘다**. Node `fetch` 는 `HTTPS_PROXY` 를 읽지 않는다.
- 네트워크·파싱 실패 시 절대 위젯을 비우지 않고 마지막으로 성공한 캐시 값을 그대로 돌려준다.
  자격증명 파일이 없거나 토큰이 없으면 세 슬롯 모두 `null` — `fableWeeklyRateLimit` 은 조용히
  사라지고, `sessionRateLimit`/`weeklyRateLimit` 은 stdin/로컬 캐시 폴백으로 그대로 동작한다.
- **macOS 는 Keychain 에서 읽는다** (`src/data/macKeychain.ts`, 0.7.0~). macOS 에는
  `.credentials.json` 이 아예 없고 Claude Code 가 로그인 Keychain 에 같은 JSON 을 넣는다.
  `security find-generic-password -s <서비스> -a $USER -w` 로 읽으며, 서비스명은 Claude Code
  2.1+ 가 `Claude Code-credentials-<sha256(CLAUDE_CONFIG_DIR) 앞 8자리>` 로 스코프하므로
  스코프본 → 무접미사본 순으로 시도한다 (Orca 의 `claude-accounts/keychain.ts` 대조 확인).
  `process.platform !== 'darwin'` 이면 즉시 `null` 이라 다른 OS 동작은 바이트 단위로 동일하다.
  **이 코드는 Linux 에서 검증 불가하다** — 서비스명 파생과 폴백 순서는 유닛 테스트로 고정했지만,
  실제 Keychain 접근은 macOS 에서만 확인된다. 최초 1회 접근 권한 프롬프트가 뜰 수 있고, 거부/타임아웃
  /항목 없음이 전부 `null` 로 수렴해 stdin 폴백으로 이어진다. `security` 는 3초 타임아웃.
- 토큰은 `readAccessToken()` → `fetch` Authorization 헤더 두 지점에만 닿는다. 캐시 파일엔
  퍼센트/리셋 시각만 기록한다(테스트로 고정). `refreshToken` 은 스키마에서 읽지도 않는다.
  `redirect: 'error'` 로 리다이렉트 시 토큰이 다른 호스트로 따라가는 것을 막는다.

### effort / ultracode

- effort 라벨은 `stdin.effort.level` → `CLAUDE_EFFORT` 환경변수 순으로 읽는다. 두 값은 Claude
  Code 가 같은 값에서 만들어 항상 일치하므로, 환경변수는 페이로드 파싱 실패용 백스톱이다.
- **`~/.claude/settings.json` 의 `effortLevel` 은 읽지 않는다.** 세션 중 `/effort` 변경과
  모델별 `modelSettings` 오버라이드를 반영하지 못해 실제와 다른 레벨을 표시한다.
- **ultracode 는 탐지 불가.** Claude Code 가 페이로드·`CLAUDE_EFFORT`·transcript 의 `effort`
  필드 전부에서 `xhigh` 로 보고한다(`/effort` 파서가 입력 시점에 `xhigh` 로 치환). 설정 파일에
  `ultracode: true` 를 박은 세션만 구분된다. 다시 조사하지 말 것.
