# cwstatusline

Claude Code 용 상태바(statusline) 도구. [ccstatusline](https://github.com/sirmalloc/ccstatusline) 을 참고한 차별화 파생 버전.

## 차별 포인트

- **다국어(ko/en/zh)** 지원 — `FESTATUSLINE_LOCALE` 환경변수 또는 `$LANG` 자동 감지
- **테마 5종** 내장: default, dracula, nord, gruvbox, tokyo-night
- **한국 개발자 친화 위젯**: 일간/주간/Sonnet 주간 사용량 + 초기화 타이머, 피크 시간대
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
│   ├── peak-time.ts       # hourly bucket → 피크 시간대 계산
│   ├── reset.ts           # 일간/주간 리셋 카운트다운
│   └── codex.ts           # ~/.codex 파싱 → GPT 사용량
├── widgets/               # 위젯 10종 + 레지스트리
├── render/                # 위젯 배열 → stdout 한 줄 문자열
├── i18n/                  # ko/en/zh 번들 + t() 헬퍼
├── config/                # zod 스키마, load/save, 프리셋, install/doctor
├── theme/                 # 테마 5종 팔레트
└── tui/                   # Ink 기반 대화형 설정 화면
```

## 설정 파일

- 설정: `~/.config/festatusline/settings.json`
- Claude 통합: `~/.claude/settings.json` 의 `statusLine` 필드

## 위젯 ID 목록

| id | 설명 |
|---|---|
| `model` | 현재 모델명 |
| `context` | 컨텍스트 사용률 바 + % |
| `peakTime` | 최근 14일 피크 시간대 |
| `dailyUsage` | 오늘 총 토큰 수 |
| `dailyReset` | 일간 리셋까지 남은 시간 |
| `weeklyUsage` | 최근 7일 총 토큰 수 |
| `weeklyReset` | 주간 리셋까지 남은 시간 |
| `sonnetWeeklyUsage` | 최근 7일 Sonnet 모델 토큰 수 |
| `sonnetWeeklyReset` | Sonnet 주간 리셋까지 남은 시간 |
| `gptUsage` | 오늘 Codex CLI 요청 수 |

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
- **Subject**: 대문자 시작, 마침표 없음, 명령형, 50자 이내
- **body**: 72자/줄, what & why 설명 (선택)
- **footer**: 이슈 참조 (선택) — `Resolves: #123`

```
# 좋은 예
feat: Add Sonnet weekly usage widget
fix: Prevent crash when .codex dir is missing
refactor: Extract token formatter into shared util
```

## 주의사항

- Bun API(`Bun.*`) 절대 사용 금지 — Node.js 전용
- 새 위젯 추가 시 `src/widgets/index.ts` 의 `ALL_WIDGETS` 배열에 반드시 등록
- 번역 키 추가 시 `ko.ts` 를 원본으로 두고 `en.ts`, `zh.ts` 에 동일 키 추가
