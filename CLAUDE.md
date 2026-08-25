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
├── widgets/               # 위젯 23종 + 레지스트리
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

## 배포

npm 에 발행하지 않는다. 배포 경로는 GitHub 플러그인 마켓플레이스이므로 **`dist/` 를 커밋해야
한다** (`.gitignore` 는 `dist/*.map` 만 제외). 버전은 세 파일 네 곳을 함께 올린다.

| 파일 | 위치 |
|---|---|
| `package.json` | `version` |
| `.claude-plugin/plugin.json` | `version` |
| `.claude-plugin/marketplace.json` | `metadata.version` + top-level `version` |

버전을 올리지 않으면 사용자 쪽 `/plugin update` 가 "already at the latest version" 을 반환한다
— 플러그인 캐시가 `~/.claude/plugins/cache/festatusline/festatusline/<version>/` 로 버전별
디렉터리를 쓰기 때문이다.

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

### effort / ultracode

- effort 라벨은 `stdin.effort.level` → `CLAUDE_EFFORT` 환경변수 순으로 읽는다. 두 값은 Claude
  Code 가 같은 값에서 만들어 항상 일치하므로, 환경변수는 페이로드 파싱 실패용 백스톱이다.
- **`~/.claude/settings.json` 의 `effortLevel` 은 읽지 않는다.** 세션 중 `/effort` 변경과
  모델별 `modelSettings` 오버라이드를 반영하지 못해 실제와 다른 레벨을 표시한다.
- **ultracode 는 탐지 불가.** Claude Code 가 페이로드·`CLAUDE_EFFORT`·transcript 의 `effort`
  필드 전부에서 `xhigh` 로 보고한다(`/effort` 파서가 입력 시점에 `xhigh` 로 치환). 설정 파일에
  `ultracode: true` 를 박은 세션만 구분된다. 다시 조사하지 말 것.
